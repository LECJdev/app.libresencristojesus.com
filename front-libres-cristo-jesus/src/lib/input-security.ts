function stripControlChars(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
}

function normalizeSpaces(value: string): string {
  return stripControlChars(value).replace(/\s+/g, ' ').trim();
}

export function sanitizeDocumentoInput(value: string): string {
  return normalizeSpaces(value)
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '')
    .slice(0, 30);
}

export function sanitizeNombreInput(value: string): string {
  return normalizeSpaces(value)
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, '')
    .slice(0, 120);
}

export function sanitizeCelularInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

export function sanitizeDireccionInput(value: string): string {
  return normalizeSpaces(value).slice(0, 255);
}

export function sanitizeBarrioInput(value: string): string {
  return normalizeSpaces(value).slice(0, 120);
}

export function sanitizeCorreoInput(value: string): string {
  return normalizeSpaces(value).replace(/\s/g, '').toLowerCase().slice(0, 120);
}

export function sanitizeEdadInput(value: string): string {
  const onlyDigits = value.replace(/\D/g, '').slice(0, 3);

  if (!onlyDigits) {
    return '';
  }

  const edad = Number.parseInt(onlyDigits, 10);
  if (!Number.isFinite(edad)) {
    return '';
  }

  if (edad > 120) {
    return '120';
  }

  return String(edad);
}
