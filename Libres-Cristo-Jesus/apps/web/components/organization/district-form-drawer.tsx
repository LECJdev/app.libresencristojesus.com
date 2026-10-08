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
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Select,
  Textarea,
} from '@lcj/ui';
import { RoleName, type District } from '@lcj/types';
import { useCreateDistrict, useUpdateDistrict } from '@/hooks/use-districts';
import { leadershipUnitLabel, useLeadershipUnitsByRole } from '@/hooks/use-leadership-units';
import { ApiError } from '@/lib/http-client';

/**
 * Create/edit form for a District (doc06, doc07 US-005).
 *
 * A Drawer, not a Modal: doc18 §17/§18 sends every large form to the
 * drawer, and this one carries five fields plus a leadership selector.
 *
 * One component serves both create and edit — the only differences are the
 * title, whether `version` travels, and the mutation called. Splitting them
 * would duplicate the entire field list and the validation schema, which is
 * exactly the drift that makes "create accepts X but edit rejects it" bugs.
 */

const NO_LEADERSHIP = '__none__';

const districtSchema = z.object({
  number: z.coerce
    .number({ message: 'El número es obligatorio.' })
    .int('El número debe ser entero.')
    .min(1, 'El número debe ser mayor que cero.'),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  description: z.string().trim().optional(),
  leadershipUnitId: z.string().optional(),
});

type DistrictFormValues = z.input<typeof districtSchema>;

export interface DistrictFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The Church every district hangs from (doc06: a single Iglesia). */
  churchId: string;
  /** Present when editing; absent when creating. */
  district?: District;
}

export function DistrictFormDrawer({
  open,
  onOpenChange,
  churchId,
  district,
}: DistrictFormDrawerProps) {
  const isEditing = district !== undefined;
  const createMutation = useCreateDistrict();
  const updateMutation = useUpdateDistrict();
  const { data: pastors, isPending: isLoadingPastors } = useLeadershipUnitsByRole(
    RoleName.DISTRICT_PASTOR,
  );

  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DistrictFormValues>({
    resolver: zodResolver(districtSchema),
    defaultValues: { number: 1, name: '', description: '', leadershipUnitId: NO_LEADERSHIP },
  });

  // Refills the form whenever the drawer opens on a different record. Without
  // this the drawer would keep the previous district's values, and an edit
  // could silently overwrite one row with another's data.
  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      number: district?.number ?? 1,
      name: district?.name ?? '',
      description: district?.description ?? '',
      leadershipUnitId: district?.leadershipUnitId ?? NO_LEADERSHIP,
    });
    mutation.reset();
    // `mutation` is intentionally excluded: it is a new object on every
    // render, and depending on it would reset the form on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, district, reset]);

  const options = [
    { value: NO_LEADERSHIP, label: 'Sin asignar' },
    ...(pastors ?? []).map((unit) => ({ value: unit.id, label: leadershipUnitLabel(unit) })),
  ];

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'No fue posible guardar el distrito. Intente nuevamente.'
        : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar distrito' : 'Nuevo distrito'}</DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? 'Modifique los datos del distrito. El número debe ser único dentro de la iglesia.'
              : 'Registre un nuevo distrito. Podrá asignarle su pareja pastoral ahora o más adelante.'}
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            const leadershipUnitId =
              values.leadershipUnitId === NO_LEADERSHIP ? undefined : values.leadershipUnitId;
            const description = values.description?.trim() ? values.description.trim() : undefined;

            if (isEditing) {
              await updateMutation.mutateAsync({
                id: district.id,
                input: {
                  number: Number(values.number),
                  name: values.name.trim(),
                  description,
                  leadershipUnitId,
                  // Optimistic locking (doc04 §14): the server rejects with
                  // 409 if someone else edited this row meanwhile.
                  version: district.version,
                },
              });
            } else {
              await createMutation.mutateAsync({
                churchId,
                number: Number(values.number),
                name: values.name.trim(),
                description,
                leadershipUnitId,
              });
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
              label="Número"
              type="number"
              min={1}
              required
              error={errors.number?.message}
              {...register('number')}
            />

            <Input
              label="Nombre"
              required
              placeholder="Distrito 09"
              error={errors.name?.message}
              {...register('name')}
            />

            <Textarea
              label="Descripción"
              rows={3}
              helperText="Opcional. Referencia interna del distrito."
              error={errors.description?.message}
              {...register('description')}
            />

            <Controller
              control={control}
              name="leadershipUnitId"
              render={({ field }) => (
                <Select
                  label="Pareja pastoral"
                  options={options}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingPastors}
                  helperText="Solo se listan unidades de liderazgo con rol Pastor Distrito."
                  error={errors.leadershipUnitId?.message}
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
              {isEditing ? 'Guardar cambios' : 'Crear distrito'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
