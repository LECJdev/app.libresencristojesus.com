1. Objetivo de la Arquitectura

Definir la arquitectura técnica del sistema, estableciendo los principios de diseño, organización del código, tecnologías, patrones de desarrollo y estándares que deberán seguirse durante todo el proyecto.

La arquitectura debe cumplir con los siguientes principios:

Modular.
Escalable.
Fácil de mantener.
Preparada para crecimiento futuro.
Optimizada para dispositivos móviles.
Compatible con Progressive Web App (PWA).
Basada en Domain Driven Design (DDD).
2. Arquitectura General

La plataforma estará dividida en tres capas principales.

┌──────────────────────────────────────────────┐
│                 FRONTEND                     │
│         Next.js + React + TypeScript         │
└─────────────────────┬────────────────────────┘
                      │ REST API
┌─────────────────────▼────────────────────────┐
│                  BACKEND                     │
│        NestJS + Prisma + PostgreSQL          │
└─────────────────────┬────────────────────────┘
                      │
┌─────────────────────▼────────────────────────┐
│               BASE DE DATOS                  │
│                 PostgreSQL                   │
└──────────────────────────────────────────────┘
3. Stack Tecnológico
Frontend
Next.js (App Router)
React
TypeScript
Tailwind CSS
Shadcn/UI
React Hook Form
Zod
TanStack Query
Zustand
React SVG
Chart.js
Framer Motion
PWA (next-pwa o solución equivalente compatible con Next.js actual)
Backend
NestJS
Prisma ORM
PostgreSQL
JWT
Refresh Tokens
Passport
Swagger
Multer
ExcelJS
BullMQ
Redis
Infraestructura
Docker
Docker Compose
Nginx
GitHub
GitHub Actions
CI/CD
4. Filosofía Arquitectónica

El proyecto será construido usando Domain Driven Design (DDD).

No organizaremos el código por "controllers" o "services" globales.

Se organizará por dominios del negocio.

5. Dominios del Sistema
src

├── auth

├── organization

├── districts

├── peace-houses

├── meetings

├── attendance

├── people

├── offerings

├── dashboard

├── reports

├── notifications

├── audit

├── settings

└── shared

Cada dominio será independiente.

6. Monorepo

Toda la solución estará dentro de un único repositorio Git.

lcj-platform/

apps/
│
├── web/
│
├── api/
│
docs/
│
packages/
│
└── shared/
7. Arquitectura del Frontend

El frontend seguirá una arquitectura basada en módulos funcionales.

app/

(auth)

(dashboard)

(organization)

(districts)

(peace-houses)

(meetings)

(reports)

(settings)

Cada módulo tendrá:

components/

hooks/

services/

schemas/

types/

pages/

utils/
8. Arquitectura del Backend

Cada dominio será completamente independiente.

Ejemplo:

meetings/

controllers/

services/

repositories/

entities/

dto/

guards/

validators/

events/

No habrá servicios gigantes.

9. Comunicación

Toda comunicación será mediante API REST.

Frontend

↓

HTTP

↓

NestJS

↓

Prisma

↓

PostgreSQL
10. Modelo de Autenticación

JWT.

Refresh Token.

RBAC.

Permisos.

Auditoría.

11. Gestión del Estado

No utilizaremos Redux.

Se utilizará:

Zustand (estado global ligero).
TanStack Query (datos del servidor).
React Hook Form (formularios).
12. Validaciones

Toda validación existirá en dos niveles.

Frontend.

Backend.

Nunca confiar únicamente en el navegador.

13. Manejo de Archivos

Las fotografías no serán almacenadas dentro de PostgreSQL.

Se almacenarán en un almacenamiento de archivos.

Inicialmente:

storage/

meetings/

people/

leaders/

districts/

En el futuro podrá migrarse a S3, Azure Blob o Cloud Storage sin modificar la lógica de negocio.

14. Progressive Web App

La plataforma será una PWA.

Características:

Instalación desde navegador.
Pantalla completa.
Icono propio.
Splash Screen.
Actualización automática.
Caché inteligente.
Preparada para funcionamiento offline parcial.
15. Diseño Mobile First

Toda pantalla deberá diseñarse primero para móvil.

Después adaptarse a escritorio.

No al contrario.

16. Sistema de Diseño (Design System)

Toda la interfaz deberá utilizar componentes reutilizables.

Nunca crear botones diferentes para cada módulo.

Ejemplo:

Button

Card

Modal

Dialog

Alert

Table

Avatar

Badge

Input

Select

Chart

DataTable

StatisticCard
17. Identidad Visual

La plataforma utilizará la identidad institucional de Libres en Cristo Jesús.

Paleta principal
Azul institucional

Uso:

