'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toast, ToastViewport } from './toast';
import {
  TOAST_DEFAULT_DURATION,
  ToastContext,
  type ToastContextValue,
  type ToastItem,
  type ToastOptions,
} from './use-toast';

export interface ToastProviderProps {
  children: ReactNode;
  /**
   * Auto-dismiss delay in ms applied when a toast does not specify one.
   * doc18 §19 mandates a single system, so the app configures the default
   * here once instead of at every call site.
   */
  duration?: number;
  /**
   * Swipe direction that dismisses a toast on touch devices.
   * `right` matches the tablet/desktop top-right anchor of the viewport.
   */
  swipeDirection?: ToastPrimitive.ToastProviderProps['swipeDirection'];
  /** Hard cap on simultaneously visible toasts; oldest are dropped first. */
  limit?: number;
}

/**
 * Owner of the single application-wide toast queue (doc18 §19).
 *
 * Mount it once, near the root of the app. Screens never render toasts
 * directly — they call `useToast().toast(...)`, which keeps notification
 * styling and stacking identical everywhere.
 */
export function ToastProvider({
  children,
  duration = TOAST_DEFAULT_DURATION,
  swipeDirection = 'right',
  limit = 3,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * Monotonic counter instead of `Math.random()`/`Date.now()`: ids stay
   * deterministic, so React keys never collide when two toasts are
   * enqueued inside the same tick.
   */
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (options: ToastOptions): string => {
      nextId.current += 1;
      const id = `toast-${nextId.current}`;

      setToasts((current) => [...current, { ...options, id }].slice(-limit));

      return id;
    },
    [limit],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, toast, dismiss, dismissAll }),
    [toasts, toast, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider duration={duration} swipeDirection={swipeDirection} label="Aviso">
        {children}

        {toasts.map((item) => (
          <Toast
            key={item.id}
            title={item.title}
            description={item.description}
            variant={item.variant ?? 'info'}
            action={item.action}
            // `Infinity` disables Radix's timer, requiring an explicit close.
            duration={item.duration ?? duration}
            onOpenChange={(open) => {
              // Radix drives the exit animation, then reports `false`; only
              // then is the item removed so the transition is never cut off.
              if (!open) {
                dismiss(item.id);
              }
            }}
          />
        ))}

        <ToastViewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
