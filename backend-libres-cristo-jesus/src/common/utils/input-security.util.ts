import { BadRequestException } from '@nestjs/common';

const DOCUMENTO_REGEX = /^[A-Z0-9.-]{5,30}$/;
const CELULAR_REGEX = /^\d{7,15}$/;
const TOKEN_REGEX = /^[A-Za-z0-9_-]{20,120}$/;
const ENTITY_ID_REGEX = /^[A-Za-z0-9_-]{5,60}$/;
const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,120}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripControlChars(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function sanitizeEntityIdOrThrow(value: string, label: string): string {
  const normalized = normalizeSpaces(stripControlChars(value || ''));

  if (!ENTITY_ID_REGEX.test(normalized)) {
    throw new BadRequestException(`${label} inválido`);
  }

  return normalized;
}

export function sanitizeTokenOrThrow(token: string): string {
  const normalized = normalizeSpaces(stripControlChars(token || ''));

  if (!TOKEN_REGEX.test(normalized)) {
    throw new BadRequestException('Token inválido');
  }

  return normalized;
}

export function sanitizeDocumentoOrThrow(documento: string): string {
  const normalized = normalizeSpaces(
    stripControlChars(documento || ''),
  ).toUpperCase();

  if (!DOCUMENTO_REGEX.test(normalized)) {
    throw new BadRequestException('Documento inválido');
  }

  return normalized;
}

export function sanitizeNombreOrThrow(
  value: string,
  fieldLabel: string,
): string {
  const normalized = normalizeSpaces(stripControlChars(value || ''));

  if (!NOMBRE_REGEX.test(normalized)) {
    throw new BadRequestException(`${fieldLabel} inválidos`);
  }

  return normalized;
}

export function sanitizeCelularOrThrow(value: string): string {
  const normalized = value.replace(/\D/g, '');

  if (!CELULAR_REGEX.test(normalized)) {
    throw new BadRequestException('Celular inválido');
  }

  return normalized;
}

export function sanitizeOptionalText(
  value?: string,
  maxLength = 255,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeSpaces(stripControlChars(value));
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function sanitizeRequiredTextOrThrow(
  value: string,
  fieldLabel: string,
  maxLength = 255,
): string {
  const normalized = sanitizeOptionalText(value, maxLength);

  if (!normalized) {
    throw new BadRequestException(`${fieldLabel} es obligatorio`);
  }

  return normalized;
}

export function sanitizeOptionalEmail(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeSpaces(stripControlChars(value)).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (!EMAIL_REGEX.test(normalized)) {
    throw new BadRequestException('Correo inválido');
  }

  return normalized.slice(0, 120);
}

export function sanitizeOptionalEdad(value?: number): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0 || value > 120) {
    throw new BadRequestException('Edad inválida');
  }

  return value;
}

export function buildLikeSearchParam(
  search?: string,
  maxLength = 80,
): string | null {
  if (!search) {
    return null;
  }

  const normalized = normalizeSpaces(stripControlChars(search))
    .toLowerCase()
    .slice(0, maxLength);

  if (!normalized) {
    return null;
  }

  const escaped = normalized.replace(/[!%_]/g, '!$&');
  return `%${escaped}%`;
}
