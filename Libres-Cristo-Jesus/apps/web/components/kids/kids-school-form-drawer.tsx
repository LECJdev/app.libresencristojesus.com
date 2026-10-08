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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
} from '@lcj/ui';
import type { KidsSchool } from '@lcj/types';
import { useCreateKidsSchool, useUpdateKidsSchool } from '@/hooks/use-kids-schools';
import { ApiError } from '@/lib/http-client';

/** Create/edit form for a `KidsSchool` — ADMIN only (`kids-school:create`/`update`). */

const kidsSchoolSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
});

type KidsSchoolFormValues = z.input<typeof kidsSchoolSchema>;

export interface KidsSchoolFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: KidsSchool;
}

export function KidsSchoolFormDrawer({ open, onOpenChange, school }: KidsSchoolFormDrawerProps) {
  const isEditing = school !== undefined;
  const createMutation = useCreateKidsSchool();
  const updateMutation = useUpdateKidsSchool();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KidsSchoolFormValues>({
    resolver: zodResolver(kidsSchoolSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({ name: school?.name ?? '' });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, school, reset]);

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'No fue posible guardar la sede. Intente nuevamente.'
        : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar sede' : 'Nueva sede de Escuela Kids'}</DrawerTitle>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            const name = values.name.trim();

            if (isEditing) {
              await updateMutation.mutateAsync({
                id: school.id,
                input: { name, version: school.version },
              });
            } else {
              await createMutation.mutateAsync({ name });
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
              label="Nombre"
              required
              placeholder="Escuela Kids Norte"
              error={errors.name?.message}
              {...register('name')}
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
              {isEditing ? 'Guardar cambios' : 'Crear sede'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
