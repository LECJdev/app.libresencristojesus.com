'use client';

import {
  Button,
  EmptyState,
  Loading,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  Toast,
  ToastProvider,
  useToast,
} from '@lcj/ui';
import { Inbox, Plus } from 'lucide-react';

function ToastPlayground() {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="primary"
        onClick={() =>
          toast({ title: 'Guardado', description: 'Los cambios se guardaron.', variant: 'success' })
        }
      >
        Mostrar toast de éxito
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: 'Atención',
            description: 'Revisa los datos ingresados.',
            variant: 'warning',
          })
        }
      >
        Mostrar toast de advertencia
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({
            title: 'Error',
            description: 'No se pudo completar la acción.',
            variant: 'error',
          })
        }
      >
        Mostrar toast de error
      </Button>
      {/* Static example, rendered inline (not via the queue) purely to show
          the visual shape of a toast without waiting on the auto-dismiss. */}
      <div className="mt-3 w-full max-w-sm">
        <Toast
          title="Reunión reportada"
          description="La asistencia quedó registrada."
          variant="info"
        />
      </div>
    </div>
  );
}

export function FeedbackSection() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Toast</h3>
        {/* Self-contained provider: in the real app this mounts once near the root. */}
        <ToastProvider>
          <ToastPlayground />
        </ToastProvider>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Loading</h3>
        <Loading variant="skeleton" lines={2} />
        <Loading variant="spinner" label="Cargando…" />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Skeleton</h3>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <SkeletonCard />
          <SkeletonTable rows={3} columns={4} className="tablet:col-span-2" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">EmptyState</h3>
        <EmptyState
          icon={Inbox}
          title="No existen asistentes"
          description="Registra el primer asistente para esta Casa de Paz."
          action={
            <Button leftIcon={Plus} variant="primary">
              Crear primer asistente
            </Button>
          }
        />
      </div>
    </div>
  );
}
