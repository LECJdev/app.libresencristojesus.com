import type {
  CreateKidsChildInput,
  CreateKidsGuardianInput,
  KidsChild,
  KidsChildDetail,
  KidsChildGuardian,
  KidsConsent,
  KidsGuardian,
  UpdateKidsChildInput,
  UpdateKidsConsentInput,
  UpdateKidsGuardianInput,
} from '@lcj/types';
import { apiFetch } from '@/lib/http-client';

/** Niños + acudientes + autorización — `kids-children` module endpoints. */

export function listKidsChildren(schoolId: string): Promise<KidsChild[]> {
  return apiFetch<KidsChild[]>(`/kids/schools/${schoolId}/children`);
}

export function createKidsChild(
  schoolId: string,
  input: CreateKidsChildInput,
): Promise<KidsChildDetail> {
  return apiFetch<KidsChildDetail>(`/kids/schools/${schoolId}/children`, {
    method: 'POST',
    body: input,
  });
}

export function getKidsChild(id: string): Promise<KidsChildDetail> {
  return apiFetch<KidsChildDetail>(`/kids/children/${id}`);
}

export function updateKidsChild(
  id: string,
  input: UpdateKidsChildInput,
): Promise<KidsChildDetail> {
  return apiFetch<KidsChildDetail>(`/kids/children/${id}`, { method: 'PATCH', body: input });
}

export function addKidsGuardian(
  childId: string,
  input: CreateKidsGuardianInput,
): Promise<KidsChildGuardian> {
  return apiFetch<KidsChildGuardian>(`/kids/children/${childId}/guardians`, {
    method: 'POST',
    body: input,
  });
}

export function updateKidsGuardian(
  id: string,
  input: UpdateKidsGuardianInput,
): Promise<KidsGuardian> {
  return apiFetch<KidsGuardian>(`/kids/guardians/${id}`, { method: 'PATCH', body: input });
}

export function updateKidsConsent(
  childId: string,
  input: UpdateKidsConsentInput,
): Promise<KidsConsent> {
  return apiFetch<KidsConsent>(`/kids/children/${childId}/consent`, {
    method: 'PATCH',
    body: input,
  });
}
