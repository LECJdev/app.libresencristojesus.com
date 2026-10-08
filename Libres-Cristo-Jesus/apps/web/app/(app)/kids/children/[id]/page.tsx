'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Cake, FileCheck, Mail, Pencil, Phone, Plus, Star } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Container,
  EmptyState,
  Loading,
  PageHeader,
  Icon,
} from '@lcj/ui';
import type { KidsConsentStatus } from '@lcj/types';
import { useKidsChild, useUpdateKidsConsent } from '@/hooks/use-kids-children';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { DetailRow } from '@/components/organization/detail-row';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { FileUpload } from '@/components/common/file-upload/file-upload';
import { KidsChildFormDrawer } from '@/components/kids/kids-child-form-drawer';
import { KidsGuardianFormDrawer } from '@/components/kids/kids-guardian-form-drawer';

const CONSENT_LABELS: Record<KidsConsentStatus, string> = {
  PENDING_AUTHORIZATION: 'Autorización pendiente',
  ACTIVE: 'Autorizado',
  INACTIVE: 'Revocado',
};

const CONSENT_VARIANTS: Record<KidsConsentStatus, 'success' | 'warning' | 'neutral'> = {
  PENDING_AUTHORIZATION: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
};

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

export default function KidsChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: child, isPending, isError, error, refetch } = useKidsChild(id);
  const documentPreview = useStoredFilePreview(child?.consent.documentPath);
  const childPhoto = useStoredFilePreview(child?.photo);
  const consentMutation = useUpdateKidsConsent();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGuardianFormOpen, setIsGuardianFormOpen] = useState(false);

  const fullName = child ? `${child.firstName} ${child.lastName}`.trim() : '';

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title={fullName || 'Niño'}
        actions={
          <div className="flex items-center gap-3">
            {child ? (
              <Badge variant={CONSENT_VARIANTS[child.consent.status]}>
                {CONSENT_LABELS[child.consent.status]}
              </Badge>
            ) : null}
            <Button
              variant="secondary"
              leftIcon={Pencil}
              onClick={() => {
                setIsEditOpen(true);
              }}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              leftIcon={ArrowLeft}
              onClick={() => {
                router.back();
              }}
            >
              Volver
            </Button>
          </div>
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar el niño"
          description={error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              Reintentar
            </Button>
          }
        />
      ) : null}

      {isPending ? <Loading label="Cargando niño…" lines={6} /> : null}

      {child ? (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <Avatar src={childPhoto ?? undefined} name={fullName} size="xl" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-body font-semibold text-foreground">{fullName}</p>
                <p className="flex items-center gap-1 text-caption text-foreground-muted">
                  <Icon icon={Cake} size="xs" />
                  {child.age} {child.age === 1 ? 'año' : 'años'} · Nació el{' '}
                  {dateFormatter.format(new Date(child.birthDate))}
                </p>
                {child.notes ? (
                  <p className="text-caption text-foreground-muted">{child.notes}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h4 font-semibold text-foreground">Autorización</h2>
            <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
              <DetailRow
                icon={FileCheck}
                label="Estado"
                value={CONSENT_LABELS[child.consent.status]}
              />
              {child.consent.signedAt ? (
                <DetailRow
                  icon={Cake}
                  label="Firmado el"
                  value={dateFormatter.format(new Date(child.consent.signedAt))}
                />
              ) : null}

              {documentPreview ? (
                <a
                  href={documentPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="text-small font-medium text-primary-700 underline"
                >
                  Ver documento cargado
                </a>
              ) : null}

              <FileUpload
                category="kids-consent-document"
                label="Cargar / reemplazar documento de autorización"
                value={null}
                onChange={(path) => {
                  if (!path) {
                    return;
                  }
                  consentMutation.mutate({ childId: child.id, input: { documentPath: path } });
                }}
              />

              {child.consent.status === 'ACTIVE' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={consentMutation.isPending}
                  onClick={() => {
                    consentMutation.mutate({
                      childId: child.id,
                      input: { status: 'INACTIVE' },
                    });
                  }}
                >
                  Revocar autorización
                </Button>
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h4 font-semibold text-foreground">Acudientes</h2>
              <Button
                size="sm"
                leftIcon={Plus}
                onClick={() => {
                  setIsGuardianFormOpen(true);
                }}
              >
                Nuevo acudiente
              </Button>
            </div>

            {child.guardians.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="Sin acudientes registrados"
                description="Vincule al primer adulto responsable de este niño."
              />
            ) : (
              <div className="grid gap-3 tablet:grid-cols-2">
                {child.guardians.map((link) => (
                  <div key={link.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <p className="text-body font-semibold text-foreground">
                        {link.guardian.firstName} {link.guardian.lastName}
                      </p>
                      {link.isPrimary ? <Icon icon={Star} size="xs" className="text-warning-600" /> : null}
                    </div>
                    <p className="text-caption text-foreground-muted">{link.guardian.relationship}</p>
                    <p className="flex items-center gap-2 text-caption text-foreground-muted">
                      <Icon icon={Phone} size="xs" />
                      {link.guardian.phone}
                    </p>
                    {link.guardian.email ? (
                      <p className="flex items-center gap-2 text-caption text-foreground-muted">
                        <Icon icon={Mail} size="xs" />
                        {link.guardian.email}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {child ? (
        <KidsChildFormDrawer
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          schoolId={child.kidsSchoolId}
          child={child}
        />
      ) : null}

      <KidsGuardianFormDrawer
        open={isGuardianFormOpen}
        onOpenChange={setIsGuardianFormOpen}
        childId={id}
      />
    </Container>
  );
}
