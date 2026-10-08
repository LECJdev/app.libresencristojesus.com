import * as React from 'react';

import { cn } from '../../lib/cn';

/**
 * Card — doc18 §13.
 *
 * Deliberately shipped as a slot set (`Card` + header/title/description/
 * content/footer) rather than as the three named types the doc lists
 * (MetricCard, InfoCard, ActionCard). Those three are *compositions*, not
 * different visual shells: baking them in as variants would freeze their
 * internals, whereas composing them from these slots keeps one surface,
 * one radius and one border across all of them — which is what §13 is
 * actually protecting.
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * doc18 §32: "Al pasar el cursor sobre tarjetas → elevación sutil".
   * Opt-in, because a static card that lifts on hover promises a click that
   * never happens. Turn it on only when the whole card is actionable.
   *
   * This is the ONE place that decides what "interactive" looks like —
   * every consumer that wants the hover/elevation treatment (`KPICard`,
   * `DomainCard`, …) passes this prop instead of repeating the shadow
   * utilities itself, so the two states never drift apart.
   */
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, interactive = false, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface',
        interactive
          ? [
              // A more present shadow than the static default, because it is
              // the only cue (besides the cursor) that the card is
              // actionable at all. Only the shadow animates: transitioning
              // `transform` here would shift the card under the cursor and
              // re-trigger hover on the edge.
              'shadow-md transition-shadow duration-base hover:shadow-lg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            ]
          : 'shadow-sm',
        className,
      )}
      {...props}
    />
  );
});

export type CardSectionProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(function CardHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('flex flex-col gap-1 p-6', className)} {...props} />;
});

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Heading level. Cards appear at different depths of the page outline, so
   * the level is a prop instead of a hard-coded `<h3>` — a fixed level would
   * break the document outline screen-reader users navigate by.
   */
  as?: 'h2' | 'h3' | 'h4';
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { className, as: Heading = 'h3', ...props },
  ref,
) {
  return <Heading ref={ref} className={cn('text-h4 font-semibold', className)} {...props} />;
});

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('text-small text-foreground-muted', className)} {...props} />;
  },
);

export const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(function CardContent(
  { className, ...props },
  ref,
) {
  // `pt-0` because the header above already owns the vertical rhythm; two
  // stacked paddings would double the gap between title and body.
  return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
});

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />;
});
