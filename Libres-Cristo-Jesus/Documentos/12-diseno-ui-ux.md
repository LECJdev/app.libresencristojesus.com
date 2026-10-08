1. Objetivo

Definir la arquitectura física del proyecto, estándares de desarrollo, convenciones, patrones y reglas para que:

El código sea uniforme.
Sea fácil incorporar nuevos desarrolladores.
La IA genere código consistente.
El mantenimiento sea sencillo.
La escalabilidad esté garantizada.
2. Stack Tecnológico Oficial
Frontend
Next.js 15 (App Router)
React 19
TypeScript
Tailwind CSS
Shadcn/UI
Radix UI
TanStack Query
React Hook Form
Zod
Framer Motion
Lucide React
next-pwa
Backend
NestJS
Prisma ORM
PostgreSQL
JWT
Argon2
Swagger (OpenAPI)
BullMQ (para tareas futuras)
Redis (cache y colas)
Class Validator
Class Transformer
Infraestructura
Docker
Docker Compose
GitHub
GitHub Actions
Nginx
Let's Encrypt
PM2 (si se despliega sin contenedores)
3. Arquitectura General
Monorepo

apps/
    web/
    api/

packages/
    ui/
    types/
    utils/
    config/

prisma/

docs/

scripts/

docker/
4. Estructura del Monorepo
church-platform/

│

├── apps/

│      ├── api/

│      └── web/

│

├── packages/

│      ├── ui/

│      ├── utils/

│      ├── types/

│      └── config/

│

├── prisma/

│

├── docs/

│

├── docker/

│

├── scripts/

│

├── .github/

│

└── README.md
5. Frontend
apps/web

app/

components/

features/

hooks/

services/

providers/

store/

types/

lib/

styles/

public/
6. Organización por Dominio

Nunca organizar únicamente por tipo de archivo.

Correcto:

features/

people/

meetings/

districts/

dashboard/

organization/

Dentro de cada dominio:

people/

components/

hooks/

services/

types/

schemas/

pages/
7. Componentes

Tres niveles.

UI

Componentes reutilizables.

Ejemplo.

Button

Card

Input

Modal

Avatar
Shared

Componentes comunes.

Ejemplo.

Header

Sidebar

MetricCard

SearchBar
Feature

Componentes específicos.

Ejemplo.

AttendanceTable

MeetingForm

DistrictSelector
8. Backend
api/

src/

modules/

common/

config/

database/

auth/

main.ts
9. Organización Backend
modules/

people/

meetings/

districts/

dashboard/

organization/

Cada módulo tendrá:

controller

service

repository

dto

entities

validators

mappers

tests
10. Arquitectura Interna NestJS
Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database

Nunca acceder a Prisma directamente desde el controlador.

11. Patrón Repository

Toda consulta irá mediante repositorios.

Ejemplo.

MeetingRepository

PeopleRepository

DistrictRepository
12. DTO

Separar:

Create

Update

Response

Filter

Ejemplo.

CreateMeetingDto

UpdateMeetingDto

MeetingResponseDto

MeetingFilterDto
13. Mapper

Nunca devolver entidades Prisma directamente.

Siempre utilizar:

MeetingMapper

↓

MeetingResponseDto
14. Validaciones

Backend

Class Validator.

Frontend

Zod.

Nunca duplicar reglas innecesariamente.

15. Variables de Entorno

Nunca acceder directamente a:

process.env

Siempre utilizar:

ConfigService

o un wrapper equivalente en el frontend.

16. Nombres

Clases

PascalCase.

Variables

camelCase.

Constantes

UPPER_CASE.

Interfaces

IUserRepository

Enums

MeetingStatus
17. Imports

Siempre absolutos.

Incorrecto.

../../../components

Correcto.

@/components
18. Estado Global

Utilizar:

TanStack Query

para datos del servidor.

Zustand

solo para estado UI.

Nunca guardar información del backend en Zustand.

19. Formularios

Siempre.

React Hook Form

Zod

20. Peticiones HTTP

Nunca usar fetch directamente en los componentes.

Siempre pasar por una capa de servicios.

Ejemplo.

MeetingService

↓

ApiClient

↓

Axios
21. Cliente HTTP

Un único cliente.

ApiClient

Debe gestionar:

Token JWT.
Refresh Token.
Reintentos controlados.
Manejo uniforme de errores.
Interceptores.
22. Manejo de Errores

Nunca mostrar errores técnicos.

Incorrecto.

500 Internal Error

Correcto.

No fue posible guardar la reunión.
23. Logging

Backend.

Pino.

Frontend.

Solo durante desarrollo.

Nunca dejar console.log en producción.

24. Internacionalización

Preparar la estructura para i18n.

Aunque inicialmente solo exista español.

