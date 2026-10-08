'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as React from 'react';

import { cn } from '../../lib/cn';

/**
 * Radio — Radix radio group.
 *
 * The group, not the item, is the accessible unit: Radix gives it
 * `role="radiogroup"` and roving-tabindex arrow navigation, so the whole set
 * is one tab stop (doc18 §27: "Teclado. 100%"). Individual items must
 * therefore always be rendered inside a `RadioGroup`.
 */
export type RadioGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>;

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(function RadioGroup({ className, ...props }, ref) {
  return <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-3', className)} {...props} />;
});

export interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
> {
  /** Visible label, wired to the item with `htmlFor`. */
  label?: React.ReactNode;
  /** Secondary line under the label. */
  description?: React.ReactNode;
  /** Class for the outer row. Use `className` for the dial itself. */
  containerClassName?: string;
}

export const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(function RadioGroupItem(
  { className, containerClassName, label, description, id, ...props },
  ref,
) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;

  return (
    <div className={cn('flex items-start gap-3', containerClassName)}>
      <RadioGroupPrimitive.Item
        ref={ref}
        id={controlId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border border-neutral-400 bg-surface',
          'transition-colors duration-fast',
          'data-[state=checked]:border-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          {/* A plain dot rather than a Lucide glyph: at 8px an icon's stroke
              renders as a smudge, while a filled circle stays crisp. */}
          <span className="size-2 rounded-full bg-primary-600" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>

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
