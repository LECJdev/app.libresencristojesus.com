/**
 * Upload policy — the SINGLE definition of what may be stored.
 *
 * Lives here, not in the backend service, because the browser must apply
 * the same rules before spending a user's bandwidth on an 8 MB file the
 * server will reject. Two copies of these tables would drift, and the
 * symptom would be the cruelest kind: an upload that appears to work,
 * takes thirty seconds on mobile data, and then fails.
 *
 * `StorageService` remains the authority — the client check is a courtesy,
 * never a security boundary. A caller that skips it still gets rejected.
 */

export type StorageCategory =
  | 'church-logo'
  | 'leadership-photo'
  | 'meeting-photo'
  | 'document'
  | 'kids-child-photo'
  | 'kids-consent-document';

export const STORAGE_CATEGORIES = [
  'church-logo',
  'leadership-photo',
  'meeting-photo',
  'document',
  'kids-child-photo',
  'kids-consent-document',
] as const satisfies readonly StorageCategory[];

/** Maximum bytes accepted per category. doc18 §33 keeps imagery light. */
export const MAX_UPLOAD_SIZE_BY_CATEGORY: Record<StorageCategory, number> = {
  'church-logo': 2 * 1024 * 1024,
  'leadership-photo': 5 * 1024 * 1024,
  'meeting-photo': 8 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  'kids-child-photo': 5 * 1024 * 1024,
  'kids-consent-document': 10 * 1024 * 1024,
};

/**
 * Allowed MIME types per category — an allowlist, never a blocklist.
 *
 * SVG is deliberately excluded from every image category: it can carry
 * script and these files are served from our own origin.
 *
 * `kids-consent-document`, unlike `document`, accepts images too: the
 * signed physical authorization is normally digitized as a phone photo,
 * not scanned to PDF.
 */
export const ALLOWED_MIME_BY_CATEGORY: Record<StorageCategory, readonly string[]> = {
  'church-logo': ['image/png', 'image/jpeg', 'image/webp'],
  'leadership-photo': ['image/png', 'image/jpeg', 'image/webp'],
  'meeting-photo': ['image/png', 'image/jpeg', 'image/webp'],
  document: ['application/pdf'],
  'kids-child-photo': ['image/png', 'image/jpeg', 'image/webp'],
  'kids-consent-document': ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
};

/** `accept` attribute for a file input, derived from the same allowlist. */
export function acceptAttributeFor(category: StorageCategory): string {
  return ALLOWED_MIME_BY_CATEGORY[category].join(',');
}

export function maxUploadMegabytes(category: StorageCategory): number {
  return Math.round(MAX_UPLOAD_SIZE_BY_CATEGORY[category] / (1024 * 1024));
}

/**
 * Validates a candidate upload against the category's rules.
 *
 * Returns a Spanish message when rejected, `null` when acceptable — so the
 * same function serves the API (which throws it as a 400) and the browser
 * (which renders it under the field).
 */
export function validateUploadCandidate(
  category: StorageCategory,
  mimeType: string,
  sizeInBytes: number,
): string | null {
  const allowed = ALLOWED_MIME_BY_CATEGORY[category];
  if (!allowed.includes(mimeType)) {
    return `Tipo de archivo no permitido: ${mimeType || 'desconocido'}. Permitidos: ${allowed.join(', ')}.`;
  }

  if (sizeInBytes === 0) {
    return 'El archivo está vacío.';
  }

  if (sizeInBytes > MAX_UPLOAD_SIZE_BY_CATEGORY[category]) {
    return `El archivo supera el tamaño máximo de ${maxUploadMegabytes(category)} MB.`;
  }

  return null;
}

/** What `POST /files/upload` returns. Persist `path`, never a full URL. */
export interface UploadedFile {
  path: string;
  size: number;
  mimeType: string;
}
