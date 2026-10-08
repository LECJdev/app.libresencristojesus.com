MASTER DEVELOPMENT EXECUTION PLAN
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

OBJETIVO

Este documento define el orden exacto de construcción del sistema.

Cada Sprint deberá terminar funcionando al 100%.

Nunca se desarrollará una funcionalidad incompleta.

La IA deberá respetar estrictamente este orden.

ARQUITECTURA GENERAL
                    NEXT.JS

                       │

──────────────────────API──────────────────────

                      NESTJS

                       │

────────────────────SERVICES───────────────────

                       │

────────────────────PRISMA─────────────────────

                       │

──────────────────POSTGRESQL───────────────────
REGLAS DEL PROYECTO

La IA deberá cumplir SIEMPRE estas reglas.

Nunca

❌ Duplicar componentes

❌ Duplicar lógica

❌ Crear estilos inline

❌ Crear consultas SQL manuales

❌ Saltarse la arquitectura

❌ Crear archivos innecesarios

❌ Ignorar el Design System

Siempre

✅ Componentes reutilizables

✅ Clean Architecture

✅ SOLID

✅ Repository Pattern

✅ DTO

✅ Guards

✅ Pipes

✅ Swagger

✅ Prisma

✅ TypeScript estricto

ROADMAP GENERAL
FASE 1

Infraestructura

↓

FASE 2

Autenticación

↓

FASE 3

Organización

↓

FASE 4

Usuarios

↓

FASE 5

Personas

↓

FASE 6

Reuniones

↓

FASE 7

Asistencia

↓

FASE 8

Ofrendas

↓

FASE 9

Dashboard

↓

FASE 10

Reportes

↓

FASE 11

PWA

↓

FASE 12

Testing

↓

FASE 13

Producción
FASE 1
Infraestructura

Objetivo

Dejar funcionando completamente el proyecto.

Entregables

Next.js
NestJS
PostgreSQL
Prisma
Docker
ESLint
Prettier
Husky
CommitLint
Variables de entorno
CI básico

Criterio de aceptación

Todo levanta con Docker mediante un solo comando.

FASE 2
Autenticación

Entregables

Login
Logout
Refresh Token
JWT
Guards
Roles
Middleware
Auditoría de login

Criterio

Todos los roles ingresan correctamente.

FASE 3
Organización

Entregables

Iglesia
Distritos
Casas de Paz
Organigrama
Municipios
Departamentos

Criterio

Toda la estructura se visualiza correctamente.

FASE 4
Usuarios

Entregables

CRUD Usuarios
Roles
Permisos
Cambio contraseña
Foto perfil
FASE 5
Personas

Entregables

CRUD
Historial
Traslados
Búsqueda
Estados
Fotografía
FASE 6
Reuniones

Entregables

Programación automática.

Registro semanal.

Tema.

Observaciones.

Foto.

Cerrar reunión.

FASE 7
Asistencia

Entregables

Registro.

Edición.

Bloqueo.

Historial.

Métricas.

FASE 8
Ofrendas

Entregables

Registro.

Historial.

Reportes.

Dashboard.

FASE 9
Dashboard

Esta será una fase exclusiva.

No desarrollar Dashboard antes.

Entregables

Dashboard General.

Dashboard Distrito.

Dashboard Casa Paz.

Mapa Colombia.

Organigrama.

KPIs.

Gráficas.

Timeline.

FASE 10
Reportes

Excel.

PDF.

Filtros.

Comparativos.

Indicadores.

FASE 11
PWA

Manifest.

Service Worker.

Offline básico.

Instalable.

Push Notifications (versión futura).

FASE 12
Testing

Unitarios.

Integración.

E2E.

Lighthouse.

Accesibilidad.

FASE 13
Producción

Docker.

NGINX.

HTTPS.

Backups.

Monitoreo.

CI/CD.

ORDEN DE DESARROLLO FRONTEND
Layout

↓

Sidebar

↓

Header

↓

Login

↓

Dashboard

↓

Organización

↓

Usuarios

↓

Personas

↓

Reuniones

↓

Asistencia

↓

Ofrendas

↓

Reportes
ORDEN DE DESARROLLO BACKEND
Nest

↓

Prisma

↓

Auth

↓

Users

↓

Roles

↓

Organization

↓

Persons

↓

Meetings

↓

Attendance

↓

Offerings

↓

Dashboard

↓

Reports

↓

Files

↓

Audit
CRITERIOS DE ACEPTACIÓN

Cada Sprint deberá cumplir:

Código

100%

Compila

100%

Sin errores TypeScript

100%

Lint

100%

Tests

100%

Swagger actualizado

100%

Documentación

100%

DEFINICIÓN DE TERMINADO (Definition of Done)

Una tarea solo se considera finalizada cuando:

Funciona.
Está documentada.
Tiene pruebas.
Está integrada.
Cumple el Design System.
Tiene permisos implementados.
Está registrada en auditoría (si aplica).
Pasa revisión de código.
ESTRUCTURA DEL REPOSITORIO
apps/
├── web/               # Next.js
└── api/               # NestJS

packages/
├── ui/                # Design System
├── types/             # Tipos compartidos
├── config/            # ESLint, TS, Prettier
├── auth/              # Utilidades de autenticación
├── utils/             # Helpers
└── validation/        # Esquemas Zod

prisma/
├── schema.prisma
├── seed.ts
└── migrations/

docs/
├── architecture/
├── api/
├── ux/
├── decisions/
└── deployment/
CONVENCIONES DE CÓDIGO
Frontend
Componentes en PascalCase.
Hooks con prefijo use.
Server Components por defecto.
Client Components solo cuando sean necesarios.
React Query para consumo de API.
Formularios con React Hook Form + Zod.
Backend
Un módulo por dominio.
Controladores ligeros.
Lógica en servicios.
Acceso a datos mediante repositorios.
DTO para todas las entradas y salidas.
Validación con class-validator.
ESTRATEGIA DE IA (Cursor)

La IA deberá trabajar siempre en ciclos cortos.

Ciclo de desarrollo
Leer documentación

↓

Crear módulo

↓

Compilar

↓

Corregir errores

↓

Ejecutar pruebas

↓

Documentar

↓

Continuar

Nunca deberá generar varios módulos grandes al mismo tiempo.

CHECKLIST DE CADA MÓDULO

Antes de dar por terminado un módulo deberá verificarse:

Arquitectura respetada.
Tipado estricto.
Sin duplicación de código.
Componentes reutilizables.
Responsive.
Accesible.
Permisos aplicados.
Auditoría aplicada.
API documentada.
Pruebas ejecutadas.
MATRIZ DE DEPENDENCIAS
Módulo	Depende de
Auth	Infraestructura
Usuarios	Auth
Organización	Usuarios
Personas	Organización
Reuniones	Personas + Organización
Asistencia	Reuniones
Ofrendas	Reuniones
Dashboard	Todos los anteriores
Reportes	Dashboard

Esto evita desarrollar funcionalidades fuera de orden.

PLAN DE VERSIONES
v1.0
Gestión completa de la iglesia.
Control de asistencia.
Ofrendas.
Dashboard.
Reportes.
Organigrama.
PWA.
v1.1
Notificaciones por correo.
Exportaciones avanzadas.
Mejoras de rendimiento.
v1.2
Notificaciones Push.
Modo offline con sincronización.
Agenda pastoral.
v2.0
Multiiglesia.
Consolidación de nuevos creyentes.
Escuela de liderazgo.
Módulo de eventos.
Módulo de ministerios.
Gestión de voluntarios.