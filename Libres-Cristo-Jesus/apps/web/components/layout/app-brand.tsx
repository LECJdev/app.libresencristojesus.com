import Image from 'next/image';
import { cn } from '@lcj/ui';

/**
 * The institutional mark: the official badge from `Banco-imagenes/Logo.jpg`
 * (ring + gold cross + "LIBRES EN CRISTO JESÚS" wordmark), copied verbatim
 * to `public/logo.jpg` — replaces the earlier hand-drawn house+cross SVG
 * placeholder everywhere it appeared.
 *
 * The source file is a square JPG with a white backdrop behind the circular
 * badge. `rounded-full overflow-hidden` crops that backdrop away to the
 * circle the badge already inscribes; the white ring/padding underneath is
 * kept deliberately (rather than dropping the logo directly onto the dark
 * sidebar) because the badge's own blue ring and gold cross lose contrast
 * against `primary-900` without it — this is the "sutil contenedor blanco"
 * called for on a dark surface, and it costs nothing on a light one.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      <Image
        src="/logo.jpg"
        alt="Libres en Cristo Jesús"
        fill
        sizes="64px"
        className="rounded-full object-cover"
        priority
      />
    </span>
  );
}

export interface AppBrandProps {
  /** Hides the wordmark, leaving the mark alone — for the collapsed rail. */
  markOnly?: boolean;
  className?: string;
}

/**
 * Mark + wordmark, stacked, for the top of the sidebar. The wordmark is
 * hidden below `desktop` because the sidebar is an icon-only rail there and
 * a truncated line would read as a glitch.
 */
export function AppBrand({ markOnly = false, className }: AppBrandProps) {
  return (
    <span className={cn('flex flex-col items-center gap-2 text-center', className)}>
      <BrandMark className="size-12 desktop:size-14" />
      {markOnly ? null : (
        <span className="hidden flex-col gap-0.5 desktop:flex">
          <span className="text-caption font-semibold uppercase leading-tight tracking-wide text-white">
            Libres en Cristo Jesús
          </span>
          <span className="text-caption leading-tight text-primary-200">
            Gestión de Casas de Paz
          </span>
        </span>
      )}
    </span>
  );
}
