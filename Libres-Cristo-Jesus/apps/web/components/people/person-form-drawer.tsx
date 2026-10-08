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
  useToast,
} from '@lcj/ui';
import type { PeaceHouse, Person } from '@lcj/types';
import { FileUpload } from '@/components/common/file-upload';
import { useCreatePerson, usePersonStages, useUpdatePerson } from '@/hooks/use-people';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { QueuedOfflineError } from '@/lib/offline/with-offline-fallback';

/**
 * Create/edit form for a Person (doc04 §5).
 *
 * ONLY NAME AND SURNAME ARE REQUIRED — the same rule the API enforces. A
 * first-time visitor is registered at the door, mid-meeting, from a phone;
 * a form that demands a national id before it will save produces no record
 * at all, which is worse than an incomplete one.
 *
 * Changing the Casa de Paz here is a TRANSFER: the API closes the open
 * membership period and opens a new one. That is why the field carries a
 * reason as soon as the person already belongs somewhere.
 */

const NONE = '__none__';

const personSchema = z.object({
  firstName: z.string().trim().min(1, 'Los nombres son obligatorios.'),
  lastName: z.string().trim().min(1, 'Los apellidos son obligatorios.'),
  document: z.string().trim().optional(),
  gender: z.string().optional(),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Ingrese un correo válido.',
    }),
  birthDate: z.string().optional(),
  address: z.string().trim().optional(),
  photo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  personStageId: z.string().optional(),
  peaceHouseId: z.string().optional(),
  transferReason: z.string().trim().optional(),
});

type PersonFormValues = z.input<typeof personSchema>;

const GENDER_OPTIONS = [
  { value: NONE, label: 'Sin especificar' },
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
];

export interface PersonFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peaceHouses: PeaceHouse[];
  person?: Person;
  /**
   * Casa de Paz preselected when REGISTERING (ignored when editing, where
   * the person's current house always wins).
   *
   * Registering someone from the asistencia screen must land them in the
   * Casa de Paz whose sheet is open — otherwise they are created with no
   * membership and never show up in the checklist the user was filling.
   */
  defaultPeaceHouseId?: string;
}

