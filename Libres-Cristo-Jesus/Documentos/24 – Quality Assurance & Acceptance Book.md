QUALITY ASSURANCE & ACCEPTANCE BOOK
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

OBJETIVO

Este documento define la metodología oficial de pruebas del proyecto.

Ningún módulo podrá darse por terminado sin cumplir este documento.

FILOSOFÍA

Cada funcionalidad deberá superar cinco niveles de validación:

Prueba Técnica

↓

Prueba Funcional

↓

Prueba de Integración

↓

Prueba UX

↓

Aprobación del Usuario

Solo entonces podrá marcarse como Finalizado.

MATRIZ DE CALIDAD

Cada módulo deberá cumplir:

Validación	Obligatoria
TypeScript	✅
ESLint	✅
Build	✅
Unit Test	✅
Integration Test	✅
E2E Test	✅
Responsive	✅
Accesibilidad	✅
Seguridad	✅
Auditoría	✅
DEFINITION OF DONE (DoD)

Una historia de usuario se considera terminada únicamente cuando:

Funciona correctamente.
Compila sin errores.
No presenta errores de TypeScript.
No presenta advertencias de ESLint.
Tiene pruebas automatizadas.
Está documentada.
Respeta el Design System.
Respeta la arquitectura.
Tiene permisos implementados.
Registra auditoría cuando corresponde.
Fue validada por el Product Owner.
CASOS DE PRUEBA

Cada módulo deberá incluir:

Caso Feliz

El usuario realiza la operación correctamente.

Resultado esperado:

Operación exitosa.

Datos Inválidos

Ejemplo:

Correo incorrecto.

Resultado esperado:

Mensaje de validación.

Sin Permisos

Ejemplo:

Un Líder intenta eliminar un Distrito.

Resultado esperado:

403 Forbidden.

Error Servidor

Simular error interno.

Resultado esperado:

Mensaje amigable.

Registro en auditoría.

Sin Internet (PWA)

Resultado esperado:

Mostrar modo offline.

No perder información.

ESCENARIOS GHERKIN
LOGIN
Feature: Inicio de sesión

Scenario: Usuario válido

Given el usuario existe

And la contraseña es correcta

When presiona "Ingresar"

Then accede al Dashboard correspondiente a su rol
CREAR PERSONA
Feature: Registro de Persona

Scenario: Registro correcto

Given el líder tiene sesión iniciada

When registra una nueva persona

Then la persona queda asociada a su Casa de Paz

And estará disponible para futuras asistencias
REGISTRAR ASISTENCIA
Feature: Asistencia

Scenario: Registrar asistencia

Given existe una reunión abierta

When el líder marca un asistente

Then la asistencia queda registrada

And se actualizan los indicadores
CERRAR REUNIÓN
Feature: Cierre de reunión

Scenario: Reunión finalizada

Given el líder terminó la reunión

When presiona "Cerrar reunión"

Then no podrá modificar la asistencia

And la reunión quedará bloqueada
PRUEBAS POR ROL
Administrador

Debe validar:

CRUD completo.
Permisos.
Auditoría.
Reportes.
Pastor General

Debe validar:

Dashboard global.
Distritos.
Reportes.

No podrá editar información fuera de sus permisos.

Pastor Distrito

Debe validar:

Casas de Paz.
Líderes.
Reportes del Distrito.
Líder

Debe validar:

Personas.
Reuniones.
Asistencia.
Ofrendas.

Nunca visualizar información de otra Casa de Paz.

PRUEBAS DE NEGOCIO
Regla 1

Una Persona solo puede pertenecer a una Casa de Paz activa.

Regla 2

Una reunión cerrada no podrá modificarse.

Regla 3

Solo un Líder podrá registrar asistencia en su Casa de Paz.

Regla 4

Los Pastores Generales pueden visualizar todos los Distritos.

Regla 5

Los Pastores de Distrito solo pueden administrar su Distrito.

Regla 6

El Administrador tiene acceso total.

