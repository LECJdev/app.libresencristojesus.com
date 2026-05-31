export interface PublicAttendanceDescriptionPart {
  type: 'text' | 'field';
  value: string;
  fallback?: string;
  fallbackPath?: string;
}

export interface PublicAttendanceDescriptionLine {
  parts: PublicAttendanceDescriptionPart[];
}

export interface PublicAttendanceSummaryFieldConfig {
  label: string;
  source: 'attendance' | 'result' | 'documento' | 'displayName' | 'computed';
  path?: string;
  fallback?: string;
  fallbackPath?: string;
  computed?: 'registrationType';
}

export interface PublicAttendanceFlowConfig {
  attendanceEndpoint: string;
  registerEndpoint: string;
  askDescriptionLines: PublicAttendanceDescriptionLine[];
  summaryFields: PublicAttendanceSummaryFieldConfig[];
}

export const publicAttendanceConfigs = {
  dominical: {
    attendanceEndpoint: '/asistencias-dominicales/public/[token]',
    registerEndpoint: '/asistencias-dominicales/public/[token]/registrar',
    askDescriptionLines: [
      {
        parts: [
          { type: 'field', value: 'nombre', fallback: '—' },
          { type: 'text', value: ' · ' },
          { type: 'field', value: 'sede.nombre', fallback: 'Sin sede' },
        ],
      },
    ],
    summaryFields: [
      { label: 'Asistencia', source: 'attendance', path: 'nombre', fallback: '—' },
      { label: 'Sede', source: 'attendance', path: 'sede.nombre', fallback: '—' },
      { label: 'Persona', source: 'displayName', fallback: '—' },
      { label: 'Documento', source: 'result', path: 'persona.documento', fallback: '—' },
      { label: 'Fecha', source: 'result', path: 'fechaRegistro', fallback: '—' },
      { label: 'Tipo', source: 'computed', computed: 'registrationType', fallback: '—' },
    ],
  },
  'casa-paz': {
    attendanceEndpoint: '/asistencias-casa-paz/public/[token]',
    registerEndpoint: '/asistencias-casa-paz/public/[token]/registrar',
    askDescriptionLines: [
      {
        parts: [{ type: 'field', value: 'nombre', fallback: '—' }],
      },
      {
        parts: [
          { type: 'text', value: 'Red: ' },
          { type: 'field', value: 'red.nombre', fallback: '—' },
          { type: 'text', value: ' · ' },
          { type: 'field', value: 'direccionCasa', fallback: '—' },
        ],
      },
    ],
    summaryFields: [
      { label: 'Asistencia', source: 'attendance', path: 'nombre', fallback: '—' },
      { label: 'Red', source: 'attendance', path: 'red.nombre', fallback: '—' },
      { label: 'Dirección', source: 'attendance', path: 'direccionCasa', fallback: '—' },
      { label: 'Persona', source: 'displayName', fallback: '—' },
      { label: 'Documento', source: 'result', path: 'persona.documento', fallback: '—' },
      { label: 'Fecha', source: 'result', path: 'fechaRegistro', fallback: '—' },
      { label: 'Tipo', source: 'computed', computed: 'registrationType', fallback: '—' },
    ],
  },
  dicipulado: {
    attendanceEndpoint: '/asistencias-dicipulados/public/[token]',
    registerEndpoint: '/asistencias-dicipulados/public/[token]/registrar',
    askDescriptionLines: [
      {
        parts: [{ type: 'field', value: 'nombre', fallback: '—' }],
      },
      {
        parts: [
          {
            type: 'field',
            value: 'sede.nombre',
            fallbackPath: 'direccionPersonalizada',
            fallback: '—',
          },
        ],
      },
    ],
    summaryFields: [
      { label: 'Asistencia', source: 'attendance', path: 'nombre', fallback: '—' },
      {
        label: 'Ubicación',
        source: 'attendance',
        path: 'sede.nombre',
        fallbackPath: 'direccionPersonalizada',
        fallback: '—',
      },
      { label: 'Red', source: 'attendance', path: 'red.nombre', fallback: '—' },
      { label: 'Persona', source: 'displayName', fallback: '—' },
      { label: 'Documento', source: 'result', path: 'persona.documento', fallback: '—' },
      { label: 'Fecha', source: 'result', path: 'fechaRegistro', fallback: '—' },
      { label: 'Tipo', source: 'computed', computed: 'registrationType', fallback: '—' },
    ],
  },
} satisfies Record<string, PublicAttendanceFlowConfig>;
