# 00 — PROYECTO MASTER

**Plataforma Gestión Casas de Paz** · Iglesia Cristiana Libres en Cristo Jesús
Nombre de trabajo del sistema: **LCJ Connect**

---

## Estatus de este documento

Esta es la **única fuente oficial de referencia** para continuar el desarrollo.

Los 28 documentos previos de `Documentos/` **siguen existiendo y no se eliminan**, pero dejan de ser referencia principal. Se conservan como material de investigación y como registro de la intención original del negocio.

**Regla de precedencia, sin excepciones:**

> Cuando un documento antiguo contradiga al código actual, **prevalece el código**.
> Cuando dos documentos antiguos se contradigan entre sí, **prevalece lo que diga este documento**.

Esa regla existe por una razón concreta y verificada: la auditoría completa de los 28 archivos encontró que **11 tienen contenido que no corresponde a su nombre** y que hay **tres planes maestros distintos y no reconciliados** (doc22, doc13, doc12). Construir contra ellos sin arbitraje produce decisiones incompatibles.

**Última actualización:** 2026-07-29
**Estado del proyecto:** ✅ **Fase 9 TERMINADA**
**Versión:** `0.9.0`

---

## 1. Visión del proyecto

Digitalizar la gestión de las **Casas de Paz** de la iglesia: la red de células que se reúnen semanalmente en hogares.

El sistema debe responder, en cualquier momento y sin depender de una hoja de cálculo:

- Quién lidera cada Casa de Paz, y quién la lideró antes.
- Cómo está organizada la iglesia: Pastores Generales → Distritos → Casas de Paz → Liderazgos.
- Cuánta gente asiste, cómo evoluciona, y quién está en proceso de consolidación.
- Cómo está distribuida la iglesia en el territorio colombiano.

**Principio rector del dominio:** el sistema nunca administra una persona como líder. Administra una **Unidad de Liderazgo** — una pareja que comparte una única cuenta sin perder la información individual de cada integrante. Este concepto atraviesa todo el modelo de datos, la autenticación y la interfaz.

**Usuarios:** cuatro roles — Administrador, Pastor General, Pastor de Distrito, Líder — con alcance de datos estrictamente distinto.

**Contexto de uso:** mayoritariamente móvil, en hogares, con conectividad irregular. De ahí que sea una PWA y no una aplicación de escritorio.

---

## 2. Arquitectura aprobada

### 2.1 Stack real (versiones verificadas en el código)

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js (App Router) | 15.5.22 |
| | React | 19.2.4 |
| | Tailwind CSS | 4.x |
| | TanStack Query | 5.101.4 |
| | Zustand | 5.0.14 |
| | react-hook-form + Zod | 7.83 / 4.4.3 |
| | Framer Motion | 12.42.2 |
| Backend | NestJS | 11.x |
| | Prisma ORM | 7.9.0 |
| | PostgreSQL | 17 |
| | argon2 (hash de contraseñas) | 0.45.1 |
| Monorepo | pnpm workspaces + Turborepo | — |
| Infra local | Docker Compose (Postgres, Redis, MinIO, Mailpit) | — |

**Paquetes compartidos:** `@lcj/config`, `@lcj/types`, `@lcj/ui`.

> `@lcj/utils` se **eliminó en la Fase 10**: se creó en la Fase 1 como marcador
> de posición y en diez fases nadie lo importó nunca. Los ayudantes que iba a
> alojar terminaron donde correspondía — la política compartida en
> `@lcj/types`, el formateo de presentación en `apps/web/lib/format.ts` — y el
> paquete solo costaba una tarea de build, typecheck y lint en cada corrida.

> ⚠️ **Nota sobre `@lcj/types`**: resuelve a `dist/`, no a `src/` (a diferencia de `@lcj/ui`, que exporta fuente TypeScript y se transpila vía `transpilePackages`). **Agregar un archivo nuevo a `packages/types` exige `pnpm --filter @lcj/types build`** antes de que `apps/web` lo vea. Sin eso: `TS2305 has no exported member`.

### 2.2 Clean Architecture y Ports & Adapters

El patrón está aplicado **donde hay una frontera real con el mundo exterior**, no como ceremonia uniforme sobre todo el código.

Dos puertos existen hoy, ambos con la misma disciplina:

```
modules/geography/                    common/storage/
├── domain/                           ├── domain/
│   ├── geo-department.ts             │   └── storage-provider.port.ts
│   ├── geo-municipality.ts           ├── infrastructure/
│   └── geography-source.port.ts      │   └── local-disk.provider.ts
├── infrastructure/                   ├── storage.service.ts
│   └── api-colombia/                 └── storage.module.ts
├── application/
│   └── colombia.seeder.ts
├── geography.service.ts
└── geography.module.ts
```

**La regla que hace que esto funcione — y que NO se debe romper:**

> El módulo **no exporta el adaptador ni el token del puerto**. Exporta únicamente el servicio de lectura.

`GeographyModule` exporta solo `GeographyService` (que inyecta solo `PrismaService`).
`StorageModule` exporta solo `StorageService`.

Consecuencia: **ningún módulo funcional *puede* alcanzar la API externa ni el disco**, aunque quiera. No es una convención que alguien deba recordar en la revisión de código: es imposible por el grafo de módulos.

Cambiar de proveedor = cambiar un `useClass`. Nada más se entera.

### 2.3 Autenticación

