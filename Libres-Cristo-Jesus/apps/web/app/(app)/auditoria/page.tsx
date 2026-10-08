import { ScrollText } from 'lucide-react';
import { ModulePlaceholder } from '@/components/layout/module-placeholder';

export default function AuditoriaPage() {
  return (
    <ModulePlaceholder
      icon={ScrollText}
      name="Auditoría"
      summary="Expondrá la bitácora de acciones registrada por el backend: quién hizo qué, sobre qué entidad y cuándo."
    />
  );
}
