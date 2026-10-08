'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

/**
 * Drawer — doc18 §18. This is the home for the heavy surfaces:
 * "Detalle Persona / Detalle Casa / Detalle Distrito / Detalle Reunión",
 * plus every large form that doc18 §17 explicitly bans from a Modal.
 *
 * Built on the same Radix Dialog primitive as `<Modal>` — same focus trap,
 * same Escape/outside-click dismissal, same portal — differing only in
 * placement, so the two never diverge in accessibility behaviour.
 *
 * `side="bottom"` is the mobile-first option (a bottom sheet); on phones
 * every side occupies the full width (`w-full`), and the max-width caps
 * only kick in from the `sm` breakpoint up.
 */
const drawerContentVariants = cva(
  [
    'pointer-events-auto fixed z-50 flex flex-col gap-4',
    'border-border bg-surface p-6 shadow-xl',
    // doc18 §25: only 150/250/300 ms. The slide uses `duration-base`.
    'transition-transform duration-base',
    'data-[state=open]:translate-x-0 data-[state=open]:translate-y-0',
  ],
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-full border-l data-[state=closed]:translate-x-full',
        left: 'inset-y-0 left-0 h-full w-full border-r data-[state=closed]:-translate-x-full',
        bottom:
          'inset-x-0 bottom-0 max-h-full w-full rounded-t-lg border-t data-[state=closed]:translate-y-full',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    compoundVariants: [
      // Width caps apply to lateral drawers only; a bottom sheet always
      // spans the full width regardless of size.
      { side: ['left', 'right'], size: 'sm', class: 'sm:max-w-sm' },
      { side: ['left', 'right'], size: 'md', class: 'sm:max-w-md' },
      { side: ['left', 'right'], size: 'lg', class: 'sm:max-w-2xl' },
    ],
    defaultVariants: {
      side: 'right',
      size: 'md',
    },
  },
);

export type DrawerSide = 'right' | 'left' | 'bottom';

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;
export const DrawerPortal = DialogPrimitive.Portal;

export interface DrawerContentProps
  extends
    ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof drawerContentVariants> {
  side?: DrawerSide;
  showCloseButton?: boolean;
  children: ReactNode;
}

export function DrawerContent({
  className,
  side = 'right',
  size,
  showCloseButton = true,
  children,
  ...props
}: DrawerContentProps) {
  return (
    <DrawerPortal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-overlay',
          'transition-opacity duration-base',
          'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
        )}
      />
      <DialogPrimitive.Content
        className={cn(drawerContentVariants({ side, size }), className)}
        {...props}
      >
        {children}

        {showCloseButton ? (
          <DialogPrimitive.Close
            aria-label="Cerrar"
            className={cn(
              'absolute right-4 top-4 rounded-xs p-1 text-foreground-muted',
              'transition-colors duration-fast hover:bg-surface-muted hover:text-foreground',
            )}
          >
            <Icon icon={X} size="sm" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DrawerPortal>
  );
}

export type DrawerHeaderProps = ComponentPropsWithoutRef<'div'>;

export function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return <div className={cn('flex shrink-0 flex-col gap-1 pr-8', className)} {...props} />;
}

export type DrawerTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn('text-h4 font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export type DrawerDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

export function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn('text-small text-foreground-muted', className)}
      {...props}
    />
  );
}

export type DrawerBodyProps = ComponentPropsWithoutRef<'div'>;

/**
 * Scroll region. Long forms scroll here while the header and footer stay
 * pinned, so the primary action never scrolls out of reach (doc25 §2).
 */
export function DrawerBody({ className, ...props }: DrawerBodyProps) {
  return (
    <div
      className={cn('-mx-6 min-h-0 flex-1 overflow-y-auto px-6 text-body', className)}
      {...props}
    />
  );
}

export type DrawerFooterProps = ComponentPropsWithoutRef<'div'>;

export function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}
