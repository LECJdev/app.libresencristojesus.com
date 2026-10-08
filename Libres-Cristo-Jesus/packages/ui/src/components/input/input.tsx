'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

/**
 * Input — doc18 §11.
 *
 * "Todos los formularios deberán compartir el mismo componente", and that
 * component owns Label + control + Helper + Error as one unit. The shared
 * pieces below (`fieldControlVariants`, `FieldShell`, `useFormFieldIds`) are
 * exported so `Textarea` and `Select` render a byte-identical box and an
 * identical label/helper/error block instead of re-deriving them — doc18 §12
 * ("mismo estilo") is only true if there is literally one implementation.
 */

/* ------------------------------------------------------------------ *
 * Shared form-field foundation
 * ------------------------------------------------------------------ */

export interface FormFieldProps {
  label?: string;
  /** Guidance shown under the control. Hidden while an error is present. */
  helperText?: string;
  /** doc18 §16: rendered BELOW the control, never beside it. */
  error?: string;
  /** doc18 §16: marks the label with `*` and sets `aria-required`. */
  required?: boolean;
}

export interface FormFieldIds {
  controlId: string;
  helperId: string;
  errorId: string;
  /** Ready to spread onto the control; `undefined` when there is nothing to point at. */
  describedBy: string | undefined;
}

/**
 * Derives the id trio a field needs. `useId` is the source so two instances
 * of the same field on one page never collide — hand-rolled counters break
 * under React's streaming/hydration, `useId` does not.
 */
export function useFormFieldIds(
  providedId: string | undefined,
  messages: Pick<FormFieldProps, 'helperText' | 'error'>,
): FormFieldIds {
  const generatedId = React.useId();
  const controlId = providedId ?? generatedId;
  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;

  return {
    controlId,
    helperId,
    errorId,
    // Only one message is rendered at a time, so only one may be announced;
    // pointing at a hidden node would read stale guidance to a screen reader.
    describedBy: messages.error ? errorId : messages.helperText ? helperId : undefined,
  };
}

/** The control box itself — reused verbatim by Textarea and the Select trigger. */
export const fieldControlVariants = cva(
  [
    'flex w-full rounded-md border bg-surface text-body',
    'transition-colors duration-fast placeholder:text-foreground-muted',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70',
  ],
  {
    variants: {
      invalid: {
        // Colour is never the only error signal: the message below the field
        // carries the meaning (WCAG 1.4.1), this just reinforces it.
        true: 'border-error-500 focus-visible:ring-error-500',
        false: 'border-border hover:border-neutral-400',
      },
    },
    defaultVariants: { invalid: false },
  },
);

export type FieldControlVariantProps = VariantProps<typeof fieldControlVariants>;

export interface FieldShellProps
  extends FormFieldProps, Pick<FormFieldIds, 'helperId' | 'errorId'> {
  controlId: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + helper/error, in the single order doc18 §11 prescribes. */
export function FieldShell({
  label,
  helperText,
  error,
  required = false,
  controlId,
  helperId,
  errorId,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {label ? (
        <LabelPrimitive.Root htmlFor={controlId} className="text-small font-medium">
          {label}
          {required ? (
            // Decorative: `aria-required` on the control is what assistive
            // tech announces, so the glyph must not be read out twice.
            <span aria-hidden="true" className="ml-1 text-error-600">
              *
            </span>
          ) : null}
        </LabelPrimitive.Root>
      ) : null}

      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-caption text-error-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-caption text-foreground-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Input
 * ------------------------------------------------------------------ */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'required'>, FormFieldProps {
  leftIcon?: LucideIcon;
  /** Decorative trailing glyph. Use `rightAdornment` for anything clickable. */
  rightIcon?: LucideIcon;
  /**
   * Interactive trailing control (e.g. the `PasswordInput` visibility toggle).
   * Kept separate from `rightIcon` because that slot is `pointer-events-none`
   * on purpose — a decorative glyph must never steal the field's click.
   */
  rightAdornment?: React.ReactNode;
  /** Wrapper class. Use `className` for the `<input>` itself. */
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    containerClassName,
    label,
    helperText,
    error,
    required = false,
    leftIcon,
    rightIcon,
    rightAdornment,
    id,
    type = 'text',
    ...props
  },
  ref,
) {
  const { controlId, helperId, errorId, describedBy } = useFormFieldIds(id, { helperText, error });
  const hasError = Boolean(error);

  return (
    <FieldShell
      label={label}
      helperText={helperText}
      error={error}
      required={required}
      controlId={controlId}
      helperId={helperId}
      errorId={errorId}
      className={containerClassName}
    >
      <div className="relative flex w-full items-center">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 flex text-foreground-muted">
            <Icon icon={leftIcon} size="sm" />
          </span>
        ) : null}

        <input
          ref={ref}
          id={controlId}
          type={type}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            fieldControlVariants({ invalid: hasError }),
            // h-11 keeps the field on the same 44px touch floor as `Button`.
            'h-11 px-4',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            rightAdornment && 'pr-12',
            className,
          )}
          {...props}
        />

        {rightAdornment ? (
          <span className="absolute right-2 flex items-center">{rightAdornment}</span>
        ) : rightIcon ? (
          <span className="pointer-events-none absolute right-3 flex text-foreground-muted">
            <Icon icon={rightIcon} size="sm" />
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
});
