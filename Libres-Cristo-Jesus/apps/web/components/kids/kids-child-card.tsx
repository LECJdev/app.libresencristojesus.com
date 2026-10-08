'use client';

import { Avatar, Badge, DomainCard, DomainCardMeta } from '@lcj/ui';
import { Cake } from 'lucide-react';
import type { KidsChild } from '@lcj/types';
import { useStoredFilePreview } from '@/hooks/use-file-upload';

export interface KidsChildCardProps {
  child: KidsChild;
  onClick: () => void;
}

export function KidsChildCard({ child, onClick }: KidsChildCardProps) {
  const photo = useStoredFilePreview(child.photo);
  const fullName = `${child.firstName} ${child.lastName}`.trim();

  return (
    <DomainCard onClick={onClick}>
      <div className="flex items-start gap-3">
        <Avatar src={photo ?? undefined} name={fullName} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-body font-semibold text-foreground">{fullName}</h3>
          <div className="flex">
            <Badge variant={child.status === 'ACTIVE' ? 'success' : 'neutral'}>
              {child.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>
      </div>

      <DomainCardMeta icon={Cake} label="Edad">
        {child.age} {child.age === 1 ? 'año' : 'años'}
      </DomainCardMeta>
    </DomainCard>
  );
}
