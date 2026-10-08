'use client';

import { useState } from 'react';
import { AlertTriangle, Mail, Pencil, Phone, Plus, Trash2, UserRound } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  Container,
  EmptyState,
  Icon,
  Loading,
  PageHeader,
  cn,
} from '@lcj/ui';
import { ROLE_NAME_LABELS, RoleName, type LeadershipUnit } from '@lcj/types';
import { useLeadershipUnitsByRole } from '@/hooks/use-leadership-units';
import { useDeleteLeadershipUnit } from '@/hooks/use-leadership-crud';
import { useRoleId } from '@/hooks/use-role-id';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { useSessionStore } from '@/store/session-store';
import { LeadershipFormDrawer } from '@/components/organization/leadership-form-drawer';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Pastores Generales — the single shared account at the top of the
 * hierarchy (doc06 §2).
 *
 * NOT a list screen: the business admits exactly ONE Pastores Generales
 * account, and the backend enforces it (`UsersService.assertGeneralPastor
 * RemainsUnique`). Presenting a table with a "Nuevo" button would offer an
 * action the API refuses — so this shows the account, or an empty state
 * that creates the first one.
 *
 * Two people, one account: Pastor and Pastora are the two
 * `LeadershipMember` rows of that unit, each with their own photograph and
 * contact details.
 */

/** Only the Administrador manages this account (doc05: "Configurar la plataforma"). */
const ROLES_THAT_MANAGE: readonly RoleName[] = [RoleName.ADMIN];

/** The couple, joined the way Spanish reads them. */
function coupleName(unit: LeadershipUnit): string {
  if (unit.members.length === 0) {
    return ROLE_NAME_LABELS[RoleName.GENERAL_PASTOR];
  }
  return unit.members.map((member) => `${member.firstName} ${member.lastName}`.trim()).join(' y ');
}

function MemberCard({
  member,
  label,
}: {
  member: LeadershipUnit['members'][number];
  label: string;
}) {
  const photo = useStoredFilePreview(member.photo);
  const fullName = `${member.firstName} ${member.lastName}`.trim();

  return (
    <Card className="flex items-start gap-4 p-4">
      <Avatar src={photo ?? undefined} name={fullName} size="lg" />

      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-caption text-foreground-muted">{label}</span>
        <span className="text-body font-semibold text-foreground">{fullName}</span>

        <span className="text-caption text-foreground-muted">@{member.username}</span>

        {member.phone ? (
          <span className="flex items-center gap-2 text-small text-foreground-muted">
            <Icon icon={Phone} size="xs" />
            {member.phone}
          </span>
        ) : null}

        {member.email ? (
          <span className="flex min-w-0 items-center gap-2 text-small text-foreground-muted">
            <Icon icon={Mail} size="xs" />
            <span className="truncate">{member.email}</span>
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export default function PastoresGeneralesPage() {
  const user = useSessionStore((state) => state.user);
  const canManage = user ? ROLES_THAT_MANAGE.includes(user.role) : false;

  const roleId = useRoleId(RoleName.GENERAL_PASTOR);
  const {
    data: units,
    isPending,
    isError,
    error,
  } = useLeadershipUnitsByRole(RoleName.GENERAL_PASTOR);
  const deleteMutation = useDeleteLeadershipUnit();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const account = units?.[0];
  const memberLabels: [string, string] = ['Pastor', 'Pastora'];

  return (
    <Container size="md" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Pastores Generales"
        description="Cuenta compartida de la pareja pastoral que encabeza la organización."
        actions={
          canManage && account ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                leftIcon={Pencil}
                onClick={() => {
                  setIsFormOpen(true);
                }}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                leftIcon={Trash2}
                onClick={() => {
                  deleteMutation.reset();
                  setIsDeleting(true);
                }}
              >
                Eliminar
              </Button>
            </div>
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar la cuenta"
          description={error.message}
        />
      ) : isPending ? (
        <Loading label="Cargando Pastores Generales…" lines={5} />
      ) : !account ? (
        <EmptyState
          icon={UserRound}
          title="Todavía no existe la cuenta de Pastores Generales"
          description="El sistema admite una sola cuenta para la pareja pastoral general. Créela para completar la cabeza del organigrama."
          action={
            canManage ? (
              <Button
                leftIcon={Plus}
                disabled={!roleId}
                onClick={() => {
                  setIsFormOpen(true);
                }}
              >
                Crear cuenta
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className={cn('grid gap-4', account.members.length > 1 && 'tablet:grid-cols-2')}>
            {account.members.map((member, index) => (
              <MemberCard
                key={member.id}
                member={member}
                label={memberLabels[index] ?? 'Integrante'}
              />
            ))}
          </div>

          {account.members.length === 0 ? (
            <p className="text-small text-foreground-muted">
              La cuenta existe pero no tiene integrantes registrados. Edítela para agregar al Pastor
              y la Pastora.
            </p>
          ) : null}
        </div>
      )}

      {canManage && roleId ? (
        <LeadershipFormDrawer
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          roleId={roleId}
          unitType={ROLE_NAME_LABELS[RoleName.GENERAL_PASTOR]}
          memberLabels={memberLabels}
          title={account ? 'Editar Pastores Generales' : 'Crear Pastores Generales'}
          description="Una sola cuenta de acceso compartida por la pareja. Cada integrante conserva su fotografía y sus datos de contacto."
          unit={account}
        />
      ) : null}

      <ConfirmDeleteModal
        open={isDeleting}
        onOpenChange={setIsDeleting}
        itemLabel="la cuenta de Pastores Generales"
        itemName={account ? coupleName(account) : ''}
        loading={deleteMutation.isPending}
        error={resolveApiErrorMessage(deleteMutation.error, 'No fue posible eliminar la cuenta.')}
        onConfirm={() => {
          if (!account) {
            return;
          }
          deleteMutation.mutate(account.id, {
            onSuccess: () => {
              setIsDeleting(false);
            },
          });
        }}
      />
    </Container>
  );
}