- **Access token**: JWT, 15 minutos, vive **solo en memoria** en el frontend (Zustand sin `persist`).
- **Refresh token**: JWT, 7 días, viaja **exclusivamente** como cookie `httpOnly` + `secure` + `sameSite=lax`, con `path=/auth`. Nunca en el body, nunca alcanzable desde JavaScript.
- **Rotación con detección de reúso**: cada refresh emite un token nuevo. Si se presenta uno que no coincide con ninguna sesión, se borran **todas** las sesiones de ese usuario.
- **`jti` único en cada refresh token.** Sin él, dos rotaciones dentro del mismo segundo producían un token byte a byte idéntico (`iat`/`exp` tienen resolución de un segundo), lo que anulaba silenciosamente la detección de reúso.
- **Hash**: `argon2.hash(password)` con defaults (argon2id). El seed usa exactamente la misma llamada — cualquier divergencia produciría un hash que `AuthService` no puede verificar.

**Consecuencia arquitectónica importante:** la protección de rutas del frontend **no puede ser middleware de Next.js**. El access token nunca llega al servidor Next, y la cookie de refresh está scoped al origen de la API. El middleware vería una request sin ninguna credencial. Por eso `SessionGate`/`GuestGate` son client-side, y son **frontera de UX, no de seguridad** — el backend es siempre quien autoriza.

### 2.4 RBAC

Tabla `Permission` (`resource`, `action`) + `RolePermission` (join con `CatRole`).

Decisión explícita del propietario del proyecto, **apartándose de doc04/doc05**, que describen los permisos como concepto sin esquema normalizado.

- `@RequirePermission('district', 'create')` en el controlador.
- `ScopeGuard` global lee `RolePermission` y aplica además alcance por rol (`scopeType`).
- Estado actual: **38 permisos, 90 grants** sembrados.

### 2.5 Auditoría

`AuditLog` inmutable (sin soft delete, sin `version` — un log de auditoría no se audita a sí mismo).

`@Audit('Entity', 'ACTION')` + `AuditInterceptor` en cada ruta de escritura.

> ⚠️ **`AuditModule` NO es global.** Todo módulo cuyo controlador use `AuditInterceptor` **debe importarlo explícitamente**. Omitirlo pasa lint, typecheck, test y build — y luego la aplicación entera se niega a arrancar.

### 2.6 Estrategia de pruebas

Tres niveles, con propósitos distintos:

| Nivel | Qué cubre | Comando |
|---|---|---|
| Unitario | Lógica de servicios con Prisma mockeado | `pnpm test` |
| E2E | App real arrancada, HTTP real, base real | `pnpm test:e2e` |
| Boot + smoke | Que la aplicación levante y las rutas existan | manual, obligatorio |

**Por qué los tres:** los bugs más caros de esta plataforma —ruta bajo otro prefijo, módulo que no instancia, rotación de token idéntica, 403 en una pantalla legítima— **fueron invisibles a lint, typecheck, test y build**. Solo aparecieron ejecutando la aplicación de verdad.

---

## 3. Estado real del desarrollo

| Fase | Nombre | Estado |
|---|---|---|
| 1 | Infraestructura base (monorepo, Docker, CI) | ✅ Terminada |
| 2 | Infraestructura compartida backend | ✅ Terminada |
| 3 | Design System (`@lcj/ui`) | ✅ Terminada |
| 4 | Backend Auth / Users / Roles / Permisos / Organización | ✅ Terminada |
| 5 | Frontend Base (login, layout, rutas, PWA, tema) | ✅ Terminada |
| 6 | Organización | ✅ Terminada |
| 7 | **Personas y Asistencia** | ✅ **Terminada** |
| 8 | **Eventos y Ofrendas** | ✅ **Terminada** |
| 9 | **Dashboard, Reportes y Mapa de Colombia** | ✅ **Terminada** |
| 10 | PWA completa, offline, performance, documentación | ⏳ Pendiente |

### Detalle de la Fase 6

| Módulo | Backend | Frontend | Estado |
|---|---|---|---|
| Catálogos geográficos + Seeder | ✅ | ✅ | ✅ Terminado |
| Organigrama | ✅ | ✅ | ✅ Terminado |
| Distritos | ✅ | ✅ | ✅ Terminado |
| Casas de Paz | ✅ | ✅ | ✅ Terminado |
| Historial de liderazgo | ✅ | ✅ | ✅ Terminado |
| Iglesia + Configuración | ✅ | ✅ | ✅ Terminado |
| Storage + Upload de archivos | ✅ | ✅ | ✅ Terminado |
| Pastores Generales | ✅ | ✅ | ✅ Terminado |
| Líderes | ✅ | ✅ | ✅ Terminado |

### Detalle de la Fase 7

| Módulo | Backend | Frontend | Estado |
|---|---|---|---|
| Etapas del proceso (`CatPersonStage`) | ✅ | ✅ | ✅ Terminado |
| Personas (CRUD, foto, filtros, paginación) | ✅ | ✅ | ✅ Terminado |
| Historial de Casa de Paz + traslado | ✅ | ✅ | ✅ Terminado |
| Scope por fila (`ScopeGuard` sobre `Person`) | ✅ | — | ✅ Terminado |
| Reunión semanal (creación lazy idempotente) | ✅ | ✅ | ✅ Terminado |
| Checklist de asistencia + marcar/desmarcar todos | ✅ | ✅ | ✅ Terminado |
| Bloqueo semanal ISO-8601 | ✅ | ✅ | ✅ Terminado |
| Desbloqueo temporal (7 días) con motivo y auditoría | ✅ | ✅ | ✅ Terminado |
| Crear persona desde la asistencia | ✅ | ✅ | ✅ Terminado |

---

## 4. Estado de cada módulo

### 4.1 Modelo de datos (21 modelos, 3 enums, 5 migraciones)