export function PersonFormDrawer({
  open,
  onOpenChange,
  peaceHouses,
  person,
  defaultPeaceHouseId,
}: PersonFormDrawerProps) {
  const isEditing = person !== undefined;
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();
  const mutation = isEditing ? updateMutation : createMutation;
  const { data: stages } = usePersonStages();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      document: '',
      gender: NONE,
      phone: '',
      email: '',
      birthDate: '',
      address: '',
      photo: '',
      notes: '',
      personStageId: NONE,
      peaceHouseId: NONE,
      transferReason: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      firstName: person?.firstName ?? '',
      lastName: person?.lastName ?? '',
      document: person?.document ?? '',
      gender: person?.gender ?? NONE,
      phone: person?.phone ?? '',
      email: person?.email ?? '',
      // The API returns an ISO instant; `<input type="date">` wants YYYY-MM-DD.
      birthDate: person?.birthDate ? person.birthDate.slice(0, 10) : '',
      address: person?.address ?? '',
      photo: person?.photo ?? '',
      notes: person?.notes ?? '',
      personStageId: person?.personStageId ?? NONE,
      peaceHouseId: person?.currentPeaceHouseId ?? defaultPeaceHouseId ?? NONE,
      transferReason: '',
    });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person, defaultPeaceHouseId, reset]);

  const selectedHouse = watch('peaceHouseId');
  // A transfer only happens when the person already belonged somewhere and
  // the destination changed — asking for a reason otherwise would be noise.
  const isTransferring =
    isEditing &&
    Boolean(person?.currentPeaceHouseId) &&
    selectedHouse !== NONE &&
    selectedHouse !== person?.currentPeaceHouseId;

  const errorMessage = resolveApiErrorMessage(mutation.error, 'No fue posible guardar la persona.');

  const clean = (value: string | undefined): string | undefined =>
    !value || value === NONE ? undefined : value.trim() || undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar persona' : 'Nueva persona'}</DrawerTitle>
          <DrawerDescription>
            Solo los nombres y apellidos son obligatorios. El resto puede completarse después.
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            const payload = {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              document: clean(values.document),
              gender: clean(values.gender),
              phone: clean(values.phone),
              email: clean(values.email),
              birthDate: clean(values.birthDate),
              address: clean(values.address),
              photo: clean(values.photo),
              notes: clean(values.notes),
              personStageId: clean(values.personStageId),
              peaceHouseId: clean(values.peaceHouseId),
            };

            try {
              if (isEditing) {
                await updateMutation.mutateAsync({
                  id: person.id,
                  input: {
                    ...payload,
                    transferReason: isTransferring ? clean(values.transferReason) : undefined,
                    version: person.version,
                  },
                });
              } else {
                await createMutation.mutateAsync(payload);
              }
            } catch (error) {
              if (error instanceof QueuedOfflineError) {
                // El dato ya quedó en la cola local (RN-1202/RN-1203): no
                // tiene sentido dejar el formulario abierto pidiendo un
                // reintento que el propio dispositivo ya va a hacer solo.
                toast({
                  title: 'Guardado sin conexión',
                  description: error.message,
                  variant: 'warning',
                });
                mutation.reset();
                onOpenChange(false);
              }
              // Un error real de API (4xx/5xx) deja `mutation.error` fijado
              // por React Query, y eso ya se muestra arriba como alerta —
              // el formulario permanece abierto para corregir y reintentar.
              return;
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
                  category="leadership-photo"
                  label="Fotografía"
                  shape="circle"
                  value={field.value ?? null}
                  onChange={(path) => {
                    field.onChange(path ?? '');
                  }}
                />
              )}
            />

            <div className="grid gap-4 tablet:grid-cols-2">
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
            </div>

            <div className="grid gap-4 tablet:grid-cols-2">
              <Input
                label="Documento"
                helperText="Opcional. Único en el sistema cuando se informa."
                error={errors.document?.message}
                {...register('document')}
              />
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    label="Género"
                    options={GENDER_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid gap-4 tablet:grid-cols-2">
              <Input label="Celular" error={errors.phone?.message} {...register('phone')} />
              <Input
                label="Correo"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="grid gap-4 tablet:grid-cols-2">
              <Input
                label="Fecha de nacimiento"
                type="date"
                error={errors.birthDate?.message}
                {...register('birthDate')}
              />
              <Controller
                control={control}
                name="personStageId"
                render={({ field }) => (
                  <Select
                    label="Etapa del proceso"
                    options={[
                      { value: NONE, label: 'Sin asignar' },
                      ...(stages ?? []).map((stage) => ({ value: stage.id, label: stage.name })),
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>

            <Input label="Dirección" error={errors.address?.message} {...register('address')} />

            <Controller
              control={control}
              name="peaceHouseId"
              render={({ field }) => (
                <Select
                  label="Casa de Paz"
                  options={[
                    { value: NONE, label: 'Sin asignar' },
                    ...peaceHouses.map((house) => ({ value: house.id, label: house.name })),
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                  helperText={
                    isTransferring
                      ? 'Cambiar la Casa de Paz cierra el período actual y abre uno nuevo en el historial.'
                      : undefined
                  }
                />
              )}
            />

            {isTransferring ? (
              <Input
                label="Motivo del traslado"
                placeholder="Cambio de residencia"
                helperText="Queda registrado en el historial de la persona."
                error={errors.transferReason?.message}
                {...register('transferReason')}
              />
            ) : null}

            <Textarea
              label="Observaciones"
              rows={3}
              helperText="Notas pastorales de seguimiento."
              error={errors.notes?.message}
              {...register('notes')}
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
              {isEditing ? 'Guardar cambios' : 'Registrar persona'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
