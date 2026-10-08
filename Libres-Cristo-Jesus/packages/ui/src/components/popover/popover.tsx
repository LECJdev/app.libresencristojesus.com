'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '../../lib/cn';

/**
 * Popover — anchored dropdown mechanics only (open/close, outside click,
 * Escape, focus-back-to-trigger). Content-agnostic on purpose.
 *
 * Neither existing overlay fits an anchored menu: `<Modal>` is reserved for
 * confirmations and short decisions (doc18 §17, capped at `lg`, always
 * centred/full-scrim), and `<Drawer>` is the home for real forms and detail
 * panes (doc18 §18, slides in from an edge). A notifications panel or a
 * profile menu anchored to a header icon is neither — hence this third,
 * smaller primitive. No new dependency: it is plain React state plus two
 * `document` listeners, the same trick `<AppShell>` already used for the
 * mobile drawer's outside-tap dismissal.
 */
interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext(component: string): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <Popover>.`);
  }
  return ctx;
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Popover({ open, onOpenChange, children, className }: PopoverProps) {
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
        // Escape must return focus to the control that opened the panel —
        // otherwise a keyboard user closes it and loses their place.
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <PopoverContext.Provider
      value={{ open, setOpen: onOpenChange, contentId, triggerRef, contentRef }}
    >
      <div className={cn('relative', className)}>{children}</div>
    </PopoverContext.Provider>
  );
}

export type PopoverTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PopoverTrigger({ className, children, onClick, ...props }: PopoverTriggerProps) {
  const { open, setOpen, contentId, triggerRef } = usePopoverContext('PopoverTrigger');

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls={contentId}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Which edge the panel hangs from. Defaults to the trigger's right edge. */
  align?: 'start' | 'end';
}

export function PopoverContent({
  align = 'end',
  className,
  children,
  ...props
}: PopoverContentProps) {
  const { open, contentId, contentRef } = usePopoverContext('PopoverContent');

  if (!open) {
    return null;
  }

  return (
    <div
      ref={contentRef}
      id={contentId}
      className={cn(
        'absolute top-full z-40 mt-2 min-w-56 max-w-[85vw] rounded-lg border border-border bg-surface p-2 shadow-lg',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
