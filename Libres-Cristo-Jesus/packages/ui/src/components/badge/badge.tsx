import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/cn';

/**
 * Badge — a status token, not a button.
 *
 * Every variant pairs a `-50` tint with a `-700` text so the label clears
 * WCAG AA (doc18 §27) at caption size; the saturated `-500`/`-600` steps are
 * deliberately left to buttons and charts, where they carry weight, so a
 * badge never competes with a real action for attention.
 */
export const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1 rounded-full font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-neutral-100 text-neutral-700',
        primary: 'bg-primary-50 text-primary-700',
        success: 'bg-success-50 text-success-700',
        warning: 'bg-warning-50 text-warning-700',
        error: 'bg-error-50 text-error-700',
        info: 'bg-info-50 text-info-700',
        gold: 'bg-gold-50 text-gold-700',
      },
      size: {
        sm: 'px-2 py-1 text-caption',
        md: 'px-3 py-1 text-small',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'sm',
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, size, ...props },
  ref,
) {
  // A `<span>`, never a `<div>`: badges are almost always inline with text,
  // and the colour alone carries no meaning to assistive tech — the label
  // inside must state the status in words (WCAG 1.4.1).
  return <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />;
});
