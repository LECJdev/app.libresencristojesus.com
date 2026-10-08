'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Church as ChurchIcon, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import {
  Button,
  Container,
  EmptyState,
  EntityStatusBadge,
  IconButton,
  Input,
  Loading,
  PageHeader,
  Textarea,
} from '@lcj/ui';
import type { Church } from '@lcj/types';
import { useChurch, useDeleteSetting, useSettings, useUpdateChurch } from '@/hooks/use-church';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { FileUpload } from '@/components/common/file-upload';
import { SettingFormDrawer } from '@/components/organization/setting-form-drawer';
import { toEntityStatus } from '@/components/organization/mappers';
import { resolveApiErrorMessage } from '@/lib/api-error-message';

/**
 * Iglesia — institutional data plus general configuration (doc06 module 1,
 * doc04 "Mejoras" §3).
 *
 * Reached from the "Configuración" menu entry, which the navigation matrix
 * already restricts to Administrador (doc05: "Configurar Sistema" ✅❌❌❌).
 * `RouteRoleGuard` enforces it; this screen assumes nothing about the role.
 *
 * The logo is uploaded through the shared `<FileUpload>` component, which
 * is the only path to `POST /files/upload` in the whole frontend. What is
 * stored on `Church.logo` is the returned PATH, never the binary and never
 * a full URL (doc04 §15).
 */

const churchSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  description: z.string().trim().optional(),
  logo: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Ingrese un correo válido.',
    }),
});

type ChurchFormValues = z.input<typeof churchSchema>;

function ChurchForm({ church }: { church: Church }) {
  const mutation = useUpdateChurch();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ChurchFormValues>({
    resolver: zodResolver(churchSchema),
    defaultValues: {
      name: church.name,
      description: church.description ?? '',
      logo: church.logo ?? '',
      address: church.address ?? '',
      phone: church.phone ?? '',
      email: church.email ?? '',
    },
  });

  // Re-syncs when the record changes underneath (another admin saved, or a
  // refetch landed) so the form never edits a stale version number.
  useEffect(() => {
    reset({
      name: church.name,
      description: church.description ?? '',
      logo: church.logo ?? '',
      address: church.address ?? '',
      phone: church.phone ?? '',
      email: church.email ?? '',
    });
  }, [church, reset]);

  const errorMessage = resolveApiErrorMessage(
    mutation.error,
    'No fue posible guardar los datos de la iglesia.',
  );

  return (
    <form
      // Can't be a `<Card>` — that renders a `<div>` and this element needs
      // real form semantics for `onSubmit`/`type="submit"` — so it repeats
      // Card's own non-interactive recipe (`rounded-lg border bg-surface
      // shadow-sm`) by hand instead, kept in sync with `Card` on purpose.
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm"
      onSubmit={handleSubmit(async (values) => {
        const trimmed = (value: string | undefined): string | undefined =>
          value?.trim() ? value.trim() : undefined;

        await mutation.mutateAsync({
          id: church.id,
          input: {
            name: values.name.trim(),
            description: trimmed(values.description),
            logo: trimmed(values.logo),
            address: trimmed(values.address),
            phone: trimmed(values.phone),
            email: trimmed(values.email),
            version: church.version,
          },
        });
        setSavedAt(new Date());
      })}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-h4 font-semibold text-foreground">Datos institucionales</h2>
        <EntityStatusBadge status={toEntityStatus(church.status)} />
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
        >
          {errorMessage}
        </p>
      ) : null}

      {savedAt && !isDirty ? (
        <p role="status" className="text-small text-success-700">
          Cambios guardados correctamente.
        </p>
      ) : null}

      <Input label="Nombre" required error={errors.name?.message} {...register('name')} />
      <Textarea
        label="Descripción"
        rows={3}
        error={errors.description?.message}
        {...register('description')}
      />
      <Controller
        control={control}
        name="logo"
        render={({ field }) => (
          <FileUpload
            category="church-logo"
            label="Logo"
            helperText="PNG, JPG o WebP. Se guarda únicamente la ruta devuelta por el servidor."
            value={field.value ?? null}
            onChange={(path) => {
              field.onChange(path ?? '');
            }}
            error={errors.logo?.message}
          />
        )}
      />
      <Input label="Dirección" error={errors.address?.message} {...register('address')} />

      <div className="grid gap-4 tablet:grid-cols-2">
        <Input label="Teléfono" error={errors.phone?.message} {...register('phone')} />
        <Input label="Correo" type="email" error={errors.email?.message} {...register('email')} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" leftIcon={Save} loading={mutation.isPending} disabled={!isDirty}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function SettingsSection() {
  const { data: settings, isPending, isError, error } = useSettings();
  const deleteMutation = useDeleteSetting();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | undefined>(undefined);
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);

  const editing = settings?.find((setting) => setting.key === editingKey);

  return (
    <section
      // Same reasoning as `ChurchForm` above: a landmark element repeating
      // `Card`'s non-interactive recipe rather than a `<div>` wrapped in
      // `<Card>`, so the sectioning semantics are not lost.
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
          <Settings2 className="size-5" aria-hidden="true" />
          Configuración general
        </h2>
        <Button
          variant="secondary"
          leftIcon={Plus}
          onClick={() => {
            setEditingKey(undefined);
            setIsFormOpen(true);
          }}
        >
          Nuevo parámetro
        </Button>
      </div>

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar la configuración"
          description={error.message}
        />
      ) : isPending ? (
        <Loading label="Cargando configuración…" lines={3} />
      ) : settings.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title="Sin parámetros configurados"
          description="Los parámetros del sistema se almacenan en base de datos para poder cambiarlos sin desplegar código."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {settings.map((setting) => (
            <li key={setting.id} className="flex items-start gap-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <code className="text-small font-medium text-foreground">{setting.key}</code>
                <span className="truncate text-body text-foreground">{setting.value}</span>
                {setting.description ? (
                  <span className="text-caption text-foreground-muted">{setting.description}</span>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton
                  icon={Save}
                  aria-label={`Editar ${setting.key}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingKey(setting.key);
                    setIsFormOpen(true);
                  }}
                />
                <IconButton
                  icon={Trash2}
                  aria-label={`Eliminar ${setting.key}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    deleteMutation.reset();
                    setPendingDeletion(setting.key);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <SettingFormDrawer open={isFormOpen} onOpenChange={setIsFormOpen} setting={editing} />

      <ConfirmDeleteModal
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeletion(null);
          }
        }}
        itemLabel="el parámetro"
        itemName={pendingDeletion ?? ''}
        loading={deleteMutation.isPending}
        error={resolveApiErrorMessage(
          deleteMutation.error,
          'No fue posible eliminar el parámetro.',
        )}
        onConfirm={() => {
          if (!pendingDeletion) {
            return;
          }
          deleteMutation.mutate(pendingDeletion, {
            onSuccess: () => {
              setPendingDeletion(null);
            },
          });
        }}
      />
    </section>
  );
}

export default function ConfiguracionPage() {
  const { data: church, isPending, isError, error } = useChurch();

  return (
    <Container size="md" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Iglesia"
        description="Datos institucionales y parámetros generales del sistema."
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar la iglesia"
          description={error.message}
        />
      ) : isPending ? (
        <Loading label="Cargando datos de la iglesia…" lines={6} />
      ) : !church ? (
        <EmptyState
          icon={ChurchIcon}
          title="No hay una iglesia registrada"
          description="La instalación crea la iglesia automáticamente. Ejecute el seed inicial (pnpm db:seed) para generarla."
        />
      ) : (
        <ChurchForm church={church} />
      )}

      <SettingsSection />
    </Container>
  );
}