```
CatRole · LeadershipUnit · LeadershipMember · UserSession · AuditLog
CatDepartment · CatMunicipality · SystemSetting
Church · District · PeaceHouse · PeaceHouseLeadershipHistory
Permission · RolePermission
CatPersonStage · Person · PersonPeaceHouseHistory
MeetingSchedule · Meeting · Attendance · MeetingUnlock
enum LeadershipUnitStatus (ACTIVE/INACTIVE/SUSPENDED/RETIRED)
enum RecordStatus (ACTIVE/INACTIVE)
enum MeetingStatus (PROGRAMADA/EN_CURSO/PENDIENTE/REPORTADA/VALIDADA/CERRADA)
```

Migraciones aplicadas:
1. `20260727171726_init_shared_infrastructure`
2. `20260728023407_add_organization_and_rbac`
3. `20260728113431_add_geographic_catalogs_and_org_extensions`
4. `20260728160719_add_people_and_attendance`
5. `20260728203858_meeting_iso_week_unique`

**Por qué dos enums de estado:** `LeadershipUnitStatus` tiene cuatro estados porque describe el ciclo de vida de personas (doc06 §16). `RecordStatus` tiene dos porque describe registros estructurales, que doc07 solo describe como abierto/cerrado. No unificarlos.

**Por qué `Meeting` materializa `isoYear`/`isoWeek`:** son derivables de `meetingDate`, pero sin columnas reales no existe `@@unique([meetingScheduleId, isoYear, isoWeek])`, y sin esa restricción dos peticiones simultáneas crean dos reuniones para la misma semana. Una restricción que solo vive en el código no es una restricción.

### 4.2 Backend — 12 módulos, 60 endpoints

`auth` · `users` · `roles` · `permissions` · `organization` · `districts` · `peace-houses` · `geography` · `settings` · `files` · `people` · `attendance`

Infraestructura compartida en `common/`: `audit` · `config` · `dto` · `exceptions` · `filters` · `interceptors` · `logger` · `pipes` · `prisma` · `redis` · `security` · `storage`

<details>
<summary>Inventario completo de endpoints (capturado del boot real)</summary>

```
POST   /auth/login                            GET    /auth/me
POST   /auth/refresh                          POST   /auth/logout

GET    /users                                 POST   /users
GET    /users/:id                             PATCH  /users/:id
DELETE /users/:id                             PATCH  /users/:id/password

GET    /roles                                 GET    /roles/:id

GET    /permissions                           POST   /permissions
GET    /permissions/:id                       PATCH  /permissions/:id
DELETE /permissions/:id                       GET    /permissions/roles/:roleId
POST   /permissions/role-assignments          DELETE /permissions/role-assignments/:id

GET    /organizations                         POST   /organizations
GET    /organizations/:id                     PATCH  /organizations/:id
DELETE /organizations/:id                     GET    /organizations/search
GET    /organizations/tree                    GET    /organizations/tree/:churchId

GET    /districts                             POST   /districts
GET    /districts/:id                         PATCH  /districts/:id
DELETE /districts/:id

GET    /peace-houses                          POST   /peace-houses
GET    /peace-houses/:id                      PATCH  /peace-houses/:id
DELETE /peace-houses/:id
GET    /peace-houses/:id/leadership-history

GET    /geography/departments                 GET    /geography/municipalities

GET    /settings                              GET    /settings/:key
PUT    /settings/:key                         DELETE /settings/:key

POST   /files/upload                          GET    /files/*path

GET    /people                                POST   /people
GET    /people/stages                         GET    /people/:id
PATCH  /people/:id                            DELETE /people/:id
GET    /people/:id/history                    POST   /people/:id/transfer

POST   /attendance/peace-houses/:peaceHouseId/meetings/current
GET    /attendance/meetings/:meetingId
PATCH  /attendance/meetings/:meetingId/people/:personId
POST   /attendance/meetings/:meetingId/mark-all
POST   /attendance/meetings/:meetingId/unlock
```
</details>

> ⚠️ **El `peaceHouseId` viaja en la RUTA, no en el cuerpo**, en `POST /attendance/peace-houses/:peaceHouseId/meetings/current`. `ScopeGuard` resuelve el recurso desde `request.params`; con el id en el cuerpo, todo Líder recibía 403 al abrir su propia reunión. El smoke test como Administrador no lo detectaba, porque ese rol está exento de scope.

> ⚠️ **El recurso Iglesia se expone como `/organizations` (PLURAL)**, no `/organization` como sugiere doc06 §19. Decidido en Fase 4; renombrar un módulo verificado para coincidir con una lista ilustrativa sería un cambio rompedor comprado a cambio de nada.

### 4.3 Frontend

**Pantallas reales:** `/login` · `/recuperar-clave` (placeholder honesto) · `/organigrama` · `/distritos` · `/casas-de-paz` · `/pastores-generales` · `/lideres` · `/configuracion` · `/personas` · `/reuniones` · `/design-system` (demo interno de Fase 3)

**Placeholders de módulo** (estructura de navegación, sin funcionalidad): `/dashboard` · `/reportes` · `/auditoria`

**Componentes propios (19):** `attendance/unlock-meeting-modal` · `auth/{role-gate,session-gate}` · `common/file-upload` · `layout/{app-brand,app-shell,module-placeholder}` · `organization/{confirm-delete-modal,district-form-drawer,district-node,leadership-form-drawer,mappers,organization-search,organization-summary,peace-house-detail-drawer,peace-house-form-drawer,setting-form-drawer}` · `people/{person-detail-drawer,person-form-drawer}` · `pwa/service-worker-registration`

