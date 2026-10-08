'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle, Baby, Plus } from 'lucide-react';
import { Button, Container, EmptyState, Grid, GridItem, PageHeader, SkeletonCard } from '@lcj/ui';
import { RoleName, type KidsSchool, type KidsSchoolMetrics } from '@lcj/types';
import { useKidsSchools } from '@/hooks/use-kids-schools';
import { kidsMetricsKeys } from '@/hooks/use-kids-attendance';
import { getKidsMetrics } from '@/lib/api/kids-attendance';
import { useSessionStore } from '@/store/session-store';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { KidsSchoolCard } from '@/components/kids/kids-school-card';
import { KidsSchoolFormDrawer } from '@/components/kids/kids-school-form-drawer';
import { KidsSummaryMetrics } from '@/components/kids/kids-summary-metrics';

/**
 * Sedes de Escuela Kids (Fase 11). `prisma/seed.ts` (`KIDS_SCHOOL_PERMISSIONS`)
 * concede `create`/`update` solo a ADMIN — KIDS_LEADER/KIDS_ASSISTANT ven
 * esta lista ya acotada a su propia sede por el backend (`findAll` en
 * `KidsSchoolsService`), en modo lectura.
 */
const ROLES_THAT_MANAGE_SCHOOLS: readonly RoleName[] = [RoleName.ADMIN];

export default function KidsSchoolsPage() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const canManage = user ? ROLES_THAT_MANAGE_SCHOOLS.includes(user.role) : false;

  const { data: schools, isPending, isError, error } = useKidsSchools();
  const [editing, setEditing] = useState<KidsSchool | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const schoolIds = useMemo(() => (schools ?? []).map((school) => school.id), [schools]);
  const metricsQueries = useQueries({
    queries: schoolIds.map((id) => ({
      queryKey: kidsMetricsKeys.bySchool(id),
      queryFn: () => getKidsMetrics(id),
    })),
  });
  const isMetricsPending = metricsQueries.some((query) => query.isPending);

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Escuela Kids"
        description="Sedes de Escuela Kids, sus niños y su asistencia semanal."
        actions={
          canManage ? (
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditing(undefined);
                setIsFormOpen(true);
              }}
            >
              Nueva sede
            </Button>
          ) : null
        }
      />

      {!isPending && !isError && (schools?.length ?? 0) > 0 ? (
        <KidsSummaryMetrics
          metricsBySchool={metricsQueries.map((query) => query.data as KidsSchoolMetrics | undefined)}
          schoolCount={schools?.length ?? 0}
          loading={isMetricsPending}
        />
      ) : null}

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar las sedes"
          description={error.message}
        />
      ) : isPending ? (
        <Grid>
          {Array.from({ length: 4 }, (_, index) => (
            <GridItem key={index} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
              <SkeletonCard className="h-40" />
            </GridItem>
          ))}
        </Grid>
      ) : (schools?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Baby}
          title={canManage ? 'Todavía no hay sedes' : 'No tiene una sede asignada'}
          description={
            canManage
              ? 'Registre la primera sede de Escuela Kids para comenzar.'
              : 'Solicite al administrador que le asigne una sede de Escuela Kids.'
          }
          action={
            canManage ? (
              <Button
                leftIcon={Plus}
                onClick={() => {
                  setEditing(undefined);
                  setIsFormOpen(true);
                }}
              >
                Nueva sede
              </Button>
            ) : null
          }
        />
      ) : (
        <Grid>
          {(schools ?? []).map((school) => (
            <GridItem key={school.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
              <KidsSchoolCard
                school={school}
                canManage={canManage}
                onView={() => {
                  router.push(`/kids/${school.id}`);
                }}
                onEdit={() => {
                  setEditing(school);
                  setIsFormOpen(true);
                }}
              />
            </GridItem>
          ))}
        </Grid>
      )}

      {canManage ? (
        <KidsSchoolFormDrawer open={isFormOpen} onOpenChange={setIsFormOpen} school={editing} />
      ) : null}
    </Container>
  );
}
