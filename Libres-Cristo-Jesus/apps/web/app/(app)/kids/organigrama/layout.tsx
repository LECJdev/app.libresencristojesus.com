import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Organigrama Escuela Kids',
  description: 'Estructura de Escuela Kids: sedes, líderes y auxiliares.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
