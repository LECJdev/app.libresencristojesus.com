import type {
  CreateKidsAssignmentInput,
  CreateKidsSchoolInput,
  KidsAssignment,
  KidsSchool,
  UpdateKidsSchoolInput,
} from '@lcj/types';
import { apiFetch } from '@/lib/http-client';

/** `KidsSchool` (sede de Escuela Kids) + equipo (`KidsUserAssignment`) endpoints. */

export function listKidsSchools(): Promise<KidsSchool[]> {
  return apiFetch<KidsSchool[]>('/kids/schools');
}

export function getKidsSchool(id: string): Promise<KidsSchool> {
  return apiFetch<KidsSchool>(`/kids/schools/${id}`);
}

export function createKidsSchool(input: CreateKidsSchoolInput): Promise<KidsSchool> {
  return apiFetch<KidsSchool>('/kids/schools', { method: 'POST', body: input });
}

export function updateKidsSchool(id: string, input: UpdateKidsSchoolInput): Promise<KidsSchool> {
  return apiFetch<KidsSchool>(`/kids/schools/${id}`, { method: 'PATCH', body: input });
}

/** Cierra la sede (soft-delete, nunca un borrado físico) — solo ADMIN. */
export function removeKidsSchool(id: string): Promise<null> {
  return apiFetch<null>(`/kids/schools/${id}`, { method: 'DELETE' });
}

export function listKidsAssignments(schoolId: string): Promise<KidsAssignment[]> {
  return apiFetch<KidsAssignment[]>(`/kids/schools/${schoolId}/assignments`);
}

export function createKidsAssignment(
  schoolId: string,
  input: CreateKidsAssignmentInput,
): Promise<KidsAssignment> {
  return apiFetch<KidsAssignment>(`/kids/schools/${schoolId}/assignments`, {
    method: 'POST',
    body: input,
  });
}

/** Cierra la asignación (nunca la borra) — no permite retirar al LEADER por esta vía. */
export function removeKidsAssignment(schoolId: string, assignmentId: string): Promise<null> {
  return apiFetch<null>(`/kids/schools/${schoolId}/assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}
