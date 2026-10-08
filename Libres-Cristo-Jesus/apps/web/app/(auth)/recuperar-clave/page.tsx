import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { Button, EmptyState } from '@lcj/ui';
import { LOGIN_ROUTE } from '@/lib/navigation';

/**
 * Placeholder for the password-recovery flow.
 *
 * The "¿Olvidó su contraseña?" link is part of the doc17 login wireframe, so
 * it is rendered — but the flow behind it is not part of the Frontend Base
 * phase and has no backend endpoint yet. This page exists so the documented
 * link lands somewhere honest instead of on a 404.
 */
export default function PasswordRecoveryPage() {
  return (
    <div className="w-full max-w-md">
      <EmptyState
        icon={KeyRound}
        title="Recuperación de contraseña no disponible"
        description="Esta funcionalidad todavía no está habilitada. Por ahora, solicite el restablecimiento de su contraseña al administrador del sistema."
        action={
          <Button asChild variant="secondary">
            <Link href={LOGIN_ROUTE}>Volver al inicio de sesión</Link>
          </Button>
        }
      />
    </div>
  );
}
