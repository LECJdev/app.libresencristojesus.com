'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Coins, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Input,
  Textarea,
  useToast,
} from '@lcj/ui';
import type { MeetingReport } from '@lcj/types';
import { useRemoveOffering, useUpsertOffering } from '@/hooks/use-meeting-report';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { formatCurrencyCOP, formatNumber } from '@/lib/format';
import { QueuedOfflineError } from '@/lib/offline/with-offline-fallback';

/** Strips everything but digits, so the field can only ever hold whole pesos. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** "20000" -> "$20.000" — mirrors `formatCurrencyCOP` but without decimals or
 * the currency-code spacing, since this is what the leader types into, not
 * what a report displays. */
function formatOfferingInput(rawValue: string): string {
  const digits = digitsOnly(rawValue);
  return digits ? `$${formatNumber(Number(digits))}` : '';
}

/**
 * Ofrenda de la reunión (doc02 RN-039..RN-042).
 *
 * ONE offering per meeting, so this is a single amount and not a list. The
 * same form both registers and corrects it — from the leader's side there
 * is one figure that either has a value yet or does not.
 *
 * Deleting is a soft delete on the server (RN-042): the movement stays
 * traceable. It is offered because the realistic mistake is a leader typing
 * an amount into the wrong Casa de Paz, and leaving it there corrupts every
 * total that week.
 */

const offeringSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Ingrese el valor de la ofrenda.')
    .refine((value) => !Number.isNaN(Number(value)), { message: 'Ingrese un número válido.' })
    .refine((value) => Number(value) >= 0, { message: 'La ofrenda no puede ser negativa.' })
    .refine((value) => Number.isInteger(Number(value) * 100), {
      message: 'Máximo dos decimales.',
    }),
  notes: z.string().trim().max(500, 'Máximo 500 caracteres.').optional(),
});

type OfferingFormValues = z.input<typeof offeringSchema>;

export interface OfferingCardProps {
  report: MeetingReport;
  readOnly: boolean;
}

export function OfferingCard({ report, readOnly }: OfferingCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const upsertMutation = useUpsertOffering(report.meetingId);
  const removeMutation = useRemoveOffering(report.meetingId);
  const { toast } = useToast();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringSchema),
    defaultValues: { amount: '', notes: '' },
  });

  useEffect(() => {
    reset({
      // A registered zero is a real answer ("no hubo ofrenda"), so it must
      // render as "0" and not as an empty field.
      amount: report.offering ? String(report.offering.amount) : '',
      notes: report.offering?.notes ?? '',
    });
  }, [report.meetingId, report.offering, reset]);

  const errorMessage = resolveApiErrorMessage(
    upsertMutation.error,
    'No fue posible guardar la ofrenda.',
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Ofrenda</CardTitle>
          <CardDescription>Una sola ofrenda por reunión, en pesos colombianos.</CardDescription>
        </div>
        {report.offering && !readOnly ? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={Trash2}
            onClick={() => {
              removeMutation.reset();
              setIsDeleteOpen(true);
            }}
          >
            Eliminar
          </Button>
        ) : null}
      </CardHeader>

      <CardContent>
        {readOnly ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-h3 font-semibold text-foreground">
              <Icon icon={Coins} size="sm" className="text-foreground-muted" />
              {report.offering ? formatCurrencyCOP(report.offering.amount) : 'Sin registrar'}
            </p>
            {report.offering?.notes ? (
              <p className="whitespace-pre-line text-small text-foreground-muted">
                {report.offering.notes}
              </p>
            ) : null}
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                await upsertMutation.mutateAsync({
                  amount: Number(values.amount),
                  notes: values.notes?.trim() ?? '',
                });
              } catch (error) {
                if (error instanceof QueuedOfflineError) {
                  toast({
                    title: 'Guardado sin conexión',
                    description: error.message,
                    variant: 'warning',
                  });
                  upsertMutation.reset();
                  reset(values);
                }
              }
            })}
          >
            {errorMessage ? (
              <p
                role="alert"
                className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
              >
                {errorMessage}
              </p>
            ) : null}

            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <Input
                  label="Valor recogido"
                  type="text"
                  inputMode="numeric"
                  placeholder="$250.000"
                  helperText="En pesos colombianos."
                  error={errors.amount?.message}
                  name={field.name}
                  ref={field.ref}
                  value={formatOfferingInput(field.value)}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(digitsOnly(event.target.value));
                  }}
                />
              )}
            />

            <Textarea
              label="Observaciones"
              rows={2}
              helperText="Opcional. Por ejemplo, una ofrenda destinada a un propósito específico."
              error={errors.notes?.message}
              {...register('notes')}
            />

            <div className="flex justify-end">
              <Button type="submit" loading={upsertMutation.isPending} disabled={!isDirty}>
                {report.offering ? 'Corregir ofrenda' : 'Registrar ofrenda'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      <ConfirmDeleteModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        itemLabel="la ofrenda"
        itemName={report.offering ? formatCurrencyCOP(report.offering.amount) : ''}
        loading={removeMutation.isPending}
        error={resolveApiErrorMessage(removeMutation.error, 'No fue posible eliminar la ofrenda.')}
        onConfirm={() => {
          removeMutation.mutate(undefined, {
            onSuccess: () => {
              setIsDeleteOpen(false);
            },
          });
        }}
      />
    </Card>
  );
}
