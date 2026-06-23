import { useState } from 'react';

export interface CasaPazSavedPerson {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
}

export const CASA_PAZ_STORAGE_KEY = 'libres_cristo_jesus_casa_paz_users';

function isValidDocument(documento: string): boolean {
  return documento.trim().length > 0;
}

function normalizeSavedPerson(value: unknown): CasaPazSavedPerson | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<CasaPazSavedPerson>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const nombres = typeof candidate.nombres === 'string' ? candidate.nombres.trim() : '';
  const apellidos = typeof candidate.apellidos === 'string' ? candidate.apellidos.trim() : '';
  const documento = typeof candidate.documento === 'string' ? candidate.documento.trim() : '';

  if (!id || !nombres || !isValidDocument(documento)) {
    return null;
  }

  return { id, nombres, apellidos, documento };
}

function dedupeCasaPazUsers(users: CasaPazSavedPerson[]): CasaPazSavedPerson[] {
  const seen = new Set<string>();
  const deduped: CasaPazSavedPerson[] = [];

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

function parseCasaPazUsers(raw: string | null): CasaPazSavedPerson[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return dedupeCasaPazUsers(parsed as CasaPazSavedPerson[]);
  } catch (error) {
    console.error('Error reading Casa de Paz users from localStorage', error);
    return [];
  }
}

export function useCasaPazUserStorage() {
  const [people, setPeople] = useState<CasaPazSavedPerson[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storedUsers = parseCasaPazUsers(localStorage.getItem(CASA_PAZ_STORAGE_KEY));
      localStorage.setItem(CASA_PAZ_STORAGE_KEY, JSON.stringify(storedUsers));
      return storedUsers;
    } catch (error) {
      console.error('Error initializing Casa de Paz users from localStorage', error);
      return [];
    }
  });

  const isLoaded = typeof window !== 'undefined';

  const persist = (nextPeople: CasaPazSavedPerson[]) => {
    const deduped = dedupeCasaPazUsers(nextPeople);
    localStorage.setItem(CASA_PAZ_STORAGE_KEY, JSON.stringify(deduped));
    setPeople(deduped);
    return deduped;
  };

  const addPerson = (person: CasaPazSavedPerson) => persist([...people, person]);

  const removePerson = (documentoOrId: string) =>
    persist(
      people.filter(
        (person) => person.documento !== documentoOrId && person.id !== documentoOrId,
      ),
    );

  const findByDocument = (documento: string) =>
    people.find(
      (person) => person.documento.toLowerCase() === documento.trim().toLowerCase(),
    ) || null;

  return {
    people,
    isLoaded,
    addPerson,
    removePerson,
    findByDocument,
  };
}
