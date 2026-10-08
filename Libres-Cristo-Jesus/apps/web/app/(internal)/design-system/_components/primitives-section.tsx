'use client';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconButton,
} from '@lcj/ui';
import { Heart, Plus, Trash2 } from 'lucide-react';

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
const BADGE_VARIANTS = [
  'neutral',
  'primary',
  'success',
  'warning',
  'error',
  'info',
  'gold',
] as const;

export function PrimitivesSection() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Button</h3>
        <div className="flex flex-col gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {variant} / {size}
                </Button>
              ))}
              <Button variant={variant} leftIcon={Plus}>
                Con icono
              </Button>
              <Button variant={variant} loading>
                Cargando
              </Button>
              <Button variant={variant} disabled>
                Deshabilitado
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <IconButton icon={Heart} aria-label="Favorito" variant="primary" />
            <IconButton icon={Trash2} aria-label="Eliminar" variant="secondary" />
            <IconButton icon={Plus} aria-label="Agregar" variant="ghost" loading />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Card</h3>
        <Card className="max-w-sm" interactive>
          <CardHeader>
            <CardTitle>Casa de Paz Betania</CardTitle>
            <CardDescription>
              Ejemplo de tarjeta interactiva con elevación al pasar el cursor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-small text-foreground-muted">
              Contenido libre dentro de la tarjeta.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Badge</h3>
        <div className="flex flex-wrap gap-2">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Avatar</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Ana Torres" size="xs" />
          <Avatar name="Carlos Gómez" size="sm" />
          <Avatar name="Beatriz Ríos" size="md" />
          <Avatar name="David Peña" size="lg" />
          <Avatar name="Elena Vargas" size="xl" />
        </div>
      </div>
    </div>
  );
}
