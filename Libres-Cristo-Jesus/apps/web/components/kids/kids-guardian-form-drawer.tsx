'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
} from '@lcj/ui';
import { useAddKidsGuardian } from '@/hooks/use-kids-children';
import { ApiError } from '@/lib/http-client';

/**
 * Vincula un acudiente NUEVO al niño. El modo "vincular uno existente"
 * (`guardianId`) que soporta la API no tiene una pantalla propia todavía: no
 * existe un `GET /kids/guardians` para buscarlos, así que el único flujo
 * que un usuario puede completar hoy es crear uno.
 */

const guardianSchema = z.object({
  firstName: z.string().trim().min(1, 'Los nombres son obligatorios.'),
  lastName: z.string().trim().min(1, 'Los apellidos son obligatorios.'),
  relationship: z.string().trim().min(1, 'El parentesco es obligatorio.'),
  phone: z.string().trim().min(1, 'El teléfono es obligatorio.'),
  altPhone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Ingrese un correo válido.',
    }),
  isPrimary: z.boolean(),
});

type GuardianFormValues = z.input<typeof guardianSchema>;

export interface KidsGuardianFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
}

export function KidsGuardianFormDrawer({
  open,
  onOpenChange,
  childId,
}: KidsGuardianFormDrawerProps) {
  const mutation = useAddKidsGuardian();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      relationship: '',
      phone: '',
      altPhone: '',
      email: '',
      isPrimary: false,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      firstName: '',
      lastName: '',
      relationship: '',
      phone: '',
      altPhone: '',
      email: '',
      isPrimary: false,
    });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'No fue posible vincular al acudiente. Intente nuevamente.'
        : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>Nuevo acudiente</DrawerTitle>
          <DrawerDescription>Vincula un adulto responsable a este niño.</DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            await mutation.mutateAsync({
              childId,
              input: {
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                relationship: values.relationship.trim(),
                phone: values.phone.trim(),
                altPhone: values.altPhone?.trim() || undefined,
                email: values.email?.trim() || undefined,
                isPrimary: values.isPrimary,
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
              label="Parentesco"
              required
              placeholder="madre, padre, abuela…"
              error={errors.relationship?.message}
              {...register('relationship')}
            />
            <Input
              label="Teléfono"
              required
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input label="Teléfono alterno" error={errors.altPhone?.message} {...register('altPhone')} />
            <Input label="Correo" error={errors.email?.message} {...register('email')} />

            <Controller
              control={control}
              name="isPrimary"
              render={({ field }) => (
                <Checkbox
                  label="Marcar como acudiente principal"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true);
                  }}
                />
              )}
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
              Vincular
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
