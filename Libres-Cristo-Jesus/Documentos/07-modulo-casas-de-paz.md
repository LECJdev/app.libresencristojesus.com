Introducción

Todas las funcionalidades del sistema deberán implementarse mediante Historias de Usuario.

Cada historia contendrá:

ID
Prioridad
Módulo
Actor
Objetivo
Flujo principal
Criterios de aceptación
Reglas de negocio relacionadas
APIs involucradas
Tablas afectadas
Módulo 1 - Autenticación
US-001 Iniciar sesión
Prioridad

Alta

Actor

Todos los usuarios.

Historia

Como usuario de la plataforma, quiero iniciar sesión utilizando mi usuario y contraseña para acceder únicamente a la información permitida según mi rol.

Flujo Principal
Abrir aplicación.
Escribir usuario.
Escribir contraseña.
Validar credenciales.
Generar JWT.
Redireccionar al Dashboard correspondiente.
Criterios de aceptación

✅ Usuario válido.

✅ Contraseña válida.

✅ Usuario activo.

✅ Mostrar mensaje de error si falla.

✅ Registrar acceso en Auditoría.

Reglas relacionadas

RN-058

RN-059

APIs
POST /auth/login
Tablas

LeadershipUnit

UserSession

AuditLog

US-002 Recuperar contraseña

Como usuario quiero recuperar mi contraseña mediante un proceso seguro para volver a ingresar al sistema.

Criterios

Validar identidad.
Generar token temporal.
Cambiar contraseña.
Invalidar sesiones anteriores.
Módulo Organización
US-003 Consultar Organigrama

Actor

Todos.

Historia

Como usuario autenticado deseo consultar la estructura organizacional de la iglesia para conocer los Pastores Generales, Distritos, Casas de Paz y líderes responsables.

Flujo

Abrir Organigrama.

↓

Visualizar Iglesia.

↓

Expandir Distritos.

↓

Expandir Casas.

↓

Consultar Liderazgo.

Aceptación

Todos pueden verlo.

No depende del rol.

No podrán modificarlo.

API

GET /organization/tree
US-004 Consultar ficha de liderazgo

Como usuario deseo consultar la información completa de una Unidad de Liderazgo para conocer su trayectoria y responsabilidad.

Debe mostrar

Fotografía.

Nombres.

Cargo.

Distrito.

Casa.

Historial.

Promedio asistencia.

Promedio ofrenda.

Módulo Distritos
US-005 Crear Distrito

Actor

Administrador.

Pastores Generales.

Historia

Como Pastor General quiero crear un nuevo Distrito para ampliar la cobertura de la iglesia.

Flujo

Nuevo Distrito

↓

Número

↓

Nombre

↓

Asignar Liderazgo

↓

Guardar

Validaciones

Número único.

Nombre obligatorio.

Debe existir Unidad de Liderazgo.

API

POST /districts
US-006 Cambiar liderazgo Distrito

Debe conservar historial.

Nunca eliminar información.

Registrar auditoría.

Módulo Casas de Paz
US-007 Crear Casa de Paz

Actor

Pastor Distrito.

Historia

Como Pastor de Distrito deseo registrar una nueva Casa de Paz para ampliar el alcance evangelístico de mi Distrito.

Formulario

Nombre.

Departamento.

Municipio.

Barrio.

Dirección.

Horario.

Liderazgo.

Aceptación

No permitir dos Casas iguales en el mismo Distrito.

Guardar historial.

US-008 Cambiar liderazgo Casa

Debe conservar historial.

Actualizar organigrama.

Actualizar Dashboard.

US-009 Cerrar Casa

No elimina.

Solo cambia estado.

Módulo Personas
US-010 Registrar Persona

Actor

Líder.

Historia

Como líder deseo registrar un nuevo asistente para facilitar el control de asistencia de las reuniones.

Formulario

Nombre.

Apellido.

Celular.

Correo.

Dirección.

Fecha nacimiento.

Observaciones.

Validaciones

Buscar duplicados.

Permitir datos incompletos.

Crear historial.

US-011 Trasladar Persona

Historia

Como Pastor deseo trasladar una persona entre Casas de Paz sin perder su historial.

Flujo

Buscar Persona.

↓

Nueva Casa.

↓

Motivo.

↓

Guardar.

Módulo Reuniones
US-012 Programar reunión semanal

Actor

Líder.

Historia

Como líder deseo programar el horario de mi Casa de Paz una única vez para que el sistema genere automáticamente las reuniones futuras.

Aceptación

Solo una programación activa.

No permitir duplicados.

US-013 Registrar reunión

Historia

Como líder deseo diligenciar la información de la reunión semanal.

Formulario

Tema.

Notas.

Ofrenda.

