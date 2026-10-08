'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
} from '@lcj/ui';
import { RoleName, type District, type PeaceHouse } from '@lcj/types';
import { useCreatePeaceHouse, useUpdatePeaceHouse } from '@/hooks/use-peace-houses';
import { useDepartments, useMunicipalities } from '@/hooks/use-geography';
import { leadershipUnitLabel, useLeadershipUnitsByRole } from '@/hooks/use-leadership-units';
import { ApiError } from '@/lib/http-client';

/**
 * Create/edit form for a Casa de Paz (doc07 US-007).
 *
 * The department and municipality selectors are CHAINED and fed
 * exclusively from `CatDepartment`/`CatMunicipality` — never a hard-coded
 * list. Picking a department clears the municipality, because keeping a
 * municipality from the previous department is precisely the incoherent
 * pair the backend rejects, and it is friendlier to clear it than to let
 * the user submit and be told no.
 */

const NONE = '__none__';

/** doc04/doc07 never enumerate weekdays; the list is fixed here because a
 * meeting day is a closed real-world set, not a catalog the church edits. */
const MEETING_DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

const peaceHouseSchema = z
  .object({
    districtId: z.string().min(1, 'Seleccione el distrito.'),
    leadershipUnitId: z.string().min(1, 'Seleccione la pareja líder.'),
    name: z.string().trim().min(1, 'El nombre es obligatorio.'),
    code: z.string().trim().optional(),
    departmentId: z.string().optional(),
    municipalityId: z.string().optional(),
    neighborhood: z.string().trim().optional(),
    address: z.string().trim().optional(),
    latitude: z.string().trim().optional(),
    longitude: z.string().trim().optional(),
    meetingDay: z.string().optional(),
    meetingHour: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
        message: 'Use el formato de 24 horas, por ejemplo 19:00.',
      }),
  })
  // Mirrors the server rule so the user is told before submitting rather
  // than after a 400 (`assertLocationIsCoherent` remains the authority).
  .refine(
    (values) =>
      !values.municipalityId ||
      values.municipalityId === NONE ||
      (values.departmentId !== undefined && values.departmentId !== NONE),
    { path: ['departmentId'], message: 'Seleccione el departamento antes que el municipio.' },
  );

type PeaceHouseFormValues = z.input<typeof peaceHouseSchema>;

export interface PeaceHouseFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  districts: District[];
  peaceHouse?: PeaceHouse;
}

/** Empty string when absent — a controlled input must never receive null. */
function optionalText(value: string | null | undefined): string {
  return value ?? '';
}