**Hooks (15):** `use-attendance` · `use-auth` · `use-church` · `use-districts` · `use-file-upload` · `use-geography` · `use-leadership-crud` · `use-leadership-list` · `use-leadership-units` · `use-organization-tree` · `use-peace-houses` · `use-people` · `use-resource-list` · `use-role-id` · `use-session-bootstrap`

**Capa de datos:** `lib/http-client.ts` (envelope, refresh silencioso, paginación, subida con progreso) · `lib/api/{attendance,districts,files,geography,organization,peace-houses,people,settings,users,query-string}.ts`

### 4.4 Datos sembrados

| Qué | Cantidad | Origen |
|---|---|---|
| Roles | 4 | `prisma/seed.ts` |
| Permisos | 46 | `prisma/seed.ts` |
| Grants rol↔permiso | 117 | `prisma/seed.ts` |
| Etapas del proceso | 6 | `prisma/seed.ts` |
| Iglesia | 1 | `prisma/seed.ts` |
| Administrador bootstrap | 1 | `prisma/seed.ts` |
| Departamentos | 33 | api-colombia.com |
| Municipios | 1.123 | api-colombia.com |

**Credenciales de desarrollo:** `admin` / `Admin123*` — **públicas por estar committeadas**. Override: `SEED_ADMIN_PASSWORD=<secreto> pnpm db:seed`. Cambiar antes de cualquier despliegue real.

---

## 5. Decisiones arquitectónicas congeladas

No modificar sin un problema crítico de seguridad, integridad de datos o rendimiento.

| # | Decisión | Razón |
|---|---|---|
| 1 | `LeadershipUnit` + hasta 2 `LeadershipMember`, no `User` plano | El dominio administra parejas, no personas (doc06 §3) |
| 2 | Refresh token solo en cookie `httpOnly`, access token solo en memoria | Inalcanzable desde JS, incluso con XSS |
| 3 | Protección de rutas client-side, nunca middleware Next | Consecuencia forzosa de (2) — el servidor Next no ve credenciales |
| 4 | RBAC normalizado (`Permission`/`RolePermission`) | Aprobado explícitamente, apartándose de doc04/doc05 |
| 5 | `GeographySource` como puerto; api-colombia como adaptador | Fuente intercambiable sin tocar nada más |
| 6 | El seeder geográfico corre **solo** en instalación, nunca en boot | Una API caída no puede demorar ni tumbar el arranque |
| 7 | `codeDane` nullable + `externalId` + `@@unique([sourceName, externalId])` | api-colombia no publica DANE; el UUID interno es la única llave que relacionan las entidades |
| 8 | `StorageProvider` como puerto; disco local como adaptador | MinIO sin librería cliente sería un módulo que compila y falla en runtime |
| 9 | Los módulos que exponen puertos **no exportan el adaptador** | Convierte la regla en imposible de violar, no en recordable |
| 10 | Solo se almacena la **ruta** del archivo, nunca el binario (doc04 §15) | — |
| 11 | Upload en dos pasos: `/files/upload` → `path` → guardar en la entidad | Evita reimplementar límites de MIME y tamaño en seis controladores |
| 12 | Dos enums de estado (`LeadershipUnitStatus` / `RecordStatus`) | Describen ciclos de vida distintos |
| 13 | Soft delete universal en tablas principales; `AuditLog` inmutable | doc04 §13/§14 |
| 14 | Optimistic locking vía `version` en tablas principales | doc04 §14 |
| 15 | El recurso Iglesia se expone en `/organizations` (plural) | Coherencia con el módulo ya verificado |
| 16 | Modo oscuro es v2.0, no v1.0 | doc22; los tokens `.dark` existen pero no hay toggle |
| 17 | Mapa SVG de Colombia aplazado a Fase 9 | Requiere datos que solo existirán entonces |
| 18 | `jti` único en cada refresh token | Sin él, la detección de reúso no funciona |
| 19 | La reunión semanal se crea **bajo demanda** (lazy), nunca por cron | Un job que falla un domingo deja a todo el país sin planilla, y nadie se entera hasta el lunes |
| 20 | Idempotencia por restricción de BD (`@@unique` sobre semana ISO) + captura de `P2002` | Dos peticiones simultáneas son la norma, no el caso raro |
| 21 | Semana ISO-8601 (lunes 00:00 → domingo 23:59:59), calculada, **nunca almacenada** | Una bandera almacenada necesita un job semanal cuyo fallo deja reuniones editables para siempre, en silencio |
| 22 | El desbloqueo es **temporal** (7 días) y exige motivo | Una excepción que nadie puede explicar un mes después no es trazable: es solo una excepción |
| 23 | La pertenencia de una `Person` se resuelve por el período abierto de `PersonPeaceHouseHistory` | Tras un traslado la regla sigue siendo cierta sin actualizar nada; una persona sin período abierto queda fuera de alcance (falla cerrado) |
| 24 | El `.env` vive en la **raíz** del monorepo y se resuelve desde el archivo, no desde el `cwd` | Con una ruta relativa al `cwd`, arrancar desde la carpeta equivocada produce el mismo error que una variable ausente |

---

## 6. Convenciones del proyecto

### Base de datos
- PK `UUID`. Fechas en UTC. Dinero en `Decimal`, nunca `Float`. Coordenadas en `Decimal(9,6)`.
- Nombres de tablas y columnas **en inglés**.
- Tabla principal = `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`, `status`, `version`.
- Tablas técnicas (`UserSession`, `RolePermission`) y de log (`AuditLog`) **no** llevan ese conjunto.

