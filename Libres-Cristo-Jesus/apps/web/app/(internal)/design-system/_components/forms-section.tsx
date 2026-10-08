'use client';

import { Checkbox, RadioGroup, RadioGroupItem, Select, Switch, Textarea, Input } from '@lcj/ui';
import { Mail } from 'lucide-react';

const STAGE_OPTIONS = [
  { value: 'assistant', label: 'Asistente' },
  { value: 'new', label: 'Nuevo' },
  { value: 'consolidation', label: 'Consolidación' },
  { value: 'disciple', label: 'Discípulo' },
];

export function FormsSection() {
  return (
    <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2">
      <Input label="Nombre completo" placeholder="Ana Torres" helperText="Nombre y apellido." />
      <Input label="Correo" type="email" leftIcon={Mail} placeholder="ana@example.com" />
      <Input label="Con error" defaultValue="dato inválido" error="Este campo es obligatorio." />
      <Select label="Etapa" options={STAGE_OPTIONS} defaultValue="new" />
      <Textarea
        label="Notas"
        placeholder="Observaciones de la reunión…"
        helperText="Máximo 500 caracteres."
        containerClassName="tablet:col-span-2"
      />

      <div className="flex flex-col gap-3">
        <Checkbox
          label="Asistió a la reunión"
          description="Marca si la persona estuvo presente."
          defaultChecked
        />
        <Checkbox label="Recibió consolidación" />
      </div>

      <div className="flex flex-col gap-3">
        <RadioGroup defaultValue="couple" className="grid gap-3">
          <RadioGroupItem value="couple" label="Liderazgo en pareja" />
          <RadioGroupItem value="single" label="Liderazgo individual" />
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-3 tablet:col-span-2">
        <Switch
          label="Notificaciones activas"
          description="Aplica de inmediato al cambiar."
          defaultChecked
        />
      </div>
    </div>
  );
}
