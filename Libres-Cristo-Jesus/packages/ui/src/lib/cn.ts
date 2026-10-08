import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The type scale from `tokens.css` (doc18 §4), named for `tailwind-merge`.
 *
 * ── Why this list has to exist ───────────────────────────────────────
 * `tailwind-merge` resolves conflicts by classifying each utility into a
 * group. It ships knowing Tailwind's OWN scale (`text-sm`, `text-lg`), but
 * `text-body` and `text-h3` are ours — so it fell back to reading them as
 * `text-{color}`, decided they conflicted with a real colour, and kept the
 * last one.
 *
 * THE CONSEQUENCE WAS A REAL ACCESSIBILITY DEFECT. Every primary button
 * composes `text-white` (from the variant) followed by `text-body` (from
 * the size), so `text-white` was silently dropped from EVERY primary button
 * in the product. They rendered with the body's dark ink on medium blue —
 * 3.85:1, under the 4.5:1 that WCAG AA requires. It was like that from
 * Phase 3 and nothing ever failed: the classes were all present in the
 * source, the merge just removed one of them.
 *
 * Found by running axe against the production build, not by reading code.
 */
const FONT_SIZE_TOKENS = ['display', 'h1', 'h2', 'h3', 'h4', 'body', 'small', 'caption'] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Declaring them as font sizes is what stops them being read as
      // colours. KEEP IN STEP with the `--text-*` tokens in `tokens.css`: a
      // size added there and forgotten here silently eats a text colour.
      'font-size': [{ text: [...FONT_SIZE_TOKENS] }],
    },
  },
});

/**
 * Merges Tailwind classes so a caller-supplied `className` always wins over
 * a component's own defaults (`twMerge` de-duplicates conflicting
 * utilities), while still accepting conditional/array/object forms
 * (`clsx`). Every component in this package composes its classes through
 * `cn` — never through raw template strings — so variants stay overridable.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