### Backend
- Estructura por módulo: `dto/` · `*.service.ts` · `*.controller.ts` · `*.module.ts` · `*.service.spec.ts`.
- Excepciones estándar de Nest. Mensajes de negocio **en español** (los ve el usuario).
- Respuesta siempre envuelta: `{ success, message, data, meta? }`.
- Paginación: `?page=1&pageSize=20&sort=name&order=asc&search=texto`. `pageSize` tope **100**.

### Frontend
- Idioma de la interfaz: **español**. Identificadores, comentarios y nombres de archivo: **inglés**.
- Un archivo por responsabilidad. Cliente HTTP → `lib/api/*` → hooks → componentes.
- Toda mutación invalida las queries que dependen de ella, incluido el organigrama cuando corresponda.
- Formularios: react-hook-form + Zod. Formularios grandes en `Drawer`, confirmaciones en `Modal` (doc18 §17/§18).
- **Los drawers deben re-hidratar el formulario en cada apertura**, o una edición puede sobrescribir una fila con datos de otra.
- **Las fechas del wire son `string`, no `Date`** — `JSON.parse` nunca revive fechas.

### Design System
- Todo componente visual sale de `@lcj/ui`. No se crean botones, tarjetas ni tablas propias en `apps/web`.
- Colores solo desde tokens. Nunca hex sueltos en componentes.

---

## 7. Reglas obligatorias para nuevos módulos

1. **Leer este documento primero.** Si algo lo contradice, este documento manda.
2. **Reutilizar antes que crear.** Revisar `@lcj/ui`, `components/organization/`, `hooks/use-resource-list`, `lib/api/query-string`, `lib/api-error-message` antes de escribir nada nuevo.
3. **Si el controlador usa `AuditInterceptor`, importar `AuditModule` en su módulo.**
4. **Si el módulo habla con el mundo exterior**, hacerlo por un puerto, con el adaptador privado al módulo.
5. **Registrar los permisos en `prisma/seed.ts`** con su justificación documental. Un endpoint sin permiso sembrado devuelve 403 a todos.
6. **Soft delete siempre.** Nunca `DELETE` físico en tablas principales.
7. **Auditar toda escritura** de entidades de negocio.
8. **Nunca listas quemadas** de departamentos, municipios ni roles. Vienen de catálogo.
9. **Todo tipado.** Sin `any`. Los mocks de Jest necesitan genéricos explícitos (`jest.fn<Promise<unknown>, [Args]>()`).
10. **Ejecutar el flujo de validación completo** (sección 8) antes de dar el módulo por terminado.

---

## 8. Flujo de validación obligatorio

Ningún módulo se considera terminado hasta que **los siete** pasen:

```bash
pnpm lint          # 6/6 paquetes, cero warnings
pnpm typecheck     # 6/6 paquetes
pnpm test          # unitarios
pnpm test:e2e      # requiere Postgres + Redis arriba y base sembrada
pnpm build         # 6/6 paquetes
```

**6. Boot real:**
```bash
pnpm --filter @lcj/api build && node apps/api/dist/main.js
# Verificar en el log: "Mapped {/tu-ruta, MÉTODO}" y "Nest application successfully started"
```

**7. Smoke test HTTP:** login → endpoint nuevo → caso válido → casos inválidos → verificación de permisos por rol.

> ⚠️ **Matar los procesos `node` antes de verificar.** Un proceso viejo escuchando el puerto responde 404 y hace parecer que la ruta está mal declarada, cuando en realidad la aplicación no levantó.

**Estado actual de la validación** (2026-07-30, tras cerrar Fase 10):

| Comando | Resultado |
|---|---|
| `pnpm lint` | ✅ 5/5 paquetes (api, config, types, ui, web), sin warnings |
| `pnpm typecheck` | ✅ 5/5 paquetes |
| `pnpm test` | ✅ 342 pasando (1 skipped), apps/api |
| `pnpm --filter @lcj/api test:e2e` | ✅ 124 pasando, 7 suites |
| `pnpm --filter @lcj/web test:e2e` | ✅ 3 pasando (Playwright, navegador real: login, RN-1202, RN-1203) |
| `pnpm build` | ✅ 5/5 |
| Boot real | ✅ Nest arranca, rutas mapeadas, Prisma y Redis conectados |
| Smoke test | ✅ `POST /auth/login` y `GET /dashboard/summary` autenticado |

> El proyecto habla de "6/6 paquetes": el monorepo real tiene 5 (`api`, `config`, `types`, `ui`, `web`) — topología correcta, no un déficit.

---

## 9. Dependencias reutilizables

**Antes de escribir código nuevo, esto ya existe:**

| Necesidad | Usar |
|---|---|
| Listado con búsqueda/orden/paginación | `hooks/use-resource-list.ts` |
| Mensaje de error de API | `lib/api-error-message.ts` |
| Query string de filtros | `lib/api/query-string.ts` |
| Petición paginada | `apiFetchPaginated()` en `lib/http-client.ts` |
| Confirmación de borrado | `components/organization/confirm-delete-modal.tsx` |
| API → props del Design System | `components/organization/mappers.ts` |
| Selector de Unidad de Liderazgo por rol | `hooks/use-leadership-units.ts` |
| Formulario de pareja (cuenta compartida + 2 fotos) | `components/organization/leadership-form-drawer.tsx` |
| Listado paginado de Unidades de Liderazgo por rol | `hooks/use-leadership-list.ts` |
| Alta/edición/baja de una Unidad de Liderazgo | `hooks/use-leadership-crud.ts` |
| `CatRole.id` a partir de un `RoleName` | `hooks/use-role-id.ts` |
| Catálogos geográficos | `hooks/use-geography.ts` |
| Subir un archivo | `<FileUpload>` de `components/common/file-upload/` |
| Estado de una subida (progreso, cancelar) | `hooks/use-file-upload.ts` |
| Vista previa de archivo ya guardado | `useStoredFilePreview()` |
| Reglas de MIME y tamaño | `@lcj/types` → `validateUploadCandidate()` |
| Tabla, tarjetas, drawer, modal, KPI, badges | `@lcj/ui` |

