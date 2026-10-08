'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import type { ToastVariant } from './use-toast';

/**
 * Visual layer of the single toast system (doc18 §19). It is deliberately
 * presentational: the queue lives in `ToastProvider`, so this component can
 * be rendered in isolation (Storybook, visual tests) without any state.
 *
 * Animation uses `duration-base` (250 ms) only — doc18 §25 allows exactly
 * 150/250/300 ms. The open/close transition is driven by Radix `data-state`
 * attributes rather than an animation plugin, keeping the package free of
 * extra Tailwind dependencies.
 */
const toastVariants = cva(
  [
    'pointer-events-auto relative flex w-full items-start gap-3',
    'rounded-md border p-4 shadow-lg',
    'transition-opacity duration-base',
    'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
    'data-[swipe=end]:opacity-0',
  ],
  {
    variants: {
      variant: {
        // doc18 §19: Success verde / Warning naranja / Error rojo.
        success: 'border-success-500 bg-success-50 text-success-700',
        warning: 'border-warning-500 bg-warning-50 text-warning-700',
        error: 'border-error-500 bg-error-50 text-error-700',
        // Info is blue, not purple — see the note in `use-toast.ts`.
        info: 'border-info-500 bg-info-50 text-info-700',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

/**
 * Icon per variant. Meaning is never carried by colour alone (doc18 §27,
 * WCAG AA): every toast pairs its hue with a distinct glyph.
 */
const TOAST_ICONS = {
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
  info: Info,
} as const;

export interface ToastProps
  extends
    Omit<ComponentPropsWithoutRef<typeof ToastPrimitive.Root>, 'title'>,
    VariantProps<typeof toastVariants> {
  title: string;
  description?: string;
  /** Optional inline action rendered next to the close button. */
  action?: ReactNode;
}

export function Toast({
  variant = 'info',
  title,
  description,
  action,
  className,
  ...props
}: ToastProps) {
  const glyph = TOAST_ICONS[(variant ?? 'info') as ToastVariant];

  return (
    <ToastPrimitive.Root className={cn(toastVariants({ variant }), className)} {...props}>
      <Icon icon={glyph} size="sm" className="mt-0.5" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ToastPrimitive.Title className="text-small font-semibold">{title}</ToastPrimitive.Title>
        {description ? (
          <ToastPrimitive.Description className="text-small opacity-90">
            {description}
          </ToastPrimitive.Description>
        ) : null}
        {action ? <div className="mt-2 flex gap-2">{action}</div> : null}
      </div>

      <ToastPrimitive.Close
        aria-label="Cerrar"
        className={cn(
          'rounded-xs p-1 opacity-70 transition-opacity duration-fast',
          'hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <Icon icon={X} size="xs" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

/**
 * Stacking region for the queue. Bottom-anchored on mobile (thumb reach,
 * doc25 §2 "botones grandes y fáciles de presionar") and top-right from
 * tablet up, where it never covers content.
 */
export function ToastViewport({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'pointer-events-none fixed z-50 flex max-h-screen w-full flex-col gap-3 p-4',
        'bottom-0 left-0 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:max-w-sm',
        className,
      )}
      {...props}
    />
  );
}