PRUEBAS DE SEGURIDAD

Validar:

JWT inválido.
JWT expirado.
Refresh Token inválido.
Usuario inactivo.
Ataques XSS.
SQL Injection.
CSRF (si aplica).
Rate Limiting.
PRUEBAS RESPONSIVE

Resoluciones mínimas:

360 px

390 px

768 px

1024 px

1366 px

1920 px

Cada pantalla deberá ser completamente funcional.

PRUEBAS PWA

Validar:

Instalación.
Icono.
Splash Screen.
Funcionamiento sin conexión (cuando esté implementado).
Actualización del Service Worker.
PRUEBAS DE RENDIMIENTO

Objetivos:

Acción	Tiempo Máximo
Login	< 1 s
Dashboard	< 2 s
Abrir reunión	< 2 s
Registrar asistencia	< 1 s
Buscar persona	< 1 s
Reporte	< 5 s
Exportar Excel	< 30 s
PRUEBAS DE BASE DE DATOS

Validar:

Integridad referencial.
Índices.
Soft Delete.
Auditoría.
UUID.
Relaciones.
Cascadas controladas.
PRUEBAS API

Cada endpoint deberá validar:

PRUEBAS DASHBOARD

Validar:

KPIs.
Gráficas.
Mapa Colombia.
Organigrama.
Filtros.
Exportaciones.
CHECKLIST UI

Cada pantalla deberá validar:

Tipografía.
Colores institucionales.
Espaciado.
Iconografía.
Accesibilidad.
Responsive.
Skeleton.
Estados vacíos.
Estados de error.
PRUEBAS DE AUDITORÍA

Validar registro de:

Login.
Logout.
Crear Usuario.
Editar Usuario.
Crear Persona.
Traslado de Persona.
Crear Reunión.
Registrar Ofrenda.
Cerrar Reunión.
MATRIZ DE REGRESIÓN

Cuando un módulo cambie, deberán ejecutarse nuevamente las pruebas de:

Autenticación.
Permisos.
Dashboard.
Reportes.
PWA.

Esto evita que una mejora rompa funcionalidades existentes.

USER ACCEPTANCE TEST (UAT)

Antes de liberar una versión, realizar una sesión de validación con usuarios reales.

Participantes sugeridos:

1 Administrador.
2 Pastores Generales.
2 Pastores de Distrito.
4 Líderes de Casas de Paz.

Escenarios:

Iniciar sesión.
Crear una persona.
Registrar una reunión.
Marcar asistencia.
Registrar ofrenda.
Cerrar reunión.
Consultar indicadores.
Exportar reporte.

Recoger observaciones y clasificarlas en:

Críticas.
Altas.
Medias.
Bajas.
MATRIZ DE TRAZABILIDAD

Cada Historia de Usuario deberá vincularse con:

Requisito funcional.
Endpoint API.
Modelo de Base de Datos.
Pantalla.
Casos de prueba.
Pruebas automatizadas.
Resultado de aceptación.

Así será posible conocer el estado de cada funcionalidad en cualquier momento.

ESTRATEGIA DE VERSIONES

Cada versión seguirá este flujo:

Desarrollo
      │
Pruebas Unitarias
      │
Pruebas Integración
      │
Pruebas E2E
      │
UAT
      │
Release Candidate
      │
Producción

No se permitirá publicar directamente desde desarrollo.

AUTOMATIZACIÓN DE CALIDAD

El pipeline de CI deberá ejecutar automáticamente:

ESLint.
TypeScript.
Tests Unitarios.
Tests de Integración.
Cobertura.
Build.
Auditoría de dependencias.
Análisis estático.

Si alguna etapa falla, el despliegue deberá bloquearse.

INFORME DE CALIDAD

Cada Sprint finalizará con un reporte que incluya:

Funcionalidades completadas.
Casos de prueba ejecutados.
Casos aprobados.
Casos fallidos.
Cobertura de pruebas.
Incidencias abiertas.
Incidencias resueltas.
Riesgos conocidos.