**Componentes de dominio en `@lcj/ui`:** `OrganizationCard` · `PeaceHouseCard` · `PersonCard` · `MeetingCard` · `LeadersRow` · `EntityStatusBadge` · `MeetingStatusBadge` · `DomainCard` + `DomainCardMeta` + `DomainCardMetrics`

---

## 10. Deuda técnica pendiente

| # | Deuda | Impacto | Prioridad |
|---|---|---|---|
| 1 | Adaptador MinIO sin escribir (hoy disco local) | Bloquea despliegue multi-instancia | Media |
| 2 | `PersonCard`/`MeetingCard` existen en el DS sin módulo que los use | Ninguno hoy | Baja |
| 3 | `/organizations/dashboard` de doc06 §19 sin implementar | Dashboard organizacional pendiente | Baja |
| 4 | Cobertura E2E de `users`, `roles` y `permissions` incompleta | Módulos de Fase 4 sin red de seguridad | Media |
| 5 | Sin toggle de modo oscuro (tokens `.dark` existen) | v2.0 por decisión | Baja |
| 6 | Recuperación de contraseña es un placeholder sin backend | Funcionalidad prometida en el wireframe | Media |
| 7 | Un test unitario permanece skipped | Desconocido | Baja |
| 8 | Los archivos subidos y luego descartados quedan huérfanos en disco | Crece sin techo | Baja |
| 9 | Los E2E dejan datos en la base de desarrollo (81 Casas de Paz "Casa E2E …") | Ruido en pruebas manuales | Media |
| 10 | Sin cambio masivo de etapa ni exportación de Personas | Sin pedirse todavía | Baja |

---

## 11. Riesgos conocidos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | **`findTree` carga todos los distritos con todas sus casas en una consulta.** Con miles de Casas de Paz la respuesta crece sin techo | **Alta a escala** | Hoy aceptable (~600 filas). Antes de superar ~2.000 casas: carga diferida por distrito |
| 2 | El seeder geográfico depende de api-colombia.com **solo en instalación**. Si desaparece, una instalación nueva no puede sembrar | Media | Escribir un adaptador CSV/DIVIPOLA como respaldo. El puerto ya lo permite |
| 3 | `codeDane` está vacío en todo el catálogo | Media | Bloquea integraciones oficiales futuras. Requiere proveedor DIVIPOLA |
| 4 | ~~Credenciales del admin bootstrap son públicas~~ | ✅ **Resuelto (Fase 10)** | El seeder **falla cerrado**: con `NODE_ENV=production` y sin `SEED_ADMIN_PASSWORD` aborta con un mensaje que dice qué ejecutar. Un aviso al final de un log no es un control; nadie lee el log de un comando que funcionó |
| 5 | `meetingDay` es texto libre en base con select cerrado en el frontend | Baja | Un cliente que llame la API directo puede escribir cualquier cosa |
| 6 | ~~Sin backups ni runbook de despliegue documentados~~ | ✅ **Resuelto (Fase 10)** | `docs/deployment/README.md`: requisitos, las DOS ubicaciones de variables, instalación, migraciones, seed, geocodificación, respaldo con `pg_dump -Fc`, restauración, rollback y lista de verificación previa a producción |
| 7 | Tres planes maestros antiguos contradictorios siguen en `Documentos/` | Media | Este documento los arbitra |
| 8 | No hay base de datos de test separada; los E2E corren contra la de desarrollo | Media | Los tests usan sufijos únicos y no dependen de conteos globales |
| 9 | ~~`NEXT_PUBLIC_API_URL` ausente producía llamadas a `/undefined/auth/login` y un "credenciales incorrectas" engañoso~~ | ✅ **Resuelto (Fase 10)** | `lib/api-base-url.ts` es la única resolución y **lanza un error que nombra la variable y dónde ponerla**; el login lo advierte ANTES del intento. Sigue siendo obligatorio definirla en `apps/web/.env.local` |
| 10 | La ruta `/dashboard` pesa 118 kB por Recharts | Media | Revisar en Fase 10 (carga diferida de las gráficas) |

---

## 12. Roadmap hasta RC1

### Fase 6 — Cerrar Organización
1. ~~Conectar el frontend a `/files/upload`~~ ✅ **Terminado**
2. ~~Módulo Pastores Generales~~ ✅ **Terminado**
3. ~~Módulo Líderes~~ ✅ **Terminado**
4. ~~`/organizations/search`~~ ✅ **Terminado**

### Fase 7 — Personas y Asistencia ✅ **Terminada**
1. ~~Modelos Prisma y migración~~ ✅
2. ~~Backend de Personas (CRUD, traslado, historial, etapas)~~ ✅
3. ~~Scope por fila en `ScopeGuard`~~ ✅
4. ~~Creación lazy de `Meeting` y endpoints del checklist~~ ✅
5. ~~Bloqueo ISO-8601 y desbloqueo temporal~~ ✅
6. ~~Frontend de Personas~~ ✅
7. ~~Frontend de Asistencia~~ ✅

Reglas de negocio aprobadas por el usuario y ya implementadas: reunión bajo demanda e idempotente · semana ISO-8601 · desbloqueo temporal de 7 días con motivo, solo Administrador y Pastor de Distrito · una reunión por Casa de Paz y semana ISO · cambiar el horario no altera reuniones ya creadas · cambiar de Líder a mitad de semana no crea otra reunión · el historial de asistencia nunca se borra físicamente · toda edición tras un desbloqueo queda en `AuditLog`.

