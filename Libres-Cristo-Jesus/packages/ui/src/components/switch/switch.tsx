'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '../../lib/cn';

/**
 * Switch — for settings that take effect immediately.
 *
 * Use `Checkbox` instead whenever the value is only committed on submit: a
 * switch that needs a "Guardar" click contradicts what its affordance
 * promises. Radix keeps `role="switch"` and space/enter toggling intact.
 */
export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  /** Visible label, wired to the control with `htmlFor`. */
  label?: React.ReactNode;
  /** Secondary line under the label. */
  description?: React.ReactNode;
  /** Class for the outer row. Use `className` for the track itself. */
  containerClassName?: string;
}

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(function Switch({ className, containerClassName, label, description, id, ...props }, ref) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;

  return (
    <div className={cn('flex items-start gap-3', containerClassName)}>
      <SwitchPrimitive.Root
        ref={ref}
        id={controlId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          // 44x24 track with a 20px thumb: the travel distance (translate-x-5)
          // is exactly track width minus borders minus thumb.
          'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
          'transition-colors duration-fast',
          'data-[state=checked]:bg-primary-600 data-[state=unchecked]:bg-neutral-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block size-5 rounded-full bg-surface shadow-sm',
            'transition-transform duration-fast',
            'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
          )}
        />
      </SwitchPrimitive.Root>

      {label || description ? (
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
