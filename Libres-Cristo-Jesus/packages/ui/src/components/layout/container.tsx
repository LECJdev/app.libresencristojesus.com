'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * Container — the horizontal frame every page content area sits in
 * (doc18 §6, doc18 §30).
 *
 * Padding steps through the documented 8 px spacing scale (16 → 24 → 32 px)
 * at the `tablet` and `desktop` breakpoints defined in `styles/tokens.css`,
 * so gutters widen with the viewport instead of being fixed per screen.
 */
const containerVariants = cva('mx-auto w-full min-w-0 px-4 tablet:px-6 desktop:px-8', {
  variants: {
    size: {
      sm: 'max-w-3xl',
      md: 'max-w-5xl',
      lg: 'max-w-7xl',
      /** Edge-to-edge: dashboards and wide tables. */
      full: 'max-w-none',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export interface ContainerProps
  extends ComponentPropsWithoutRef<'div'>, VariantProps<typeof containerVariants> {}

export function Container({ size, className, ...props }: ContainerProps) {
  return <div className={cn(containerVariants({ size }), className)} {...props} />;
}
