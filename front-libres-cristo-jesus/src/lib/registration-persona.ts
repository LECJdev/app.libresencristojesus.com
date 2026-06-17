import {
  sanitizeBarrioInput,
  sanitizeCelularInput,
  sanitizeCorreoInput,
  sanitizeDireccionInput,
  sanitizeEdadInput,
  sanitizeLocationInput,
  sanitizeNombreInput,
} from '@/lib/input-security';

export type TipoDocumento = 'C.C' | 'T.I.' | 'PT' | 'C.E.';

export interface RegistrationPersonaForm {
  nombres: string;
  apellidos: string;
  celular: string;
  idRed: string;
  tipoDocumento: TipoDocumento;
  direccion: string;
  correo: string;
  edad: string;
  fechaNacimiento: string;
  departamento: string;
  ciudad: string;
  barrio: string;
}

export const EMPTY_REGISTRATION_PERSONA_FORM: RegistrationPersonaForm = {
  nombres: '',
  apellidos: '',
  celular: '',
  idRed: '',
  tipoDocumento: 'C.C',
  direccion: '',
  correo: '',
  edad: '',
  fechaNacimiento: '',
  departamento: '',
  ciudad: '',
  barrio: '',
};

export function buildRegistrationPersonaPayload(
  form: RegistrationPersonaForm,
): {
  nombres: string;
  apellidos: string;
  celular: string;
  idRed?: string;
  tipoDocumento: TipoDocumento;
  direccion?: string;
  correo?: string;
  edad?: number;
  fechaNacimiento?: string;
  departamento: string;
  ciudad: string;
  barrio?: string;
} {
  const edadSanitizada = sanitizeEdadInput(form.edad);

  return {
    nombres: sanitizeNombreInput(form.nombres),
    apellidos: sanitizeNombreInput(form.apellidos),
    celular: sanitizeCelularInput(form.celular),
    idRed: form.idRed || undefined,
    tipoDocumento: form.tipoDocumento,
    direccion: sanitizeDireccionInput(form.direccion) || undefined,
    correo: sanitizeCorreoInput(form.correo) || undefined,
    edad: edadSanitizada ? Number.parseInt(edadSanitizada, 10) : undefined,
    fechaNacimiento: form.fechaNacimiento || undefined,
    departamento: sanitizeLocationInput(form.departamento),
    ciudad: sanitizeLocationInput(form.ciudad),
    barrio: sanitizeBarrioInput(form.barrio) || undefined,
  };
}
