import type { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from './cn';

/**
 * Icon system (doc18 §9): Lucide React is the ONLY icon library — never mix
 * families — and icons render at exactly four sizes (16/20/24/32).
 *
 * Wrapping Lucide rather than using its components directly is what makes
 * that enforceable: `size` is a closed union here, so an arbitrary
 * `size={19}` is a type error instead of silent visual drift.
 */
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

export interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  /** The Lucide icon to render, e.g. `import { Users } from 'lucide-react'`. */
  icon: LucideIcon;
  /** doc18 §9 — 16 / 20 / 24 / 32 only. Defaults to `md` (24). */
  size?: IconSize;
}

export function Icon({ icon: LucideGlyph, size = 'md', className, ...props }: IconProps) {
  return (
    <LucideGlyph
      size={ICON_SIZES[size]}
      className={cn('shrink-0', className)}
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    />
  );
}
