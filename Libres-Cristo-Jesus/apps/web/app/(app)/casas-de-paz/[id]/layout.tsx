import type { Metadata } from 'next';

/**
 * Metadata for this route.
 *
 * A layout and not the page itself because the page is a client component
 * (it needs `useParams`/hooks), and `export const metadata` only works in a
 * server component.
 */
export const metadata: Metadata = {
  title: 'Casa de Paz',
  description: 'Detalle completo de una Casa de Paz: liderazgo, información y asistencia.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
