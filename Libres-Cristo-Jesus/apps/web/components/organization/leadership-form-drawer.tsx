'use client';

import { useEffect, useState } from 'react';
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
  PasswordInput,
  Select,
  useToast,
} from '@lcj/ui';
import {
  RoleName,
  type LeadershipMemberAccount,
  type LeadershipMemberInput,
  type LeadershipUnit,
  type LeadershipUnitStatus,
} from '@lcj/types';
import { FileUpload } from '@/components/common/file-upload';
import {
  useChangePasswordLeadershipUnit,
  useCreateLeadershipUnit,
  useUpdateLeadershipUnit,
} from '@/hooks/use-leadership-crud';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { useSessionStore } from '@/store/session-store';

/**
 * Create/edit form for a **Leadership Unit** — the couple's shared account
 * (doc06 §3: the system never administers a person as a leader).
 *
 * Reused by every role that is modelled this way: Pastores Generales,
 * Pastores de Distrito, Líderes. The caller supplies the role id and the
 * labels for each member ("Pastor"/"Pastora", "Líder"/"Lídera"), so the
 * account rules, the photo upload and the optimistic-locking contract are
 * written once.
 *
 * TWO FIXED MEMBER SLOTS, not a dynamic list: doc04 §4 caps a unit at two
 * members and the domain always describes them as a couple. A `useFieldArray`
 * would offer an "add member" affordance the business does not have.
 *
 * Login credentials live PER MEMBER now, not on the unit (schema migration):
 * each slot carries its own `username`/`password`, and password resets are
 * a per-member action (`MemberPasswordReset` below) rather than one shared
 * at the unit level.
 */

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

const memberSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().trim(),
  lastName: z.string().trim(),
  gender: z.string().trim(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  photo: z.string().trim().optional(),
  username: z.string().trim(),
  password: z.string().trim().optional(),
});

const emailRule = (value: string | undefined): boolean =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function validateUsername(
  ctx: z.RefinementCtx,
  path: 'primary' | 'secondary',
  value: string | undefined,
) {
  if (!value || value.trim().length < 3) {
    ctx.addIssue({
      code: 'custom',
      path: [path, 'username'],
      message: 'El usuario debe tener al menos 3 caracteres.',
    });
    return;
  }
  if (!USERNAME_REGEX.test(value.trim())) {
    ctx.addIssue({
      code: 'custom',
      path: [path, 'username'],
      message: 'Use letras, números, punto, guion o guion bajo.',
    });
  }
}

function buildSchema() {
  return z
    .object({
      status: z.string(),
      primary: memberSchema,
      secondary: memberSchema,
    })
    .superRefine((values, ctx) => {
      // The first member is the account's identity and is mandatory.
      if (!values.primary.firstName) {
        ctx.addIssue({ code: 'custom', path: ['primary', 'firstName'], message: 'Obligatorio.' });
      }
      if (!values.primary.lastName) {
        ctx.addIssue({ code: 'custom', path: ['primary', 'lastName'], message: 'Obligatorio.' });
      }
      if (!emailRule(values.primary.email)) {
        ctx.addIssue({ code: 'custom', path: ['primary', 'email'], message: 'Correo inválido.' });
      }
      validateUsername(ctx, 'primary', values.primary.username);
      // A brand-new member (no `id` yet) is the only case an initial
      // password must be set here — an existing member's password changes
      // through the separate "Restablecer contraseña" action instead.
      if (!values.primary.id) {
        if (!values.primary.password || values.primary.password.length < 8) {
          ctx.addIssue({
            code: 'custom',
            path: ['primary', 'password'],
            message: 'La contraseña debe tener al menos 8 caracteres.',
          });
        }
      }

      // The second is optional, but a partially filled one is a mistake
      // worth catching before it reaches the database.
      const secondaryTouched = Boolean(
        values.secondary.firstName || values.secondary.lastName || values.secondary.photo,
      );
      if (secondaryTouched && !values.secondary.firstName) {
        ctx.addIssue({ code: 'custom', path: ['secondary', 'firstName'], message: 'Obligatorio.' });
      }
      if (secondaryTouched && !values.secondary.lastName) {
        ctx.addIssue({ code: 'custom', path: ['secondary', 'lastName'], message: 'Obligatorio.' });
      }
      if (!emailRule(values.secondary.email)) {
        ctx.addIssue({ code: 'custom', path: ['secondary', 'email'], message: 'Correo inválido.' });
      }
      if (secondaryTouched) {
        validateUsername(ctx, 'secondary', values.secondary.username);
        if (!values.secondary.id) {
          if (!values.secondary.password || values.secondary.password.length < 8) {
            ctx.addIssue({
              code: 'custom',
              path: ['secondary', 'password'],
              message: 'La contraseña debe tener al menos 8 caracteres.',
            });
          }
        }
      }
    });
}