function optionalNumberText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function PeaceHouseFormDrawer({
  open,
  onOpenChange,
  districts,
  peaceHouse,
}: PeaceHouseFormDrawerProps) {
  const isEditing = peaceHouse !== undefined;
  const createMutation = useCreatePeaceHouse();
  const updateMutation = useUpdatePeaceHouse();
  const mutation = isEditing ? updateMutation : createMutation;

  const { data: departments, isPending: isLoadingDepartments } = useDepartments();
  const { data: leaders, isPending: isLoadingLeaders } = useLeadershipUnitsByRole(RoleName.LEADER);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PeaceHouseFormValues>({
    resolver: zodResolver(peaceHouseSchema),
    defaultValues: {
      districtId: '',
      leadershipUnitId: '',
      name: '',
      code: '',
      departmentId: NONE,
      municipalityId: NONE,
      neighborhood: '',
      address: '',
      latitude: '',
      longitude: '',
      meetingDay: NONE,
      meetingHour: '',
    },
  });

  const departmentId = useWatch({ control, name: 'departmentId' });
  const { data: municipalities, isPending: isLoadingMunicipalities } = useMunicipalities(
    departmentId && departmentId !== NONE ? departmentId : undefined,
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      districtId: peaceHouse?.districtId ?? '',
      leadershipUnitId: peaceHouse?.leadershipUnitId ?? '',
      name: peaceHouse?.name ?? '',
      code: optionalText(peaceHouse?.code),
      departmentId: peaceHouse?.departmentId ?? NONE,
      municipalityId: peaceHouse?.municipalityId ?? NONE,
      neighborhood: optionalText(peaceHouse?.neighborhood),
      address: optionalText(peaceHouse?.address),
      latitude: optionalNumberText(peaceHouse?.latitude),
      longitude: optionalNumberText(peaceHouse?.longitude),
      meetingDay: peaceHouse?.meetingDay ?? NONE,
      meetingHour: optionalText(peaceHouse?.meetingHour),
    });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, peaceHouse, reset]);

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'No fue posible guardar la Casa de Paz. Intente nuevamente.'
        : null;

  /** `NONE`/empty become `undefined` so the API sees "not provided". */
  const clean = (value: string | undefined): string | undefined =>
    !value || value === NONE ? undefined : value;

  const cleanNumber = (value: string | undefined): number | undefined => {
    const text = value?.trim();
    if (!text) {
      return undefined;
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar Casa de Paz' : 'Nueva Casa de Paz'}</DrawerTitle>
          <DrawerDescription>
            Los departamentos y municipios provienen del catálogo oficial cargado en el sistema.
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            const payload = {
              districtId: values.districtId,
              leadershipUnitId: values.leadershipUnitId,
              name: values.name.trim(),
              code: clean(values.code?.trim()),
              departmentId: clean(values.departmentId),
              municipalityId: clean(values.municipalityId),
              neighborhood: clean(values.neighborhood?.trim()),
              address: clean(values.address?.trim()),
              latitude: cleanNumber(values.latitude),
              longitude: cleanNumber(values.longitude),
              meetingDay: clean(values.meetingDay),
              meetingHour: clean(values.meetingHour?.trim()),
            };

            if (isEditing) {
              await updateMutation.mutateAsync({
                id: peaceHouse.id,
                input: { ...payload, version: peaceHouse.version },
              });
            } else {
              await createMutation.mutateAsync(payload);
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
              placeholder="Casa de Paz Esperanza"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Código"
              placeholder="CP-09-004"
              helperText="Opcional, pero único en todo el sistema."
              error={errors.code?.message}
              {...register('code')}
            />

            <Controller
              control={control}
              name="districtId"
              render={({ field }) => (
                <Select
                  label="Distrito"
                  required
                  placeholder="Seleccione el distrito"
                  options={districts.map((district) => ({
                    value: district.id,
                    label: `${district.number} · ${district.name}`,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  error={errors.districtId?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="leadershipUnitId"
              render={({ field }) => (
                <Select
                  label="Pareja líder"
                  required
                  placeholder="Seleccione la pareja líder"
                  options={(leaders ?? []).map((unit) => ({
                    value: unit.id,
                    label: leadershipUnitLabel(unit),
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingLeaders}
                  helperText="Una unidad de liderazgo sólo puede dirigir una Casa de Paz."
                  error={errors.leadershipUnitId?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <Select
                  label="Departamento"
                  options={[
                    { value: NONE, label: 'Sin asignar' },
                    ...(departments ?? []).map((department) => ({
                      value: department.id,
                      label: department.name,
                    })),
                  ]}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Clearing the municipality is the whole point of the
                    // chain: keeping the previous one would build exactly
                    // the mismatched pair the server rejects.
                    setValue('municipalityId', NONE);
                  }}
                  disabled={isLoadingDepartments}
                  error={errors.departmentId?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="municipalityId"
              render={({ field }) => (
                <Select
                  label="Municipio"
                  options={[
                    { value: NONE, label: 'Sin asignar' },
                    ...(municipalities ?? []).map((municipality) => ({
                      value: municipality.id,
                      label: municipality.name,
                    })),
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!departmentId || departmentId === NONE || isLoadingMunicipalities}
                  helperText={
                    !departmentId || departmentId === NONE
                      ? 'Seleccione primero un departamento.'
                      : undefined
                  }
                  error={errors.municipalityId?.message}
                />
              )}
            />

            <Input
              label="Barrio"
              error={errors.neighborhood?.message}
              {...register('neighborhood')}
            />
            <Input label="Dirección" error={errors.address?.message} {...register('address')} />

            <div className="grid gap-4 tablet:grid-cols-2">
              <Input
                label="Latitud"
                placeholder="6.244203"
                helperText="Opcional."
                error={errors.latitude?.message}
                {...register('latitude')}
              />
              <Input
                label="Longitud"
                placeholder="-75.581215"
                helperText="Opcional."
                error={errors.longitude?.message}
                {...register('longitude')}
              />
            </div>

            <div className="grid gap-4 tablet:grid-cols-2">
              <Controller
                control={control}
                name="meetingDay"
                render={({ field }) => (
                  <Select
                    label="Día de reunión"
                    options={[
                      { value: NONE, label: 'Sin definir' },
                      ...MEETING_DAYS.map((day) => ({ value: day, label: day })),
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                    error={errors.meetingDay?.message}
                  />
                )}
              />
              <Input
                label="Hora"
                placeholder="19:00"
                helperText="Formato 24 horas."
                error={errors.meetingHour?.message}
                {...register('meetingHour')}
              />
            </div>
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
              {isEditing ? 'Guardar cambios' : 'Crear Casa de Paz'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
