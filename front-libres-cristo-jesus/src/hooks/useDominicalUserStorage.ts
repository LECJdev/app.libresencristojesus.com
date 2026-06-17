import { useState } from 'react';
import type { UserData } from '@/hooks/useUserStorage';

export interface DominicalSavedPerson {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
}

export const DOMINICAL_STORAGE_KEY = 'libres_cristo_jesus_dominical_users';
export const LEGACY_STORAGE_KEY = 'libres_cristo_jesus_user';

function isValidDocument(documento: string): boolean {
  return documento.trim().length > 0;
}

function normalizeSavedPerson(value: unknown): DominicalSavedPerson | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<DominicalSavedPerson>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const nombres = typeof candidate.nombres === 'string' ? candidate.nombres.trim() : '';
  const apellidos = typeof candidate.apellidos === 'string' ? candidate.apellidos.trim() : '';
  const documento = typeof candidate.documento === 'string' ? candidate.documento.trim() : '';

  if (!id || !nombres || !apellidos || !isValidDocument(documento)) {
    return null;
  }

  return { id, nombres, apellidos, documento };
}

export function dedupeDominicalUsers(users: DominicalSavedPerson[]): DominicalSavedPerson[] {
  const seen = new Set<string>();
  const deduped: DominicalSavedPerson[] = [];

  for (const user of users) {
    const normalized = normalizeSavedPerson(user);
    if (!normalized) {
      continue;
    }

    const key = normalized.documento.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

export function filterDominicalUsersWithDocument(
  users: DominicalSavedPerson[],
): DominicalSavedPerson[] {
  return users.filter((user) => isValidDocument(user.documento));
}

export function parseDominicalUsers(raw: string | null): DominicalSavedPerson[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

     return filterDominicalUsersWithDocument(
       dedupeDominicalUsers(parsed as DominicalSavedPerson[]),
     );
  } catch (error) {
    console.error('Error reading dominical users from localStorage', error);
    return [];
  }
}

function getLegacyPerson(raw: string | null): DominicalSavedPerson[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as UserData;
    const normalized = normalizeSavedPerson(parsed);
    return normalized ? [normalized] : [];
  } catch (error) {
    console.error('Error reading legacy user from localStorage', error);
    return [];
  }
}

export function mergeDominicalUsers(
  storedUsers: DominicalSavedPerson[],
  legacyUsers: DominicalSavedPerson[],
): DominicalSavedPerson[] {
  return filterDominicalUsersWithDocument(
    dedupeDominicalUsers([...storedUsers, ...legacyUsers]),
  );
}

export function useDominicalUserStorage() {
  const [people, setPeople] = useState<DominicalSavedPerson[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storedUsers = parseDominicalUsers(localStorage.getItem(DOMINICAL_STORAGE_KEY));
      const legacyUsers = getLegacyPerson(localStorage.getItem(LEGACY_STORAGE_KEY));
      const mergedUsers = mergeDominicalUsers(storedUsers, legacyUsers);

      localStorage.setItem(DOMINICAL_STORAGE_KEY, JSON.stringify(mergedUsers));
      return mergedUsers;
    } catch (error) {
      console.error('Error initializing dominical users from localStorage', error);
      return [];
    }
  });

  const isLoaded = typeof window !== 'undefined';

  const persist = (nextPeople: DominicalSavedPerson[]) => {
    const deduped = filterDominicalUsersWithDocument(
      dedupeDominicalUsers(nextPeople),
    );
    localStorage.setItem(DOMINICAL_STORAGE_KEY, JSON.stringify(deduped));
    setPeople(deduped);
    return deduped;
  };

  const addPerson = (person: DominicalSavedPerson) => persist([...people, person]);

  const removePerson = (documentoOrId: string) =>
    persist(
      people.filter(
        (person) =>
          person.documento !== documentoOrId && person.id !== documentoOrId,
      ),
    );

  const getAll = () => people;

  const findByDocument = (documento: string) =>
    people.find(
      (person) => person.documento.toLowerCase() === documento.trim().toLowerCase(),
    ) || null;

  return {
    people,
    isLoaded,
    addPerson,
    removePerson,
    getAll,
    findByDocument,
  };
}
