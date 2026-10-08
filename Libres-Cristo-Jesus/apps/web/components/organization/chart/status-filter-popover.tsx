'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Icon, Popover, PopoverContent, PopoverTrigger, Select, buttonVariants, cn } from '@lcj/ui';
import type { RecordStatus } from '@lcj/types';

export type StatusFilterValue = 'all' | RecordStatus;

const OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
] as const;

export interface StatusFilterPopoverProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

/**
 * The one filter this screen ships with, per the project owner's explicit
 * scope call: a single Estado filter over which Distritos/Casas de Paz the
 * chart renders, wrapped in the existing `Popover` primitive (there is no
 * dedicated screen-level filter drawer for this module).
 */
export function StatusFilterPopover({ value, onChange }: StatusFilterPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: 'secondary', size: 'md' }))}
        aria-label="Filtrar organigrama"
      >
        <Icon icon={Filter} size="sm" />
        Filtros
      </PopoverTrigger>

      <PopoverContent className="w-64">
        <Select
          label="Estado"
          options={OPTIONS}
          value={value}
          onValueChange={(next) => {
            onChange(next as StatusFilterValue);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