25. Archivos

Máximo recomendado:

300 líneas.

Si supera aproximadamente 300–400 líneas, evaluar dividir responsabilidades.

26. Funciones

Máximo recomendado:

40 líneas.

Una función debe tener una única responsabilidad.

27. Componentes React

No más de:

200 líneas.

Si crecen demasiado:

Dividir.

28. Comentarios

Comentar:

¿Por qué?

No:

¿Qué?

El código debe explicar el "qué".

Los comentarios deben explicar el contexto o decisiones no evidentes.

29. Git

Convención.

feature/dashboard

feature/attendance

bugfix/login

hotfix/token

refactor/reports

Commits.

feat:

fix:

refactor:

docs:

test:

style:

chore:

Ejemplo.

feat(meetings): add automatic weekly scheduler
30. Pull Request

Debe incluir:

Descripción.

Capturas.

Checklist.

Pruebas realizadas.

31. Calidad

ESLint.

Prettier.

Husky.

Lint Staged.

Obligatorios.

32. Testing

Backend

Jest.

Frontend

Vitest + React Testing Library.

33. Cobertura

Mínimo:

80%.

Objetivo:

90%.

34. Seguridad

Nunca almacenar:

Contraseñas.

Tokens.

Secretos.

En el código.

35. Performance

Frontend.

Lazy Loading.

Code Splitting.

Suspense.

Dynamic Imports.

Backend.

Paginación.

Índices.

Cache.

36. PWA

Manifest.

Service Worker.

Offline.

Splash.

Iconos.

Actualizaciones automáticas.

37. Accesibilidad

WCAG AA.

Todos los formularios deberán ser navegables con teclado y compatibles con lectores de pantalla.

38. Documentación

Todo módulo incluirá:

README.md

Con:

Objetivo.
Dependencias.
Endpoints (si aplica).
Flujo principal.
39. Scripts del Proyecto

El package.json del monorepo deberá incluir, como mínimo:

dev
build
start
lint
lint:fix
format
test
test:watch
test:coverage
db:migrate
db:seed
db:reset
db:studio
typecheck
prepare
40. CI/CD

Cada Pull Request deberá ejecutar automáticamente:

Instalar dependencias.
Verificar TypeScript.
Ejecutar ESLint.
Ejecutar Prettier (modo verificación).
Ejecutar pruebas.
Generar cobertura.
Construir (build) el frontend.
Construir (build) el backend.

No se permitirá fusionar cambios si alguna validación falla.

41. Gestión de Dependencias

Reglas:

Preferir librerías maduras y ampliamente mantenidas.
Evitar dependencias con poca actividad o sin mantenimiento.
Revisar el impacto en el tamaño del bundle antes de incorporar nuevas librerías.
Documentar el motivo de cada dependencia importante.
42. Configuración Compartida

La carpeta packages/config contendrá configuraciones reutilizables:

eslint-config
prettier-config
tsconfig
tailwind-preset

Esto asegura que frontend y backend compartan los mismos estándares cuando sea posible.

43. Estrategia para la IA

Todas las generaciones de código deberán seguir estas reglas:

No crear archivos duplicados.
Reutilizar componentes existentes.
No modificar contratos de API sin actualizar la documentación.
No cambiar el esquema de Prisma sin generar una migración.
No romper la compatibilidad con documentos anteriores.
Mantener nombres coherentes con el dominio del negocio.
Respetar la arquitectura por módulos.
44. Convención para Feature Flags (Preparado)

Para futuras versiones, las funcionalidades nuevas podrán activarse mediante Feature Flags.

Ejemplos:

Módulo de consolidación.
Integración con WhatsApp.
Reportes PDF.
Modo oscuro.

Esto permitirá desplegar nuevas funciones sin afectar a todos los usuarios.

45. Roadmap Técnico

Definir desde el inicio una hoja de ruta técnica:

Versión 1.0

Gestión de organización.
Casas de Paz.
Reuniones.
Asistencia.
Ofrendas.
Dashboards.
Reportes Excel.
PWA.

Versión 1.5

Notificaciones Push.
Consolidación pastoral.
Seguimiento de nuevos asistentes.

Versión 2.0

Integración con WhatsApp.
Firma digital de reportes.
Reportes PDF avanzados.
Modo oscuro.
Aplicación móvil con React Native (reutilizando gran parte del código y contratos API).
Conclusión

Con este documento ya tenemos una base técnica de nivel empresarial para iniciar el desarrollo. Hemos definido:

Arquitectura del monorepo.
Organización del código.
Estándares de frontend y backend.
Convenciones de nombres.
Estrategia de pruebas.
Calidad de código.
CI/CD.
Gestión de dependencias.
Preparación para futuras versiones.