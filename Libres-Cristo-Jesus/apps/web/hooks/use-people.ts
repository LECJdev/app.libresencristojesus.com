'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreatePersonInput,
  Person,
  PersonAttendanceRate,
  PersonAttendanceRow,
  PersonHistoryEntry,
  PersonStage,
  UpdatePersonInput,
} from '@lcj/types';
import {
  createPerson,
  deletePerson,
  getAttendanceRates,
  getPerson,
  getPersonAttendance,
  getPersonHistory,
  listPeople,
  listPersonStages,
  transferPerson,
  updatePerson,
  type ListPeopleParams,
} from '@/lib/api/people';
import type { PaginatedResult } from '@/lib/http-client';

export const peopleKeys = {
  all: ['people'] as const,
  list: (params: ListPeopleParams) => [...peopleKeys.all, 'list', params] as const,
  detail: (id: string) => [...peopleKeys.all, 'detail', id] as const,
  history: (id: string) => [...peopleKeys.all, 'history', id] as const,
  attendance: (id: string) => [...peopleKeys.all, 'attendance', id] as const,
  attendanceRates: (peaceHouseId: string) =>
    [...peopleKeys.all, 'attendance-rates', peaceHouseId] as const,
  stages: ['person-stages'] as const,
};

export function usePeople(
  params: ListPeopleParams,
): UseQueryResult<PaginatedResult<Person[]>, Error> {
  return useQuery({
    queryKey: peopleKeys.list(params),
    queryFn: () => listPeople(params),
    placeholderData: (previous) => previous,
  });
}

export function usePerson(id: string | undefined): UseQueryResult<Person, Error> {
  return useQuery({
    queryKey: peopleKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getPerson(id!),
  });
}

/**
 * The pastoral stage catalog. Written once by the installer and never
 * again, so it is cached for the session.
 */
export function usePersonStages(): UseQueryResult<PersonStage[], Error> {
  return useQuery({
    queryKey: peopleKeys.stages,
    queryFn: listPersonStages,
    staleTime: Infinity,
  });
}

/** Only fetched while a detail panel is open. */
export function usePersonHistory(
  id: string | undefined,
): UseQueryResult<PersonHistoryEntry[], Error> {
  return useQuery({
    queryKey: peopleKeys.history(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getPersonHistory(id!),
  });
}

/** Every meeting of the person's Casa de Paz since they joined it — feeds their trend chart. */
export function usePersonAttendance(
  id: string | undefined,
): UseQueryResult<PersonAttendanceRow[], Error> {
  return useQuery({
    queryKey: peopleKeys.attendance(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getPersonAttendance(id!),
  });
}

/** One rate per active roster member — feeds the Personas grid's inline "% asistencia". */
export function useAttendanceRates(
  peaceHouseId: string | undefined,
): UseQueryResult<PersonAttendanceRate[], Error> {
  return useQuery({
    queryKey: peopleKeys.attendanceRates(peaceHouseId ?? ''),
    enabled: Boolean(peaceHouseId),
    queryFn: () => getAttendanceRates(peaceHouseId!),
  });
}

/**
 * Invalidates every list and timeline a write can affect.
 *
 * The history is included because an edit MAY have transferred the person,
 * which closes one period and opens another.
 */
function useInvalidatePeople(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
  };
}

export function useCreatePerson(): UseMutationResult<Person, Error, CreatePersonInput> {
  const invalidate = useInvalidatePeople();
  return useMutation({ mutationFn: createPerson, onSuccess: invalidate });
}

export function useUpdatePerson(): UseMutationResult<
  Person,
  Error,
  { id: string; input: UpdatePersonInput }
> {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: ({ id, input }) => updatePerson(id, input),
    onSuccess: invalidate,
  });
}

export function useTransferPerson(): UseMutationResult<
  Person,
  Error,
  { id: string; peaceHouseId: string; transferReason?: string }
> {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: ({ id, peaceHouseId, transferReason }) =>
      transferPerson(id, peaceHouseId, transferReason),
    onSuccess: invalidate,
  });
}

export function useDeletePerson(): UseMutationResult<null, Error, string> {
  const invalidate = useInvalidatePeople();
  return useMutation({ mutationFn: deletePerson, onSuccess: invalidate });
}
