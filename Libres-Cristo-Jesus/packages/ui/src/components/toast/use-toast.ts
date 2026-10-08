'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Toast contract — doc18 §19: "Un solo sistema".
 *
 * The whole application funnels every notification through this single
 * context. Anything else (a second library, a bespoke banner, `alert()`)
 * is a design-system violation, which is why the state lives here and not
 * inside each screen.
 *
 * VARIANT NOTE (info): doc18 §19 lists Info as "morado", but purple was
 * removed from the system when the palette was re-derived from the actual
 * logo (see the BRAND COLOUR DECISION comment in `styles/tokens.css`).
 * Info therefore renders with the `info-*` scale, which doc18 §3 describes
 * as "azul suave" — the rule is honoured, only the colour name changed.
 */
export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

/** Auto-dismiss delay applied when a caller does not provide one. */
export const TOAST_DEFAULT_DURATION = 5000;

export interface ToastOptions {
  /** Short headline. User-facing, therefore written in Spanish by callers. */
  title: string;
  description?: string;
  /** Defaults to `info`. */
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Pass `Infinity` to require a manual dismiss. */
  duration?: number;
  /** Optional inline action, e.g. a "Reintentar" button (doc18 §22). */
  action?: ReactNode;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastContextValue {
  /** Currently queued toasts, oldest first. */
  toasts: ToastItem[];
  /** Enqueues a toast and returns its id so callers can dismiss it early. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Access the app-wide toast queue. Throws when used outside the provider so
 * a missing `<ToastProvider>` fails loudly in development instead of
 * silently swallowing notifications.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }

  return context;
}
