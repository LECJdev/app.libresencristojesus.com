'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Select,
} from '@lcj/ui';
import { RoleName, type KidsAssignmentRole } from '@lcj/types';
import { useCreateKidsAssignment } from '@/hooks/use-kids-schools';
import { leadershipUnitLabel, useLeadershipUnitsByRole } from '@/hooks/use-leadership-units';
import { ApiError } from '@/lib/http-client';

/**
 * Asigna un líder o auxiliar a una sede. `role: LEADER` solo lo puede crear
 * ADMIN — cierra al líder anterior automáticamente (`KidsSchoolsService`) —
 * mientras `role: ASSISTANT` lo puede crear también el KIDS_LEADER de esa
 * misma sede (ya acotado por `ScopeGuard` en el backend).
 */

const assignmentSchema = z.object({
  role: z.enum(['LEADER', 'ASSISTANT']),
  leadershipUnitId: z.string().min(1, 'Seleccione una persona.'),
  reason: z.string().trim().optional(),
});

type AssignmentFormValues = z.input<typeof assignmentSchema>;

export interface KidsAssignmentFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  /** Solo ADMIN puede asignar LEADER. */
  canAssignLeader: boolean;
}

export function KidsAssignmentFormDrawer({
  open,
  onOpenChange,
  schoolId,
  canAssignLeader,
}: KidsAssignmentFormDrawerProps) {
  const mutation = useCreateKidsAssignment();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      role: canAssignLeader ? 'LEADER' : 'ASSISTANT',
      leadershipUnitId: '',
      reason: '',
    },
  });

  const role = useWatch({ control, name: 'role' }) as KidsAssignmentRole | undefined;
  const { data: candidates, isPending: isLoadingCandidates } = useLeadershipUnitsByRole(
    role === 'LEADER' ? RoleName.KIDS_LEADER : RoleName.KIDS_ASSISTANT,
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({ role: canAssignLeader ? 'LEADER' : 'ASSISTANT', leadershipUnitId: '', reason: '' });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canAssignLeader, reset]);

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'No fue posible asignar a la sede. Intente nuevamente.'
        : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>Asignar equipo</DrawerTitle>
          <DrawerDescription>
            La persona debe tener el rol correspondiente (Líder o Auxiliar Escuela Kids) ya
            registrado.
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            await mutation.mutateAsync({
              schoolId,
              input: {
                leadershipUnitId: values.leadershipUnitId,
                role: values.role as KidsAssignmentRole,
                reason: values.reason?.trim() || undefined,
              },
            });
            onOpenChange(false);
          })}
        >
          <DrawerBody className="flex flex-col gap-4">
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
              name="role"
              render={({ field }) => (
                <Select
                  label="Rol"
                  required
                  options={[
                    ...(canAssignLeader ? [{ value: 'LEADER', label: 'Líder de sede' }] : []),
                    { value: 'ASSISTANT', label: 'Auxiliar' },
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                  error={errors.role?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="leadershipUnitId"
              render={({ field }) => (
                <Select
                  label="Persona"
                  required
                  placeholder="Seleccione una persona"
                  options={(candidates ?? []).map((unit) => ({
                    value: unit.id,
                    label: leadershipUnitLabel(unit),
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingCandidates}
                  error={errors.leadershipUnitId?.message}
                />
              )}
            />

            <Input label="Motivo" placeholder="Opcional" {...register('reason')} />
          </DrawerBody>

          <DrawerFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Asignar
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
