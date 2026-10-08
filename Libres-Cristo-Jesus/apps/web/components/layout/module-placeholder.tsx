import type { LucideIcon } from 'lucide-react';
import { Container, EmptyState } from '@lcj/ui';

/**
 * Stand-in body for a navigation destination whose module has not been built
 * yet (this is the Frontend Base phase: structure only, no functional
 * modules).
 *
 * These pages exist so the navigation system is actually navigable — a menu
 * where eight of nine entries 404 cannot be exercised, reviewed, or handed to
 * anyone. Each is replaced wholesale by its real module later; nothing here is
 * meant to survive.
 */
export interface ModulePlaceholderProps {
  icon: LucideIcon;
  /** The module's name, e.g. "Distritos". */
  name: string;
  /** One line on what the module will do, so the placeholder still informs. */
  summary: string;
}

export function ModulePlaceholder({ icon, name, summary }: ModulePlaceholderProps) {
  return (
    <Container size="lg">
      <EmptyState
        icon={icon}
        title={`${name} — módulo en construcción`}
        description={`${summary} Esta sección todavía no está implementada: por ahora sólo existe la estructura de navegación y la protección por rol que la resguarda.`}
      />
    </Container>
  );
}
