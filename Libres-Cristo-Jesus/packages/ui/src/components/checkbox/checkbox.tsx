'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Check, Minus } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

/**
 * Checkbox — Radix primitive so the box can be styled while keeping the
 * native semantics (`role="checkbox"`, space to toggle, form participation
 * through a hidden input).
 *
 * doc18 §32: "Al marcar asistencia → transición inmediata del checkbox".
 * `duration-fast` (150ms) is the shortest token available and reads as
 * instant; anything slower would make bulk attendance-taking feel laggy.
 */
export interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {
  /** Visible label, rendered beside the box and wired with `htmlFor`. */
  label?: React.ReactNode;
  /** Secondary line under the label, for the rule behind the option. */
  description?: React.ReactNode;
  /** Class for the outer row. Use `className` for the box itself. */
  containerClassName?: string;
}

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox(
  { className, containerClassName, label, description, id, checked, ...props },
  ref,
) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;

  return (
    <div className={cn('flex items-start gap-3', containerClassName)}>
      <CheckboxPrimitive.Root
        ref={ref}
        id={controlId}
        checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-xs border border-neutral-400 bg-surface',
          'transition-colors duration-fast',
          'data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600',
          'data-[state=indeterminate]:border-primary-600 data-[state=indeterminate]:bg-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
          {/* Indeterminate only ever occurs in controlled use (a "select all"
              header), so reading it off the prop is enough — Radix does not
              expose the state to children any other way. */}
          {checked === 'indeterminate' ? (
            <Icon icon={Minus} size="xs" />
          ) : (
            <Icon icon={Check} size="xs" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {label || description ? (
        // The label sits outside the box so clicking the text toggles too,
        // widening a 20px target into a comfortable one (WCAG 2.5.8).
        <div className="flex flex-col gap-1">
          {label ? (
            <LabelPrimitive.Root
              htmlFor={controlId}
              className="cursor-pointer text-small font-medium"
            >
              {label}
            </LabelPrimitive.Root>
          ) : null}
          {description ? (
            <p id={descriptionId} className="text-caption text-foreground-muted">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
