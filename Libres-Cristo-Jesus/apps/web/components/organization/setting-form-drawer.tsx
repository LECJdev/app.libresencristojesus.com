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
import type { Setting } from '@lcj/types';
import { useUpsertSetting } from '@/hooks/use-church';
import { resolveApiErrorMessage } from '@/lib/api-error-message';

/**
 * Create/edit a system parameter (doc04 "Mejoras" §3).
 *
 * The key is immutable once created: a key IS the identity other code
 * reads (`church.timezone`), so "renaming" one would silently orphan every
 * reader while leaving the old row behind. Deleting and recreating is the
 * honest way to change it, and that is what the list already offers.
 */

/** Mirrors `SettingKeyParamDto` on the server — same rule, stated once per side. */
const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

const settingSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'La clave es obligatoria.')
    .regex(KEY_PATTERN, 'Use minúsculas separadas por puntos, por ejemplo "church.timezone".'),
  value: z.string().trim().min(1, 'El valor es obligatorio.'),
  description: z.string().trim().optional(),
});

type SettingFormValues = z.input<typeof settingSchema>;

export interface SettingFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing parameter. */
  setting?: Setting;
}

export function SettingFormDrawer({ open, onOpenChange, setting }: SettingFormDrawerProps) {
  const isEditing = setting !== undefined;
  const mutation = useUpsertSetting();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingFormValues>({
    resolver: zodResolver(settingSchema),
    defaultValues: { key: '', value: '', description: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      key: setting?.key ?? '',
      value: setting?.value ?? '',
      description: setting?.description ?? '',
    });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setting, reset]);

  const errorMessage = resolveApiErrorMessage(
    mutation.error,
    'No fue posible guardar el parámetro.',
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar parámetro' : 'Nuevo parámetro'}</DrawerTitle>
          <DrawerDescription>
            Los parámetros se guardan en base de datos para poder cambiarlos sin desplegar código.
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            await mutation.mutateAsync({
              key: values.key.trim(),
              input: {
                value: values.value.trim(),
                description: values.description?.trim() || undefined,
              },
            });
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
              label="Clave"
              required
              readOnly={isEditing}
              placeholder="church.timezone"
              helperText={
                isEditing
                  ? 'La clave no se puede cambiar: otras partes del sistema la leen por su nombre.'
                  : 'Minúsculas separadas por puntos.'
              }
              error={errors.key?.message}
              {...register('key')}
            />

            <Input
              label="Valor"
              required
              placeholder="America/Bogota"
              error={errors.value?.message}
              {...register('value')}
            />

            <Textarea
              label="Descripción"
              rows={2}
              helperText="Explique qué controla este parámetro."
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
              {isEditing ? 'Guardar cambios' : 'Crear parámetro'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
