import type { Setting, UpsertSettingInput } from '@lcj/types';
import { apiFetch } from '@/lib/http-client';

/**
 * System configuration (doc04 "Mejoras" §3).
 *
 * Not paginated by design — see `SettingsService`: this is a bounded
 * configuration set an administrator reads as one screen.
 */

export function listSettings(): Promise<Setting[]> {
  return apiFetch<Setting[]>('/settings');
}

export function upsertSetting(key: string, input: UpsertSettingInput): Promise<Setting> {
  return apiFetch<Setting>(`/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: input,
  });
}

export function deleteSetting(key: string): Promise<null> {
  return apiFetch<null>(`/settings/${encodeURIComponent(key)}`, { method: 'DELETE' });
}
