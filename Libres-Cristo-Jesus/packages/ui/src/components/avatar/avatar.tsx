'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/cn';

/**
 * Avatar — Radix primitive, chosen for its loading state machine: it only
 * swaps the fallback in once the image is known to have failed, so a slow
 * photo does not flash initials on every render.
 *
 * doc04 §"Fotografías: solo almacenar la ruta del archivo" — the database
 * keeps a path, never a blob, so `src` is an optional plain string and the
 * initials fallback is the normal case, not the error case.
 */
const avatarVariants = cva(
  // `ring-surface` (not a fixed white) so the ring reads correctly whether
  // the avatar sits on a light card or — once the dark theme in
  // `tokens.css` is switched on — a dark one, without a second variant.
  'relative flex shrink-0 overflow-hidden rounded-full bg-primary-100 shadow-sm ring-2 ring-surface select-none',
  {
    variants: {
      size: {
        xs: 'size-6',
        sm: 'size-8',
        md: 'size-10',
        lg: 'size-12',
        xl: 'size-16',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;

/** Initials shrink with the circle so they never overflow it. */
const FALLBACK_TEXT_SIZE: Record<AvatarSize, string> = {
  xs: 'text-caption',
  sm: 'text-caption',
  md: 'text-small',
  lg: 'text-body',
  xl: 'text-h4',
};

export interface AvatarProps
  extends
    Omit<React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, 'children'>,
    VariantProps<typeof avatarVariants> {
  /** Stored file path for the photo (doc04 §15). Omit to show initials. */
  src?: string;
  /** Full name — the source of both the initials and the alt text. */
  name: string;
}

/**
 * Takes the first letter of the first and last name parts, which is what
 * reads as a person in Spanish naming order; middle names are dropped
 * because three letters stop being legible inside a 24px circle.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';

  return `${first}${last}`.toUpperCase();
}

export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(function Avatar({ className, size, src, name, ...props }, ref) {
  const resolvedSize: AvatarSize = size ?? 'md';

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size: resolvedSize }), className)}
      {...props}
    >
      {src ? (
        // `alt` is the person's name, not "avatar": the image *is* the person
        // in a list, so the name is the only useful text alternative.
        <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />
      ) : null}
      <AvatarPrimitive.Fallback
        // `delayMs` avoids the initials flashing before a cached photo paints.
        delayMs={src ? 300 : 0}
        className={cn(
          'flex size-full items-center justify-center font-medium text-primary-800',
          FALLBACK_TEXT_SIZE[resolvedSize],
        )}
      >
        {getInitials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
});
