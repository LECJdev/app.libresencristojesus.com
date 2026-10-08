'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { buttonVariants } from './button';

/**
 * IconButton — the square, label-less form of `Button`.
 *
 * It reuses `buttonVariants` for colour/state so doc18 §10's "exactly three
 * variants" rule cannot drift between the two components; only the geometry
 * (square, no horizontal padding) is overridden here.
 */
const iconButtonSizeVariants = cva('', {
  variants: {
    size: {
      // doc25: 44px is the comfortable-touch floor on mobile, and an
      // icon-only target has no adjacent text to widen its hit area — so
      // `md` and `lg` are square at or above that floor.
      sm: 'size-10',
      md: 'size-11',
      lg: 'size-12',
    },
  },
  defaultVariants: { size: 'md' },
});

type IconButtonSize = NonNullable<VariantProps<typeof iconButtonSizeVariants>['size']>;

const ICON_SIZE_FOR_BUTTON: Record<IconButtonSize, 'sm' | 'md'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

export interface IconButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'>,
    VariantProps<typeof iconButtonSizeVariants> {
  /** The glyph to render. Purely decorative — `aria-label` names the action. */
  icon: LucideIcon;
  /**
   * doc18 §27 (ARIA on every button): an icon-only control has no accessible
   * name of its own, so this is REQUIRED by the type — not optional. Write it
   * in Spanish and describe the action, e.g. "Eliminar asistente".
   */
  'aria-label': string;
  variant?: NonNullable<VariantProps<typeof buttonVariants>['variant']>;
  asChild?: boolean;
  loading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    className,
    icon,
    variant = 'primary',
    size,
    asChild = false,
    loading = false,
    disabled,
    type,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : 'button';
  const isDisabled = disabled === true || loading;
  const resolvedSize: IconButtonSize = size ?? 'md';

  return (
    <Component
      ref={ref}
      className={cn(
        buttonVariants({ variant, size: resolvedSize }),
        // Cancels the text button's horizontal padding: a square target must
        // stay square, so width comes from the size variant alone.
        'px-0',
        iconButtonSizeVariants({ size: resolvedSize }),
        className,
      )}
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      type={asChild ? type : (type ?? 'button')}
      {...props}
    >
      <Icon
        icon={loading ? Loader2 : icon}
        size={ICON_SIZE_FOR_BUTTON[resolvedSize]}
        className={cn(loading && 'animate-spin')}
      />
    </Component>
  );
});
