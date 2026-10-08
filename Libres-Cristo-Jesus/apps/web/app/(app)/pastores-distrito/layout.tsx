import type { Metadata } from 'next';

/**
 * Metadata for this route.
 *
 * A layout and not the page itself because every screen here is a client
 * component, and `export const metadata` only works in a server component.
 * Without this the tab reads just "LCJ Connect" on every route, which makes a
 * second window impossible to tell apart.
 */
export const metadata: Metadata = {
  title: 'Pastores de Distrito',
  description: 'Cuentas de liderazgo de los Distritos.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
