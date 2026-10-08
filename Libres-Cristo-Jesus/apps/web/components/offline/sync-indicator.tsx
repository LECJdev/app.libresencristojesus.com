'use client';

import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { Badge, Button, Icon, cn } from '@lcj/ui';
import type { SyncQueueStatus } from '@lcj/types';
import { useSync } from '@/hooks/use-sync';

/**
 * Indicador del estado de sincronización (Regla 8).
 *
 * "El usuario deberá conocer siempre el estado de sus datos." El caso que
 * esto evita es concreto: un líder registra la asistencia sin señal, ve la
 * pantalla actualizada, cierra la aplicación y asume que quedó guardada en
 * el servidor. Sin este indicador no tiene forma de distinguir "está en mi
 * teléfono" de "está en el sistema".
 *
 * SILENCIOSO CUANDO NO HAY NADA QUE DECIR. Con la cola vacía y sin
 * conflictos no se muestra nada: un cartel permanente de "todo bien" se
 * vuelve invisible y arruina la señal cuando de verdad importa.
 */

interface Appearance {
  label: string;
  icon: typeof CloudOff;
  className: string;
}

function describe(status: SyncQueueStatus, pending: number, conflicts: number): Appearance | null {
  switch (status) {
    case 'pending':
      return {
        label:
          pending === 1
            ? '1 cambio pendiente de sincronizar'
            : `${pending} cambios pendientes de sincronizar`,
        icon: CloudOff,
        className: 'border-warning-500 bg-warning-50 text-warning-700',
      };
    case 'syncing':
      return {
        label: 'Sincronizando…',
        icon: RefreshCw,
        className: 'border-info-500 bg-info-50 text-info-700',
      };
    case 'synced':
      return {
        label: 'Todo sincronizado',
        icon: CheckCircle2,
        className: 'border-success-500 bg-success-50 text-success-700',
      };
    case 'error':
      return {
        label:
          pending === 1
            ? 'No se pudo sincronizar 1 cambio. Se reintentará al recuperar la conexión.'
            : `No se pudieron sincronizar ${pending} cambios. Se reintentarán al recuperar la conexión.`,
        icon: AlertTriangle,
        className: 'border-error-500 bg-error-50 text-error-600',
      };
    case 'conflict':
      return {
        label:
          conflicts === 1
            ? '1 cambio necesita su revisión'
            : `${conflicts} cambios necesitan su revisión`,
        icon: TriangleAlert,
        className: 'border-error-500 bg-error-50 text-error-600',
      };
    default:
      return null;
  }
}

export function SyncIndicator() {
  const { status, pending, conflicts, messages, sync } = useSync();

  const appearance = describe(status, pending, conflicts);

  if (!appearance) {
    return null;
  }

  const canRetry = status === 'error' || status === 'pending';

  return (
    <div
      // `status` y no `alert`: se anuncia sin interrumpir lo que el usuario
      // esté haciendo. Un lector de pantalla que corta la lectura de la lista
      // de asistencia para avisar de una sincronización es peor que el
      // silencio.
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 text-small',
        appearance.className,
      )}
    >
      <Icon
        icon={appearance.icon}
        size="xs"
        className={status === 'syncing' ? 'animate-spin' : undefined}
      />
      <span className="min-w-0 flex-1">{appearance.label}</span>

      {conflicts > 0 ? <Badge variant="error">Requiere decisión</Badge> : null}

      {canRetry ? (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={RefreshCw}
          onClick={() => {
            void sync();
          }}
        >
          Reintentar
        </Button>
      ) : null}

      {/*
        Los mensajes del servidor se muestran completos, no resumidos: cuando
        una operación se rechaza por semana cerrada, ese texto es lo único que
        le dice al líder qué pasó con el trabajo que ya había hecho y qué debe
        hacer ahora (pedir el desbloqueo al Pastor de Distrito).
      */}
      {messages.length > 0 ? (
        <ul className="w-full list-disc space-y-1 pl-5">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
