'use client';

import * as React from 'react';

import { cn } from '../../lib/cn';
import { FieldShell, fieldControlVariants, useFormFieldIds } from '../input/input';
import type { FormFieldProps } from '../input/input';

/**
 * Textarea — the multi-line member of the doc18 §11 field family.
 *
 * It reuses `fieldControlVariants` and `FieldShell` from `Input` on purpose:
 * "todos los formularios deberán compartir el mismo componente" only holds if
 * the box and the label/helper/error block have a single implementation, not
 * two that happen to look alike today.
 */
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'>, FormFieldProps {
  /** Wrapper class. Use `className` for the `<textarea>` itself. */
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    className,
    containerClassName,
    label,
    helperText,
    error,
    required = false,
    id,
    rows = 4,
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
      <textarea
        ref={ref}
        id={controlId}
        rows={rows}
        required={required}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={cn(
          fieldControlVariants({ invalid: hasError }),
          // `min-h` rather than a fixed height so browser resizing still
          // works, and `resize-y` so a user can never break the layout
          // horizontally by dragging the handle sideways.
          'min-h-24 resize-y px-4 py-3',
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
});