type LeadershipFormValues = z.input<ReturnType<typeof buildSchema>>;

/** `LeadershipUnitStatus` is a string union, not a Prisma enum object. */
const STATUS_OPTIONS: { value: LeadershipUnitStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'SUSPENDED', label: 'Suspendido' },
  { value: 'RETIRED', label: 'Retirado' },
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

export interface LeadershipFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `CatRole.id` this account is assigned to. */
  roleId: string;
  /** `LeadershipUnit.type`, e.g. "Pastor General". */
  unitType: string;
  /** Slot headings, e.g. `['Pastor', 'Pastora']`. */
  memberLabels: [string, string];
  title: string;
  description: string;
  /** Present when editing. */
  unit?: LeadershipUnit;
}

function emptyMember(): LeadershipMemberInput & { id?: string } {
  return {
    firstName: '',
    lastName: '',
    gender: '',
    phone: '',
    email: '',
    photo: '',
    username: '',
    password: '',
  };
}

/**
 * Password reset for ONE `LeadershipMember` — resetting a leadership
 * account's password is gated on `user:change-password`, which the seed
 * assigns EXCLUSIVELY to ADMIN (not even Pastor General has it). Each slot
 * gets its own instance/state: the two members of a unit have independent
 * credentials since the schema migration, so there is no longer a single
 * shared reset flow.
 */
function MemberPasswordReset({
  member,
  canChangePassword,
  unitId,
  unitVersion,
  label,
}: {
  member: LeadershipMemberAccount;
  canChangePassword: boolean;
  unitId: string;
  unitVersion: number;
  label: string;
}) {
  const changePasswordMutation = useChangePasswordLeadershipUnit();
  const { toast } = useToast();
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);

  if (!canChangePassword) {
    return null;
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      setPasswordResetError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setPasswordResetError(null);
    try {
      await changePasswordMutation.mutateAsync({
        id: unitId,
        input: { memberId: member.id, newPassword, version: unitVersion },
      });
      setNewPassword('');
      setIsResettingPassword(false);
      toast({
        title: 'Contraseña actualizada',
        description: `La contraseña de ${label} se actualizó correctamente.`,
        variant: 'success',
      });
    } catch (error) {
      setPasswordResetError(
        resolveApiErrorMessage(error, 'No fue posible actualizar la contraseña.') ??
          'No fue posible actualizar la contraseña.',
      );
    }
  }

  if (!isResettingPassword) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setIsResettingPassword(true);
        }}
      >
        Restablecer contraseña
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PasswordInput
        label={`Nueva contraseña — ${label}`}
        helperText="Mínimo 8 caracteres."
        value={newPassword}
        onChange={(event) => {
          setNewPassword(event.target.value);
        }}
      />
      {passwordResetError ? (
        <p
          role="alert"
          className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
        >
          {passwordResetError}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setIsResettingPassword(false);
            setNewPassword('');
            setPasswordResetError(null);
          }}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          loading={changePasswordMutation.isPending}
          onClick={() => {
            void handleChangePassword();
          }}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
}

