# Arquitectura — LCJ Connect

Cómo está organizado el sistema y **por qué**. Para el catálogo de reglas de
negocio y el plan por fases, ver `Documentos/00_PROYECTO_MASTER.md`, que es la
fuente oficial del proyecto.

---

## 1. El monorepo

```
apps/
  api/        NestJS 11 — la API
  web/        Next.js 15 (App Router) — la PWA
packages/
  types/      Contratos compartidos entre API y web
  ui/         Design System (@lcj/ui)
  utils/      Utilidades puras
  config/     Configuración compartida
prisma/       Esquema, migraciones y seed
```

Workspace de **pnpm** + **Turborepo**. `packages/ui` se publica como código
TypeScript, no como bundle compilado, para que sus directivas `"use client"`
sobrevivan; Next lo compila vía `transpilePackages`.

### Por qué `packages/types` existe

Porque hay reglas que **backend y frontend deben aplicar idénticamente**, y dos
copias derivan. Viven ahí:

- La política de subida de archivos (`storage.ts`): el navegador debe rechazar
  un archivo de 8 MB _antes_ de gastar los datos móviles del usuario en algo
  que el servidor va a rechazar igual.
- Los límites geográficos de Colombia (`geography.ts`): el geocodificador los
  usa para no guardar una coordenada de otro país; el mapa, para no dejar
  desplazar la vista fuera del territorio. **Los mismos números.**

> **Trampa verificada:** un tipo compartido puede _mentir_. `SermonTheme`
> declaraba `createdBy`/`updatedBy` porque extendía `AuditableRecord`, pero su
> DTO de respuesta nunca los envía. Ni `typecheck` ni los E2E lo detectan.
> **Con cada DTO de respuesta nuevo hay que hacer `curl` y comparar campo por
> campo.**

---

## 2. Capas de la API

```
controller  →  service  →  Prisma
     ↑            ↑
   guards      reglas de negocio
```

- **Controladores**: rutas, permisos (`@RequirePermission`), auditoría
  (`@Audit`) y Swagger. Sin lógica.
- **Servicios**: reglas de negocio y errores **en español** (los ve el usuario).
- **Prisma**: única vía de acceso a datos.

### Puertos y adaptadores donde el mundo exterior entra

El módulo `geography` es hexagonal a propósito, porque es el único que depende
de servicios de terceros:

| Puerto            | Adaptador actual    | Se reemplaza cambiando                 |
| ----------------- | ------------------- | -------------------------------------- |
| `GeographySource` | `ApiColombiaSource` | un `useClass` en `geography.module.ts` |
| `Geocoder`        | `NominatimGeocoder` | un `useClass` en `geography.module.ts` |

**Son dos puertos, no uno.** El respaldo documentado del primero es un CSV de
DIVIPOLA, que responde "qué municipios existen" perfectamente pero no trae
coordenadas. Fusionarlos obligaría a todo adaptador futuro a inventar
posiciones, y un respaldo que no se puede implementar no es un respaldo.

Ninguno de los dos se exporta del módulo: **la aplicación en marcha no tiene
camino de código hacia un servicio externo.** Ambos se usan solo desde scripts
de instalación.

---

## 3. Seguridad

### Autenticación

JWT de acceso en memoria + **refresh token en cookie `httpOnly`**, nunca en
JavaScript. Rotación con `jti` único para detectar reúso.

### Autorización — dos mecanismos, no uno

| Alcance                            | Mecanismo                             | Dónde                                  |
| ---------------------------------- | ------------------------------------- | -------------------------------------- |
| Un recurso identificado en la ruta | `ScopeGuard`                          | `common/security/guards/`              |
| Una colección o un agregado        | `peaceHouseScopeFilter` en el `where` | `common/security/peace-house-scope.ts` |

**Los dos existen porque resuelven cosas distintas.** El guard resuelve _un_ id
de los parámetros de ruta; una lista no tiene uno solo, así que el recorte tiene
que ocurrir dentro de la consulta. Filtrar después de leer sería la fuga, no la
solución.

> **Trampa verificada:** toda ruta cuyo identificador `ScopeGuard` no sepa
> resolver es una ruta **sin control por fila** — el guard retorna temprano y
> deja pasar. Al añadir un módulo que opera sobre un id derivado hay que añadir
> su `ScopeResourceType`. Un smoke test como Administrador nunca lo detecta:
> ese rol está exento de alcance. **Hay que probar con el rol restringido.**

---

## 4. El Design System

`@lcj/ui` no conoce ninguna librería de gráficas: `ChartCard` recibe la gráfica
como `children`. Cambiar de librería no toca código de contenedor.

**Regla que ya se pagó sola:** ningún componente codifica un color; todos leen
tokens. Adoptar la identidad visual oficial completa —azules, neutrales,
superficies— fue editar **un archivo**. Las únicas excepciones son los recursos
estáticos de PWA (`manifest.webmanifest`, `offline.html`, los iconos, el
`themeColor` del layout), que no pueden leer variables CSS y se mantienen a mano.

> **Trampa verificada:** Tailwind solo genera una utilidad si encuentra el
> string literal de la clase en un archivo que escanea, y salta `node_modules`
> — donde pnpm enlaza `@lcj/ui`. Sin `@source '../../../packages/ui/src'` en
> `globals.css`, las clases que viven **solo** en el Design System nunca se
> emiten. `<Grid>` estuvo roto desde la Fase 3 sin que nada errara.

---

## 5. Decisiones que se repiten

- **Borrado lógico en todas las tablas principales.** Nada se destruye; el
  historial es parte del producto.
- **Bloqueo optimista con `version`** en toda entidad editable por dos personas.
- **Semana ISO-8601 calculada, nunca almacenada.** Una bandera guardada
  necesitaría un job semanal cuyo fallo dejaría reuniones editables para
  siempre, en silencio.
- **Creación bajo demanda en vez de cron.** La reunión semanal se crea al
  abrirla. Un job que falla un domingo deja al país sin planilla y nadie se
  entera hasta el lunes.
- **Idempotencia por restricción de base** (`@@unique`) + captura de `P2002`.
  Dos peticiones simultáneas son la norma, no el caso raro.
- **Agregados calculados en base, nunca sumando la página en pantalla.** Un
  total que cambia al pasar de página es un bug que los usuarios reportan.