### Fase 8 — Eventos y Ofrendas ✅ **Terminada**
1. ~~Modelos Prisma `SermonTheme`, `Offering`, `MeetingPhoto` y migración~~ ✅
2. ~~Catálogo de temas de predicación (`/sermon-themes`)~~ ✅
3. ~~Registro de la reunión: tema, predicador, observaciones, fotografías (`/meetings/:id/report`, `/photos`)~~ ✅
4. ~~Ofrenda de la reunión (`PUT|DELETE /meetings/:id/offering`)~~ ✅
5. ~~Historial y estadísticas de ofrendas (`/offerings`, `/offerings/summary`)~~ ✅
6. ~~Frontend: pantalla de Reunión ampliada con tema, ofrenda y fotografías~~ ✅
7. ~~Frontend: pantallas de Ofrendas y de Temas de predicación~~ ✅
8. ~~Validación completa: lint, typecheck, 258 unit, 120 E2E, build, arranque real y smoke test HTTP~~ ✅

Decisiones tomadas en esta fase: **una sola pantalla por reunión** (doc08 §32 dibuja la asistencia con "💰 Ofrenda · 📸 Fotografías · 📝 Tema" debajo, y el líder llena todo en la misma sesión) · **una sola ofrenda por reunión**, por eso el endpoint es `PUT` y no `POST` (RN-039) · **las fotografías se ocultan, nunca se eliminan** (RN-044) · **el candado de la ofrenda es el mismo de la asistencia**: una reunión, una regla · el promedio de ofrendas se calcula **por ofrenda registrada**, no por semana del calendario — una semana sin reportar es un dato ausente, no un cero · el catálogo de temas es **global**: no existe "mi tema", y por eso `delete` es solo del Administrador.

### Fase 9 — Dashboard, Reportes y Mapa ✅ **Terminada**
1. ~~Paleta oficial adoptada en los tokens (`Banco-imagenes/colores-proyecto.jpg`)~~ ✅
2. ~~Coordenadas en el catálogo geográfico + geocodificación única (`pnpm db:geocode:geo`)~~ ✅
3. ~~Backend de indicadores: KPIs con comparativo, series mensuales, agregado del mapa~~ ✅
4. ~~Backend de reportes + exportación a Excel con ExcelJS~~ ✅
5. ~~Dashboard con Recharts, diferenciado por rol~~ ✅
6. ~~Mapa nacional con Leaflet + clustering~~ ✅
7. ~~Pantalla de Reportes con descarga~~ ✅
8. ~~Validación: lint, typecheck, 320 unit, 120 E2E, build, arranque real, smoke HTTP y verificación visual en navegador~~ ✅

**El mapa dejó de ser una dependencia externa sin resolver.** No se usa un SVG con 33 paths: se usa **Leaflet con tiles gratuitos sin API key** y puntos que salen de coordenadas propias, geocodificadas una sola vez y guardadas en base. La RN-1103 se cumple — los datos son 100 % nuestros y no dependen de Google Maps.

Decisiones de esta fase: los **"cuatro dashboards por rol" no son cuatro pantallas** — son las mismas cuatro preguntas cuya respuesta cambia porque el servidor acota por rol (RN-1302), y `scopeLabel` lo dice en voz alta · **una definición por reporte, dos renderizadores** (pantalla y Excel leen la misma lista de columnas) · el color de las gráficas se **validó con herramienta**, no a ojo: `#1E88E5` pasa las seis comprobaciones en claro y oscuro, y `#D4A017` NO alcanza contraste como marca de datos · **solo Colombia** se aplica en tres capas: consulta (`country=co`), datos (`isWithinColombia`) y vista (`maxBounds` + `minZoom`).

### Fase 10 — RC1
PWA completa, offline, sincronización, cache, performance (Lighthouse), accesibilidad, SEO, notificaciones, logs, refactorizaciones, eliminación de código muerto, documentación técnica.

**RN-1202** (doc11 §11): "El sistema deberá funcionar con conectividad limitada para consultas previamente almacenadas y recursos estáticos." La ESCRITURA offline ya existía (`lib/offline/queue-db.ts` + `sync-client.ts`); lo que faltaba era la LECTURA: que las pantallas ya vistas abran con datos aunque no haya conexión. Se implementó persistiendo el caché de `@tanstack/react-query` con `@tanstack/react-query-persist-client` (`PersistQueryClientProvider` en `app/providers.tsx`) y un persister de `@tanstack/query-async-storage-persister` sobre `lib/offline/query-persister.ts`, que adapta IndexedDB **nativo** (sin idb/dexie, misma convención que `queue-db.ts`) a la interfaz `AsyncStorage`. `maxAge` de 24 horas; solo se persisten queries en estado `success` (`shouldDehydrateQuery`), para no reponer offline un error o una carga a medias.

**Límite conocido de RN-1202** (encontrado con el primer test E2E real de Playwright, `apps/web/e2e/offline-flow.e2e.spec.ts`): la cobertura real es "lectura con conectividad limitada mientras la sesión sigue activa en memoria" — navegar dentro de la SPA sin recargar —, NO un arranque en frío totalmente offline. Un `page.reload()` sin red falla porque (1) el service worker (`apps/web/public/sw.js`) no sirve hoy el shell de la app offline, y (2) aunque lo hiciera, `useSessionBootstrap` dispara un `POST /auth/refresh` online-only en cada arranque, y el token de sesión vive solo en memoria (`store/session-store.ts`), así que `SessionGate` redirige a `/login` sin red. Resolverlo exigiría cachear el shell en el service worker y decidir cómo tratar una sesión "expirada" sin conexión — ambas son decisiones de producto/seguridad mayores, deliberadamente fuera de esta fase. El test b) del archivo arriba mencionado quedó reescrito para probar el alcance real (sin `reload()`).

