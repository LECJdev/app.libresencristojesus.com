import type { LucideIcon } from 'lucide-react';
import { Icon } from '@lcj/ui';

/**
 * One "icon + label + value" line inside a read-only detail Drawer.
 *
 * Shared by every read-only detail Drawer in the organisation module so
 * they don't each grow a slightly different copy of the same row.
 */
export interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  value: string | null;
}

export function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-foreground-muted">
        <Icon icon={icon} size="sm" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-caption text-foreground-muted">{label}</span>
        <span className="text-body text-foreground">{value ?? 'Sin registrar'}</span>
      </div>
    </div>
  );
}
