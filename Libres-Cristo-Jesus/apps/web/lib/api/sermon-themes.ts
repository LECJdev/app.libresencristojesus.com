import type {
  CreateSermonThemeInput,
  RecordStatus,
  SermonTheme,
  UpdateSermonThemeInput,
} from '@lcj/types';
import { apiFetch, apiFetchPaginated, type PaginatedResult } from '@/lib/http-client';
import { toQueryString } from './query-string';

/**
 * Catálogo de temas de predicación (doc04 §6).
 *
 * Global by nature: there is no "my theme", so none of these calls carries
 * a Casa de Paz and none of them is scoped.
 */

export interface ListSermonThemesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  series?: string;
  status?: RecordStatus;
}

export function listSermonThemes(
  params: ListSermonThemesParams = {},
): Promise<PaginatedResult<SermonTheme[]>> {
  return apiFetchPaginated<SermonTheme[]>(`/sermon-themes${toQueryString({ ...params })}`);
}

/** The series currently in use, to group the catalog. */
export function listSermonThemeSeries(): Promise<string[]> {
  return apiFetch<string[]>('/sermon-themes/series');
}

export function createSermonTheme(input: CreateSermonThemeInput): Promise<SermonTheme> {
  return apiFetch<SermonTheme>('/sermon-themes', { method: 'POST', body: input });
}

export function updateSermonTheme(id: string, input: UpdateSermonThemeInput): Promise<SermonTheme> {
  return apiFetch<SermonTheme>(`/sermon-themes/${id}`, { method: 'PATCH', body: input });
}

export function deleteSermonTheme(id: string): Promise<null> {
  return apiFetch<null>(`/sermon-themes/${id}`, { method: 'DELETE' });
}