**Bug real encontrado y corregido con el e2e de escritura offline (RN-1203)**: el caso c) del mismo archivo (`offline-flow.e2e.spec.ts`) reveló que crear una Persona sin conexión dejaba el formulario colgado para siempre — botón deshabilitado, sin cola, sin aviso, sin error. Causa: `@tanstack/react-query` usa `networkMode: 'online'` por defecto, y al ver `navigator.onLine === false` (que sí cambia con `page.context().setOffline(true)`, a diferencia de lo asumido antes) deja la mutación "paused" **sin llegar a invocar `mutationFn`** — y es justo `mutationFn`, vía `withOfflineFallback`, quien detecta la falta de red y encola la operación en IndexedDB. Dos mecanismos de "modo offline" pisándose. Corregido fijando `defaultOptions.mutations.networkMode: 'always'` en el `QueryClient` de `app/providers.tsx`, para que la app siga manejando offline con su propia lógica. De paso, `lib/http-client.ts` sumó un timeout de 20 s a `fetch`: sin él, una conexión que se corta a mitad de una respuesta (no un rechazo limpio) puede dejar la petición colgada indefinidamente, sin producir nunca el error de transporte que `withOfflineFallback` espera.

**Criterio de RC1:** las diez fases cerradas, los siete pasos de validación en verde, deuda técnica de prioridad Alta resuelta, y runbook de despliegue documentado.

---

## 13. Versionado

Versionado semántico. `MINOR` = una fase cerrada.

| Versión | Hito |
|---|---|
| `0.1.0` – `0.5.0` | Fases 1-5 ✅ |
| `0.6.0` | Fase 6 ✅ |
| `0.7.0` | Fase 7 ✅ |
| `0.8.0` | Fase 8 ✅ |
| `0.9.0` | Fase 9 ✅ ← estamos aquí |
| `1.0.0-rc.1` | Fase 10 cerrada |
| `1.0.0` | Producción |

Commits: Conventional Commits (CommitLint activo). Sin atribución a IA.

---

## 14. Definition of Done

Un módulo está terminado cuando **todo** esto es cierto:

**Backend**
- [ ] Modelo Prisma con soft delete, auditoría y `version`
- [ ] Migración generada y aplicada
- [ ] DTOs de entrada validados con `class-validator`
- [ ] DTO de respuesta que **excluye explícitamente** campos sensibles
- [ ] Servicio con reglas de negocio y errores en español
- [ ] Controlador con `@RequirePermission` en cada ruta
- [ ] `@Audit` en cada escritura, y `AuditModule` importado
- [ ] Swagger completo, con todos los códigos de respuesta
- [ ] Permisos sembrados en `prisma/seed.ts`, con justificación documental
- [ ] Paginación, filtros y búsqueda donde corresponda
- [ ] Tests unitarios de las reglas de negocio

**Frontend**
- [ ] Listado con búsqueda, filtros, orden y paginación
- [ ] Crear, editar, ver detalle y eliminar
- [ ] Formularios con react-hook-form + Zod
- [ ] Acciones de escritura **ocultas** para roles sin permiso
- [ ] Componentes del Design System, sin duplicar nada existente
- [ ] Estados de carga (Skeleton, nunca spinner infinito), error y vacío
- [ ] Responsive verificado
- [ ] Mutaciones invalidan todas las queries afectadas

**Integración**
- [ ] Contrato front↔back verificado **con la API arrancada**
- [ ] Cobertura E2E de los caminos felices y de los rechazos por permiso
- [ ] Scope por rol verificado con un usuario de ese rol

**Validación**
- [ ] `pnpm lint` ✅
- [ ] `pnpm typecheck` ✅
- [ ] `pnpm test` ✅
- [ ] `pnpm test:e2e` ✅
- [ ] `pnpm build` ✅
- [ ] Boot real, rutas confirmadas en el log ✅
- [ ] Smoke test HTTP ✅

**Entrega**
- [ ] Informe técnico: archivos creados, modificados, migraciones, endpoints, componentes, pruebas, riesgos, mejoras
- [ ] Este documento actualizado si cambió el estado, la deuda o los riesgos

---

## Apéndice — Instalación limpia (verificada)

```bash
cp .env.example .env                # una sola vez; la API y el CLI de Prisma leen este archivo
docker compose up -d
pnpm install
pnpm --filter @lcj/types build      # obligatorio antes de compilar apps/web
npx prisma migrate deploy           # 5 migraciones
pnpm db:seed                        # roles, permisos, etapas, Iglesia, admin
pnpm db:seed:geo                    # 33 departamentos + 1.123 municipios
pnpm dev
```

Login: `admin` / `Admin123*`

> El `.env` vive en la **raíz** del monorepo y está en `.gitignore`; `.env.example` sí se versiona. La API lo resuelve desde su propio archivo de configuración, no desde el `cwd`, así que funciona igual bajo `nest start`, Jest y Turbo. Una variable exportada en la shell sigue teniendo prioridad sobre el archivo — así inyectan sus secretos CI y producción.

> `pnpm db:migrate` (`prisma migrate dev`) es **interactivo** y falla en entornos no interactivos. Equivalente: `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o <migración>` seguido de `prisma migrate deploy`.

---

*Documento generado a partir del código realmente implementado, verificado contra el boot real de la API y el contenido de la base de datos. Actualizarlo es parte del Definition of Done de cada módulo.*
