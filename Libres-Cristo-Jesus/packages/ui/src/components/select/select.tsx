'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { FieldShell, fieldControlVariants, useFormFieldIds } from '../input/input';
import type { FormFieldProps } from '../input/input';

/**
 * Select — doc18 §12: "Mismo estilo [que] Input. Nunca HTML Select."
 *
 * The native `<select>` is unstylable across browsers and renders an OS-level
 * popup on mobile, which is exactly the inconsistency §12 forbids. Radix gives
 * a real listbox with full keyboard support (type-ahead, Home/End, arrows)
 * while still submitting through a hidden native control inside a `<form>`.
 *
 * The trigger reuses `fieldControlVariants`, so "mismo estilo" is enforced by
 * sharing the class source with `Input`, not by copying it.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends FormFieldProps {
  options: readonly SelectOption[];
  /** Controlled value. Omit (and use `defaultValue`) for uncontrolled use. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Submitted field name when rendered inside a `<form>`. */
  name?: string;
  id?: string;
  /** Class for the trigger. Use `containerClassName` for the whole field. */
  className?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    value,
    defaultValue,
    onValueChange,
    placeholder = 'Seleccione una opción',
    disabled = false,
    name,
    id,
    className,
    containerClassName,
    label,
    helperText,
    error,
    required = false,
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
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        required={required}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={controlId}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            fieldControlVariants({ invalid: hasError }),
            'h-11 items-center justify-between gap-2 px-4 text-left',
            // The placeholder is rendered by Radix inside the trigger, so it
            // cannot be reached with `placeholder:` — target it by data attr.
            'data-[placeholder]:text-foreground-muted',
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <Icon icon={ChevronDown} size="sm" className="text-foreground-muted" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            // `popper` (not the default `item-aligned`) keeps the list anchored
            // under the field instead of overlaying it, which is what makes it
            // read as the same control on a small screen.
            position="popper"
            sideOffset={4}
            className={cn(
              'relative z-50 max-h-64 min-w-32 overflow-hidden',
              'rounded-md border border-border bg-surface shadow-lg',
            )}
          >
            <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-foreground-muted">
              <Icon icon={ChevronUp} size="xs" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="w-full min-w-(--radix-select-trigger-width) p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center',
                    'rounded-sm py-2 pl-3 pr-9 text-body outline-none',
                    'data-[highlighted]:bg-primary-50 data-[highlighted]:text-primary-700',
                    'data-[state=checked]:font-medium',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3 flex items-center text-primary-600">
                    <Icon icon={Check} size="xs" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-foreground-muted">
              <Icon icon={ChevronDown} size="xs" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </FieldShell>
  );
});
