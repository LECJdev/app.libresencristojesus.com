import type { Metadata } from 'next';
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button, EmptyState } from '@lcj/ui';
import { DEFAULT_AUTHENTICATED_ROUTE } from '@/lib/navigation';

export const metadata: Metadata = {
  title: 'Página no encontrada',
};

/**
 * 404. Rendered outside the app shell (Next.js resolves the root `not-found`
 * against the root layout), so it carries its own centring and its own way
 * back — doc18 §21: never a dead end.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <EmptyState
        icon={FileQuestion}
        title="Página no encontrada"
        description="La dirección que intenta abrir no existe o fue movida."
        action={
          <Button asChild variant="secondary">
            <Link href={DEFAULT_AUTHENTICATED_ROUTE}>Volver al Dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
