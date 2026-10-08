'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

/**
 * Modal — doc18 §17: "Pequeñas acciones. […] Nunca formularios largos en
 * Modal."
 *
 * SCOPE RULE (enforced by convention, not by types): use a Modal only for
 * confirmations, single-field edits and short decisions. Anything that is a
 * real form — creating a Casa de Paz, registering a Persona, reporting a
 * Reunión — belongs in `<Drawer>` (doc18 §18), which is why this component
 * caps out at `lg` and never offers a full-screen size.
 *
 * Escape and outside-click both close the dialog: that is Radix's default
 * behaviour and is intentionally left untouched (doc18 §27, keyboard 100%).
 */
const modalContentVariants = cva(
  [
    // Sizing is expressed only with scale utilities — no arbitrary values,
    // per doc18 §28 ("nunca valores quemados"). The centring/padding lives
    // on the positioning wrapper below, which is what bounds `max-h-full`.
    'pointer-events-auto relative flex max-h-full w-full flex-col gap-4',
    'rounded-lg border border-border bg-surface p-6 shadow-xl',
    'transition-opacity duration-base',
    'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
  ],
  {
    variants: {
      size: {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;
export const ModalPortal = DialogPrimitive.Portal;

export interface ModalContentProps
  extends
    ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof modalContentVariants> {
  /** Renders the top-right dismiss button. Disable for forced decisions. */
  showCloseButton?: boolean;
  children: ReactNode;
}

export function ModalContent({
  className,
  size,
  showCloseButton = true,
  children,
  ...props
}: ModalContentProps) {
  return (
    <ModalPortal>
      {/* Scrim uses the `overlay` semantic token so a future dark theme is a
          pure token swap (doc18 §28 / §34). */}
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-overlay',
          'transition-opacity duration-base',
          'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
        )}
      />
      {/* `pointer-events-none` lets an outside click fall through to the
          overlay, so Radix's dismiss-on-outside-click keeps working while
          the wrapper still supplies centring and the mobile gutter. */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogPrimitive.Content
          className={cn(modalContentVariants({ size }), className)}
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
      </div>
    </ModalPortal>
  );
}

export type ModalHeaderProps = ComponentPropsWithoutRef<'div'>;

export function ModalHeader({ className, ...props }: ModalHeaderProps) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />;
}

export type ModalTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

export function ModalTitle({ className, ...props }: ModalTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn('text-h4 font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export type ModalDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

export function ModalDescription({ className, ...props }: ModalDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn('text-small text-foreground-muted', className)}
      {...props}
    />
  );
}

export type ModalBodyProps = ComponentPropsWithoutRef<'div'>;

export function ModalBody({ className, ...props }: ModalBodyProps) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto text-body', className)} {...props} />;
}

export type ModalFooterProps = ComponentPropsWithoutRef<'div'>;

/**
 * Actions stack on mobile and align right from `sm` up, so the primary
 * action always sits under the thumb on a phone (doc25 §2).
 */
export function ModalFooter({ className, ...props }: ModalFooterProps) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
