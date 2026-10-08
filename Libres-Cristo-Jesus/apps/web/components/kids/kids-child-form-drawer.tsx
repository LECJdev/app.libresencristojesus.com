'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  Textarea,
} from '@lcj/ui';
import type { KidsChildDetail } from '@lcj/types';
import { FileUpload } from '@/components/common/file-upload/file-upload';
import { useCreateKidsChild, useUpdateKidsChild } from '@/hooks/use-kids-children';
import { ApiError } from '@/lib/http-client';

/** Create/edit form for a `KidsChild`. Creating also opens its `KidsConsent` in `PENDING_AUTHORIZATION` (backend side). */

const kidsChildSchema = z.object({
  firstName: z.string().trim().min(1, 'Los nombres son obligatorios.'),
  lastName: z.string().trim().min(1, 'Los apellidos son obligatorios.'),
  birthDate: z.string().min(1, 'La fecha de nacimiento es obligatoria.'),
  photo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type KidsChildFormValues = z.input<typeof kidsChildSchema>;

export interface KidsChildFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  child?: KidsChildDetail;
}

export function KidsChildFormDrawer({
  open,
  onOpenChange,
  schoolId,
  child,
}: KidsChildFormDrawerProps) {
  const isEditing = child !== undefined;
  const createMutation = useCreateKidsChild();
  const updateMutation = useUpdateKidsChild();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<KidsChildFormValues>({
    resolver: zodResolver(kidsChildSchema),
    defaultValues: { firstName: '', lastName: '', birthDate: '', photo: '', notes: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      firstName: child?.firstName ?? '',
      lastName: child?.lastName ?? '',
      birthDate: child?.birthDate ? child.birthDate.slice(0, 10) : '',
      photo: child?.photo ?? '',
      notes: child?.notes ?? '',
    });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, child, reset]);

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'No fue posible guardar el niño. Intente nuevamente.'
        : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar niño' : 'Registrar niño'}</DrawerTitle>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            const payload = {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              birthDate: values.birthDate,
              photo: values.photo?.trim() || undefined,
              notes: values.notes?.trim() || undefined,
            };

            if (isEditing) {
              await updateMutation.mutateAsync({
                id: child.id,
                input: { ...payload, version: child.version },
              });
            } else {
              await createMutation.mutateAsync({ schoolId, input: payload });
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

            <Controller
              control={control}
              name="photo"
              render={({ field }) => (
                <FileUpload
                  category="kids-child-photo"
                  label="Foto"
                  shape="circle"
                  value={field.value ?? null}
                  onChange={(path) => {
                    field.onChange(path ?? '');
                  }}
                />
              )}
            />

            <Input
              label="Nombres"
              required
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Apellidos"
              required
              error={errors.lastName?.message}
              {...register('lastName')}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              required
              error={errors.birthDate?.message}
              {...register('birthDate')}
            />
            <Textarea label="Notas" error={errors.notes?.message} {...register('notes')} />
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
              {isEditing ? 'Guardar cambios' : 'Registrar niño'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
