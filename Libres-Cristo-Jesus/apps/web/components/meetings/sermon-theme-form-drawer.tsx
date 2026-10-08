'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Textarea,
} from '@lcj/ui';
import type { SermonTheme } from '@lcj/types';
import { useCreateSermonTheme, useUpdateSermonTheme } from '@/hooks/use-sermon-themes';
import { resolveApiErrorMessage } from '@/lib/api-error-message';

/**
 * Create/edit form for a sermon theme (doc04 §6).
 *
 * ONE form for both the catalog screen and the "nuevo tema" shortcut on the
 * meeting screen. A leader preparing the teaching must be able to add the
 * theme the moment they need it — sending them to another module first is
 * how a catalog stops being used.
 *
 * `series` is free text on purpose: series are invented as the teaching
 * plan advances, and a closed list would be out of date the week after it
 * was defined. `onCreated` lets the caller select what was just created.
 */

const sermonThemeSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  series: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

type SermonThemeFormValues = z.input<typeof sermonThemeSchema>;

export interface SermonThemeFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to register a new theme. */
  theme?: SermonTheme;
  /** Fires with the created theme, so the caller can preselect it. */
  onCreated?: (theme: SermonTheme) => void;
}

export function SermonThemeFormDrawer({
  open,
  onOpenChange,
  theme,
  onCreated,
}: SermonThemeFormDrawerProps) {
  const isEditing = theme !== undefined;
  const createMutation = useCreateSermonTheme();
  const updateMutation = useUpdateSermonTheme();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SermonThemeFormValues>({
    resolver: zodResolver(sermonThemeSchema),
    defaultValues: { title: '', series: '', description: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      title: theme?.title ?? '',
      series: theme?.series ?? '',
      description: theme?.description ?? '',
    });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, theme, reset]);

  const errorMessage = resolveApiErrorMessage(mutation.error, 'No fue posible guardar el tema.');

  const clean = (value: string | undefined): string | undefined => value?.trim() || undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar tema' : 'Nuevo tema'}</DrawerTitle>
          <DrawerDescription>
            El catálogo es compartido por todas las Casas de Paz.
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            const payload = {
              title: values.title.trim(),
              series: clean(values.series),
              description: clean(values.description),
            };

            if (isEditing) {
              await updateMutation.mutateAsync({
                id: theme.id,
                input: { ...payload, version: theme.version },
              });
            } else {
              const created = await createMutation.mutateAsync(payload);
              onCreated?.(created);
            }

            onOpenChange(false);
          })}
        >
          <DrawerBody className="flex flex-col gap-4">
            {errorMessage ? (
              <p
                role="alert"
                className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
              >
                {errorMessage}
              </p>
            ) : null}

            <Input
              label="Título"
              required
              placeholder="La autoridad de la fe"
              helperText="Único en el catálogo."
              error={errors.title?.message}
              {...register('title')}
            />

            <Input
              label="Serie"
              placeholder="Fundamentos"
              helperText="Opcional. Agrupa varios temas bajo una misma enseñanza."
              error={errors.series?.message}
              {...register('series')}
            />

            <Textarea
              label="Descripción"
              rows={4}
              helperText="Pasaje base, idea central o notas de preparación."
              error={errors.description?.message}
              {...register('description')}
            />
          </DrawerBody>

          <DrawerFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEditing ? 'Guardar cambios' : 'Registrar tema'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
