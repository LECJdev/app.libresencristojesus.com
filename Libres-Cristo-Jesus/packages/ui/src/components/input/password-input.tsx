'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

import { IconButton } from '../button/icon-button';
import { Input, type InputProps } from './input';

/**
 * PasswordInput — `Input` plus a show/hide toggle.
 *
 * It composes `Input` rather than re-implementing the field so the label,
 * helper and error blocks stay governed by doc18 §11's single component.
 *
 * The toggle is a real, tabbable button (doc18 §27: "Teclado. 100%"), not a
 * decorative glyph — a sighted keyboard user must be able to reveal what
 * they typed without a mouse.
 */
export interface PasswordInputProps extends Omit<
  InputProps,
  'type' | 'rightIcon' | 'rightAdornment'
> {
  /** Toggle label while the password is masked. */
  showPasswordLabel?: string;
  /** Toggle label while the password is visible. */
  hidePasswordLabel?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      showPasswordLabel = 'Mostrar contraseña',
      hidePasswordLabel = 'Ocultar contraseña',
      ...props
    },
    ref,
  ) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <Input
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        rightAdornment={
          <IconButton
            icon={isVisible ? EyeOff : Eye}
            variant="ghost"
            size="sm"
            // The label describes the *action*, and flips with the state, so
            // a screen reader never offers to "show" an already-shown value.
            aria-label={isVisible ? hidePasswordLabel : showPasswordLabel}
            aria-pressed={isVisible}
            onClick={() => {
              setIsVisible((previous) => !previous);
            }}
          />
        }
        {...props}
      />
    );
  },
);