Barra superior.
Menú lateral.
Botones principales.
Enlaces.

Representa:

Confianza.

Estabilidad.

Autoridad.

Azul claro

Uso:

Tarjetas.
Fondos secundarios.
Indicadores.

Representa:

Cercanía.

Servicio.

Dorado

Uso:

Botones destacados.
Indicadores especiales.
Logros.
Métricas importantes.

Representa:

Excelencia.

Reconocimiento.

Blanco

Color predominante.

Representa:

Limpieza.

Claridad.

Gris muy claro

Fondos.

Separadores.

Contenedores.

Verde

Indicadores positivos.

Rojo

Errores.

Alertas.

18. Dashboard

Todos los dashboards compartirán la misma estructura.

Filtros

↓

KPIs

↓

Gráficas

↓

Tablas

↓

Detalle
19. Dashboard Organización

Será independiente del Dashboard de métricas.

Permitirá visualizar:

Organigrama

↓

Distrito

↓

Casa de Paz

↓

Liderazgo

Con fotografías.

20. Dashboard Cobertura Nacional

Utilizará un SVG de Colombia.

Nunca dependerá de Google Maps.

Flujo:

Colombia

↓

Departamento

↓

Municipio

↓

Distrito

↓

Casa de Paz
21. Auditoría

Todas las operaciones importantes generarán eventos de auditoría.

Ejemplo:

Usuario

Acción

Entidad

Valor Anterior

Valor Nuevo

Fecha

IP
22. Escalabilidad

La arquitectura permitirá agregar nuevos módulos sin modificar los existentes.

Ejemplo:

Escuela Bíblica

Bautismos

Consolidación

Encuentros

Ministerios

Tesorería

Inventario
23. Seguridad
JWT.
Refresh Token.
RBAC.
Validaciones.
Sanitización de datos.
Protección CSRF (cuando aplique según el tipo de autenticación).
Protección XSS.
Protección SQL Injection (a través de Prisma y buenas prácticas).
Rate Limiting.
Logs.
24. Rendimiento

Objetivos:

Carga inicial inferior a 2 segundos en condiciones normales.
Lazy Loading.
Code Splitting.
Optimización de imágenes.
Caché inteligente.
Consultas paginadas.
Virtualización para listas grandes cuando sea necesario.
25. Convenciones

Todo el proyecto deberá seguir:

SOLID.
Clean Code.
Clean Architecture (adaptada a DDD).
Repository Pattern.
DTO Pattern.
Dependency Injection.
Convenciones consistentes de nombres en inglés para el código y español para los textos visibles al usuario.
26. Documentación

Toda API deberá documentarse automáticamente mediante Swagger.

Toda funcionalidad deberá estar documentada en la carpeta:

/docs
27. Estrategia de Versionado

Se utilizará:

Git Flow simplificado.
Semantic Versioning (SemVer).

Ejemplo:

v1.0.0

v1.1.0

v2.0.0
28. Roadmap Técnico
Fase 1

Arquitectura.

Fase 2

Autenticación.

Fase 3

Organización.

Fase 4

Usuarios.

Fase 5

Casas de Paz.

Fase 6

Eventos.

Fase 7

Asistencia.

Fase 8

Dashboard.

Fase 9

Reportes.

Fase 10

PWA.

Fase 11

Optimización.

Recomendaciones arquitectónicas adicionales

Antes de empezar a programar, incorporaría cuatro decisiones que harán la plataforma mucho más robusta desde el primer día:

1. Arquitectura hexagonal (Ports & Adapters)

Aunque usemos DDD, recomiendo que el núcleo del negocio no dependa de NestJS, Prisma ni PostgreSQL. La lógica de negocio debe permanecer aislada de la infraestructura, facilitando pruebas, mantenimiento y posibles cambios tecnológicos en el futuro.

2. Sistema de eventos de dominio

Acciones como registrar una reunión, crear un asistente o cambiar un liderazgo pueden publicar eventos internos (MeetingReported, PersonCreated, LeadershipChanged). Esto permitirá añadir notificaciones, auditoría o integraciones futuras sin modificar la lógica principal.

3. Configuración centralizada

Todas las configuraciones de la iglesia (logo, colores, nombre, parámetros, duración de sesiones, reglas de notificación, etc.) deberían almacenarse en un módulo de configuración y no quedar codificadas en el frontend o backend. Esto facilitará cambios futuros sin necesidad de modificar el código.

4. Motor de permisos basado en políticas

Aunque inicialmente existan solo cuatro roles, sugiero implementar un sistema de permisos por políticas (policies) además de los roles. Así, en el futuro será sencillo permitir excepciones, como dar acceso temporal a un líder para ver un reporte específico o delegar funciones sin crear nuevos roles.