'use client';

import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

/**
 * doc18 §10: EXACTLY three button variants — primary, secondary, ghost —
 * and "nunca más de tres estilos". The union below is the enforcement
 * mechanism: adding a fourth style means editing this file on purpose,
 * not sprinkling a one-off `className` at a call site.
 *
 * doc18 §35 forbids "crear un botón diferente", so every clickable action in
 * the product routes through here (or through `IconButton`, its square twin).
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
    'transition-colors duration-fast',
    // doc18 §27: focus must always be visible. The global `:focus-visible`
    // outline in tokens.css is replaced (not merely stacked on) by a ring so
    // the indicator follows the button's rounded corners instead of boxing it.
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    // `aria-disabled:` mirrors `disabled:` for the `asChild` case, where the
    // rendered element (usually an anchor) has no `:disabled` pseudo-class.
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary:
          'border border-primary-600 bg-surface text-primary-700 hover:bg-primary-50 active:bg-primary-100',
        ghost: 'bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100',
      },
      size: {
        // doc25 §"Botones mínimos de 44 px de alto": `md` and `lg` clear the
        // 44px comfortable-touch floor on mobile. `sm` (40px) exists only for
        // dense desktop toolbars, where pointer precision is not the issue.
        sm: 'h-10 px-3 text-small',
        md: 'h-11 px-4 text-body',
        lg: 'h-12 px-6 text-body',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /**
   * Renders the caller's child element instead of a `<button>`, forwarding
   * every style and prop onto it. Needed so a Next.js `<Link>` can look like
   * a button without nesting an `<a>` inside a `<button>` (invalid markup).
   */
  asChild?: boolean;
  /** doc18 §10: shows a spinner and blocks interaction while an action runs. */
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
}

/** Icons stay one step below the label so they never outweigh the text. */
const ICON_SIZE_FOR_BUTTON = {
  sm: 'xs',
  md: 'sm',
  lg: 'sm',
} as const;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    type,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : 'button';
  const iconSize = ICON_SIZE_FOR_BUTTON[size ?? 'md'];
  // A loading button must also be a disabled button: otherwise a double click
  // fires the same mutation twice while the first request is still open.
  const isDisabled = disabled === true || loading;

  return (
    <Component
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      // `disabled` is only valid on real form controls. With `asChild` the
      // rendered element is usually an anchor, where the attribute would be
      // ignored by browsers and dropped by React — `aria-disabled` is what
      // carries the state there, so keyboard users are still told it is off.
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={isDisabled || undefined}
      // `aria-busy` is what tells assistive tech the control is working;
      // the visual spinner alone communicates nothing to a screen reader.
      aria-busy={loading || undefined}
      // Buttons default to `submit` inside a form, which silently submits it.
      // Defaulting to `button` makes that opt-in instead of a surprise.
      type={asChild ? type : (type ?? 'button')}
      {...props}
    >
      {loading ? <Icon icon={Loader2} size={iconSize} className="animate-spin" /> : null}
      {!loading && leftIcon ? <Icon icon={leftIcon} size={iconSize} /> : null}
      {/*
        `Slottable` marks which child the `asChild` element replaces, so the
        icons above and below are moved *inside* it. Without it, Slot receives
        four children (two of them `null`) and `React.Children.only` throws
        "Slot failed to slot onto its children" — i.e. `asChild` crashed for
        every caller, even one passing no icons at all, because the nulls are
        still children. It is inert when `Component` is a plain `button`.
      */}
      <Slottable>{children}</Slottable>
      {rightIcon ? <Icon icon={rightIcon} size={iconSize} /> : null}
    </Component>
  );
});