export function LeadershipFormDrawer({
  open,
  onOpenChange,
  roleId,
  unitType,
  memberLabels,
  title,
  description,
  unit,
}: LeadershipFormDrawerProps) {
  const isEditing = unit !== undefined;
  const createMutation = useCreateLeadershipUnit();
  const updateMutation = useUpdateLeadershipUnit();
  const mutation = isEditing ? updateMutation : createMutation;

  // Being able to edit this account (`isEditing`) says nothing about being
  // able to reset a member's password: those are two different permissions.
  const currentUser = useSessionStore((state) => state.user);
  const canChangePassword = isEditing && currentUser?.role === RoleName.ADMIN;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LeadershipFormValues>({
    resolver: zodResolver(buildSchema()),
    defaultValues: {
      status: 'ACTIVE',
      primary: emptyMember(),
      secondary: emptyMember(),
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const [first, second] = unit?.members ?? [];
    reset({
      status: unit?.status ?? 'ACTIVE',
      primary: first
        ? {
            id: first.id,
            firstName: first.firstName,
            lastName: first.lastName,
            gender: first.gender,
            phone: first.phone ?? '',
            email: first.email ?? '',
            photo: first.photo ?? '',
            username: first.username,
            password: '',
          }
        : emptyMember(),
      secondary: second
        ? {
            id: second.id,
            firstName: second.firstName,
            lastName: second.lastName,
            gender: second.gender,
            phone: second.phone ?? '',
            email: second.email ?? '',
            photo: second.photo ?? '',
            username: second.username,
            password: '',
          }
        : emptyMember(),
    });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit, reset]);

  const errorMessage = resolveApiErrorMessage(mutation.error, 'No fue posible guardar la cuenta.');

  /** Drops empty optional fields so the API sees "not provided". */
  function toMember(values: LeadershipFormValues['primary']): LeadershipMemberInput | null {
    if (!values.firstName?.trim()) {
      return null;
    }
    const clean = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);
    return {
      id: values.id,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      gender: values.gender?.trim() || 'N/A',
      phone: clean(values.phone),
      email: clean(values.email),
      photo: clean(values.photo),
      username: clean(values.username),
      password: clean(values.password),
    };
  }

  function renderMember(
    slot: 'primary' | 'secondary',
    label: string,
    actualMember: LeadershipMemberAccount | undefined,
  ) {
    const slotErrors = errors[slot];
    const hasAccount = Boolean(actualMember);
    return (
      <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
        <legend className="px-2 text-small font-semibold text-foreground">{label}</legend>

        <Controller
          control={control}
          name={`${slot}.photo`}
          render={({ field }) => (
            <FileUpload
              category="leadership-photo"
              label={`Fotografía ${label}`}
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
            error={slotErrors?.firstName?.message}
            {...register(`${slot}.firstName`)}
          />
          <Input
            label="Apellidos"
            error={slotErrors?.lastName?.message}
            {...register(`${slot}.lastName`)}
          />
        </div>

        <Controller
          control={control}
          name={`${slot}.gender`}
          render={({ field }) => (
            <Select
              label="Género"
              placeholder="Seleccione"
              options={GENDER_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              error={slotErrors?.gender?.message}
            />
          )}
        />

        <div className="grid gap-4 tablet:grid-cols-2">
          <Input
            label="Celular"
            error={slotErrors?.phone?.message}
            {...register(`${slot}.phone`)}
          />
          <Input
            label="Correo"
            type="email"
            error={slotErrors?.email?.message}
            {...register(`${slot}.email`)}
          />
        </div>

        <div className="grid gap-4 tablet:grid-cols-2">
          <Input
            label="Usuario"
            required
            placeholder="lider.carlos"
            error={slotErrors?.username?.message}
            {...register(`${slot}.username`)}
          />
          {!hasAccount ? (
            <PasswordInput
              label="Contraseña"
              required
              helperText="Mínimo 8 caracteres."
              error={slotErrors?.password?.message}
              {...register(`${slot}.password`)}
            />
          ) : null}
        </div>

        {actualMember && unit ? (
          <MemberPasswordReset
            key={`${open ? 'open' : 'closed'}-${actualMember.id}`}
            member={actualMember}
            canChangePassword={canChangePassword}
            unitId={unit.id}
            unitVersion={unit.version}
            label={label}
          />
        ) : null}
      </fieldset>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            const members = [toMember(values.primary), toMember(values.secondary)].filter(
              (member): member is LeadershipMemberInput => member !== null,
            );

            if (isEditing) {
              await updateMutation.mutateAsync({
                id: unit.id,
                input: {
                  type: unitType,
                  status: values.status as LeadershipUnitStatus,
                  members,
                  version: unit.version,
                },
              });
            } else {
              await createMutation.mutateAsync({
                type: unitType,
                roleId,
                members,
              });
            }

            onOpenChange(false);
          })}
        >
          <DrawerBody className="flex flex-col gap-5">
            {errorMessage ? (
              <p
                role="alert"
                className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
              >
                {errorMessage}
              </p>
            ) : null}

            {isEditing ? (
              <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
                <legend className="px-2 text-small font-semibold text-foreground">
                  Estado de la cuenta
                </legend>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      label="Estado"
                      options={STATUS_OPTIONS}
                      value={field.value}
                      onValueChange={field.onChange}
                      error={errors.status?.message}
                    />
                  )}
                />
              </fieldset>
            ) : null}

            {renderMember('primary', memberLabels[0], unit?.members[0])}
            {renderMember('secondary', memberLabels[1], unit?.members[1])}
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
              {isEditing ? 'Guardar cambios' : 'Crear cuenta'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
