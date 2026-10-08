'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle, Network } from 'lucide-react';
import { Button, Container, EmptyState, PageHeader, SkeletonCard } from '@lcj/ui';
import { RoleName, type KidsAssignment, type KidsSchoolMetrics } from '@lcj/types';
import { useKidsSchools, kidsSchoolKeys } from '@/hooks/use-kids-schools';
import { kidsMetricsKeys } from '@/hooks/use-kids-attendance';
import { listKidsAssignments } from '@/lib/api/kids-schools';
import { getKidsMetrics } from '@/lib/api/kids-attendance';
import { useLeadershipUnitsByRole, leadershipUnitLabel } from '@/hooks/use-leadership-units';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import {
  KidsOrganigramaRootCard,
  KidsOrganigramaSchoolCard,
  type KidsOrganigramaStaffEntry,
} from '@/components/kids/kids-organigrama-chart';
import { ConnectorBar, ConnectorStub } from '@/components/organization/chart/connector';

/**
 * Organigrama de Escuela Kids — árbol propio (Escuela Kids → sede → líder →
 * auxiliares), separado de `/organigrama` (Casas de Paz): ruta distinta,
 * componentes propios en `components/kids/`, sin editar ni importar nada
 * del organigrama de Casas de Paz salvo los conectores puramente decorativos
 * (`ConnectorStub`/`ConnectorBar`, sin datos de Casas de Paz).
 */
export default function KidsOrganigramaPage() {
  const router = useRouter();
  const { data: schools, isPending, isError, error, refetch } = useKidsSchools();
  const { data: leaderUnits } = useLeadershipUnitsByRole(RoleName.KIDS_LEADER);
  const { data: assistantUnits } = useLeadershipUnitsByRole(RoleName.KIDS_ASSISTANT);

  const unitNameById = useMemo(() => {
    const entries = [...(leaderUnits ?? []), ...(assistantUnits ?? [])].map(
      (unit) => [unit.id, leadershipUnitLabel(unit)] as const,
    );
    return new Map(entries);
  }, [leaderUnits, assistantUnits]);

  /** `members[0].photo` (the individual's own photo) over `unit.photo` (the
   * couple-level field): every Kids demo account is a single-member unit,
   * so the member's photo is the one actually meant to represent them. */
  const unitPhotoById = useMemo(() => {
    const entries = [...(leaderUnits ?? []), ...(assistantUnits ?? [])].map(
      (unit) => [unit.id, unit.members[0]?.photo ?? unit.photo] as const,
    );
    return new Map(entries);
  }, [leaderUnits, assistantUnits]);

  const schoolIds = useMemo(() => (schools ?? []).map((school) => school.id), [schools]);

  const assignmentQueries = useQueries({
    queries: schoolIds.map((id) => ({
      queryKey: kidsSchoolKeys.assignments(id),
      queryFn: () => listKidsAssignments(id),
    })),
  });

  const metricsQueries = useQueries({
    queries: schoolIds.map((id) => ({
      queryKey: kidsMetricsKeys.bySchool(id),
      queryFn: () => getKidsMetrics(id),
    })),
  });

  const isTeamPending = assignmentQueries.some((query) => query.isPending);

  const schoolNodes = useMemo(() => {
    return (schools ?? []).map((school, index) => {
      const assignments = (assignmentQueries[index]?.data as KidsAssignment[] | undefined) ?? [];
      const active = assignments.filter((assignment) => assignment.endDate === null);
      const leaderAssignment = active.find((assignment) => assignment.role === 'LEADER') ?? null;
      const leader: KidsOrganigramaStaffEntry | null = leaderAssignment
        ? {
            assignment: leaderAssignment,
            name: unitNameById.get(leaderAssignment.leadershipUnitId) ?? 'Sin nombre',
            photo: unitPhotoById.get(leaderAssignment.leadershipUnitId) ?? null,
          }
        : null;
      const assistants: KidsOrganigramaStaffEntry[] = active
        .filter((assignment) => assignment.role === 'ASSISTANT')
        .map((assignment) => ({
          assignment,
          name: unitNameById.get(assignment.leadershipUnitId) ?? 'Sin nombre',
          photo: unitPhotoById.get(assignment.leadershipUnitId) ?? null,
        }));
      const metrics = metricsQueries[index]?.data as KidsSchoolMetrics | undefined;

      return { school, metrics, leader, assistants };
    });
  }, [schools, assignmentQueries, metricsQueries, unitNameById, unitPhotoById]);

  const totals = useMemo(
    () =>
      schoolNodes.reduce(
        (acc, node) => ({
          leaders: acc.leaders + (node.leader ? 1 : 0),
          assistants: acc.assistants + node.assistants.length,
          children: acc.children + (node.metrics?.totalChildren ?? 0),
        }),
        { leaders: 0, assistants: 0, children: 0 },
      ),
    [schoolNodes],
  );

  return (
    <Container size="lg" className="flex flex-col gap-8 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Organigrama · Escuela Kids"
        description="Sedes, líderes y auxiliares de Escuela Kids"
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar el organigrama"
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

      {isPending || isTeamPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {schools && !isTeamPending ? (
        schools.length === 0 ? (
          <EmptyState
            icon={Network}
            title="Todavía no hay sedes registradas"
            description="Cuando se registre la primera sede de Escuela Kids, el organigrama aparecerá aquí."
          />
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <div className="flex flex-col items-center gap-0">
              <div className="w-full max-w-3xl">
                <KidsOrganigramaRootCard
                  schoolCount={schools.length}
                  leaderCount={totals.leaders}
                  assistantCount={totals.assistants}
                  childCount={totals.children}
                />
              </div>

              <ConnectorStub size="lg" />
              <ConnectorBar className="flex w-full flex-nowrap justify-start gap-6">
                {schoolNodes.map((node) => (
                  <KidsOrganigramaSchoolCard
                    key={node.school.id}
                    school={node.school}
                    metrics={node.metrics}
                    leader={node.leader}
                    assistants={node.assistants}
                    onClick={() => {
                      router.push(`/kids/${node.school.id}`);
                    }}
                  />
                ))}
              </ConnectorBar>
            </div>
          </div>
        )
      ) : null}
    </Container>
  );
}