Fotografías.

Asistencia.

US-014 Registrar asistencia

Actor

Líder.

Historia

Como líder quiero marcar rápidamente las personas asistentes para ahorrar tiempo durante la reunión.

Flujo

Abrir reunión.

↓

Lista asistentes.

↓

Seleccionar.

↓

Guardar.

Aceptación

No editar reuniones cerradas.

Solo asistentes de la Casa.

Registrar hora.

US-015 Agregar nuevo asistente durante la reunión

Muy importante.

Mientras registra asistencia.

↓

"No encuentro la persona."

↓

Botón

"Nueva Persona"

↓

Guardar

↓

Regresa automáticamente

↓

Queda seleccionada.

Módulo Fotografías
US-016 Subir fotografías

Actor

Líder.

Debe permitir

Subir varias.

Vista previa.

Eliminar antes de guardar.

Compresión automática.

Módulo Ofrendas
US-017 Registrar ofrenda

Solo una por reunión.

Debe aceptar únicamente valores positivos.

Guardar en COP.

Módulo Dashboard
US-018 Dashboard Líder

Debe mostrar

Asistencia mensual.

Asistencia anual.

Ofrendas.

Nuevos asistentes.

Promedio asistencia.

Meta.

US-019 Dashboard Distrito

Debe mostrar

Todas las Casas.

Comparativos.

Ranking.

Mapa Colombia.

US-020 Dashboard General

Debe mostrar

Toda la Iglesia.

Todos los Distritos.

Cobertura.

Ranking.

Indicadores.

Módulo Reportes
US-021 Exportar Excel

Actor

Todos.

Debe respetar permisos.

Generar Excel.

Descargar.

Registrar auditoría.

Módulo PWA
US-022 Instalar Aplicación

Actor

Todos.

Historia

Como líder deseo instalar la plataforma en mi celular para acceder rápidamente como si fuera una aplicación nativa.

Debe permitir

Instalar.

Actualizar automáticamente.

Funcionar offline parcialmente.

Mostrar Splash Screen.

Módulo Notificaciones
US-023 Recordatorio reunión

Un día antes.

↓

Enviar notificación.

US-024 Reunión pendiente

No registrada.

↓

Recordatorio.

Módulo Auditoría
US-025 Consultar auditoría

Solo Administrador.

Debe mostrar

Usuario.

Acción.

Entidad.

IP.

Fecha.

Casos de Uso Transversales
CU-001 Cambio de liderazgo

Actualizar

Organigrama.

Dashboard.

Historial.

Permisos.

CU-002 Cambio de contraseña

Cerrar sesiones.

Actualizar Auditoría.

CU-003 Cambio de estado Casa

Actualizar

Dashboard.

Organigrama.

Reportes.

Historias de Usuario adicionales que recomiendo
US-026 Importar personas desde Excel

Un Pastor de Distrito podrá importar asistentes desde un archivo Excel para facilitar la migración desde registros físicos o sistemas anteriores.

US-027 Escaneo de código QR para asistencia

Cada Casa de Paz podría disponer de un código QR permanente. Los asistentes registrados podrán escanearlo para confirmar su presencia y el líder únicamente validará la lista antes de cerrar la reunión. Esta funcionalidad puede dejarse preparada para una futura versión.

US-028 Seguimiento pastoral

Cada persona tendrá una ficha de seguimiento donde el líder podrá registrar observaciones, visitas, llamadas, decisiones importantes y avances en su proceso de consolidación. Esto transformará la plataforma de un simple control de asistencia a un verdadero sistema de acompañamiento pastoral.

US-029 Panel "Mi Semana"

Al iniciar sesión, el usuario verá una pantalla con sus tareas pendientes:

Reunión de esta semana.
Reportes pendientes.
Nuevos asistentes por completar.
Fotografías por subir.
Recordatorios.
Notificaciones.

Será una experiencia mucho más útil que abrir directamente un dashboard.

US-030 Centro de Actividad (Activity Feed)

Incluir una sección tipo línea de tiempo con las acciones más recientes dentro del alcance del usuario.

Ejemplos:

"La Casa de Paz Esperanza registró su reunión semanal."
"Se agregaron 3 nuevos asistentes."
"El Distrito 9 alcanzó el 95 % de cumplimiento este mes."

Este panel aportará dinamismo y facilitará el seguimiento diario.

Evaluación del proyecto

Hasta este punto ya hemos definido:

✅ Visión del proyecto.
✅ Requerimientos funcionales.
✅ Reglas de negocio.
✅ Arquitectura técnica.
✅ Modelo de datos.
✅ Roles y permisos.
✅ Historias de usuario.

Con esta documentación, una IA ya podría generar una gran parte del backend y del frontend con una base muy sólida.