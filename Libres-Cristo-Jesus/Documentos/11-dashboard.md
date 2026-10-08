Objetivo

Centralizar todas las reglas funcionales del sistema para garantizar:

Consistencia.
Integridad de la información.
Facilidad de mantenimiento.
Facilidad para pruebas.
Escalabilidad.

Cada regla tendrá:

Código único.
Módulo.
Descripción.
Prioridad.
Tipo.
Responsable.
Casos relacionados.
Clasificación

Las reglas se clasifican en:

RN-001 Organización

RN-100 Usuarios

RN-200 Casas de Paz

RN-300 Personas

RN-400 Reuniones

RN-500 Asistencia

RN-600 Ofrendas

RN-700 Reportes

RN-800 Seguridad

RN-900 Auditoría
ORGANIZACIÓN
RN-001

La iglesia tendrá un único registro institucional.

Nunca podrán existir dos iglesias.

RN-002

Solo existirán unos Pastores Generales activos.

Representados por una única Unidad de Liderazgo.

RN-003

Cada Distrito tendrá un número único.

Ejemplo.

Distrito 9

Distrito 10

Distrito 11

Nunca repetir.

RN-004

Cada Distrito tendrá una sola Unidad de Liderazgo activa.

RN-005

Una Unidad de Liderazgo únicamente podrá administrar un Distrito activo al mismo tiempo.

RN-006

El cambio de liderazgo nunca eliminará el historial.

Siempre se conservarán los registros anteriores.

CASAS DE PAZ
RN-201

Cada Casa de Paz pertenece obligatoriamente a un Distrito.

RN-202

Un Líder únicamente puede administrar una Casa de Paz activa.

RN-203

Una Casa de Paz solo puede tener una programación semanal activa.

RN-204

Una Casa de Paz no podrá eliminarse físicamente.

Solo cambiará su estado.

RN-205

Estados permitidos

ACTIVA

INACTIVA

CERRADA
RN-206

No podrán existir dos Casas de Paz con el mismo nombre dentro del mismo Distrito.

RN-207

Si una Casa de Paz cambia de líder, el historial permanecerá intacto.

PERSONAS
RN-301

Una persona podrá registrarse con información incompleta.

Campos mínimos:

Nombre.

Apellido (opcional en la primera versión).

Teléfono (opcional).

Correo (opcional).

RN-302

La persona nunca se elimina.

Solo cambia de estado.

RN-303

Una persona podrá trasladarse entre Casas.

Nunca perderá historial.

RN-304

Cada traslado generará un registro histórico.

RN-305

No se permitirá crear duplicados.

El sistema verificará:

Documento.

Celular.

Correo.

Nombre similar.

Antes de crear una nueva persona, mostrará coincidencias para evitar registros duplicados.

RN-306

Una persona solo podrá pertenecer a una Casa de Paz activa al mismo tiempo.

RN-307 (Nueva)

Cuando una persona deje de asistir por un tiempo prolongado, no será eliminada. Pasará a un estado como:

Activo.
Inactivo.
En seguimiento.
Trasladado.

Esto permitirá generar reportes de recuperación y seguimiento pastoral.

REUNIONES
RN-401

La programación semanal se crea una única vez.

RN-402

El sistema generará automáticamente las reuniones futuras.

No será necesario crearlas manualmente.

RN-403

Cada reunión pertenece únicamente a una Casa.

RN-404

Cada reunión tendrá:

Fecha.

Tema.

Asistencia.

Fotografías.

Ofrenda.

Observaciones.

RN-405

Una reunión solo puede cerrarse una vez.

RN-406

Una reunión cerrada no podrá modificarse.

Excepto:

Administrador.

RN-407

Si inicia la siguiente semana, la reunión anterior quedará bloqueada automáticamente para los Líderes.

Los Pastores de Distrito y el Administrador podrán reabrirla de forma excepcional, dejando trazabilidad en la auditoría.

RN-408

No podrán existir dos reuniones para la misma Casa de Paz en la misma fecha.

ASISTENCIA
RN-501

Solo podrán marcar asistencia personas pertenecientes a esa Casa de Paz en la fecha de la reunión.

RN-502

La asistencia podrá editarse únicamente mientras la reunión esté abierta.

RN-503

Al iniciar la siguiente reunión semanal, la asistencia anterior se bloqueará automáticamente para el Líder.

RN-504

El sistema conservará el historial completo de asistencia.

Nunca sobrescribirá registros.

RN-505

Cada asistencia registrará:

Fecha.

Hora.

Usuario.

Dispositivo.

RN-506

El sistema calculará automáticamente:

Asistencia semanal.
Asistencia mensual.
Asistencia anual.
Porcentaje de asistencia.
Tendencias.
RN-507 (Nueva)

El registro de asistencia deberá ser extremadamente rápido.

Desde un dispositivo móvil, un líder debería poder registrar una reunión promedio (20–30 personas) en menos de 2 minutos.

Esta regla influirá directamente en el diseño de la interfaz.

OFRENDAS
RN-601

Solo existirá una ofrenda principal por reunión.

RN-602

El valor deberá ser positivo.

RN-603

La moneda oficial será:

Peso Colombiano (COP).

RN-604

El sistema almacenará el valor exacto ingresado.

No realizará conversiones.

RN-605

Toda modificación posterior quedará registrada en Auditoría.

REPORTES
RN-701

Los reportes respetarán los permisos del usuario.

RN-702

Un Líder solo visualizará su Casa.

RN-703

Un Pastor de Distrito visualizará únicamente su Distrito.

RN-704

Los Pastores Generales visualizarán toda la iglesia.

RN-705

El Administrador visualizará absolutamente toda la información.

RN-706

Toda exportación deberá respetar el mismo alcance de permisos.

SEGURIDAD
RN-801

Toda API requerirá autenticación.

Excepto:

Login.

Recuperar contraseña.

RN-802

Toda acción verificará permisos antes de ejecutarse.

RN-803

Toda contraseña deberá almacenarse utilizando Argon2.

Nunca texto plano.

RN-804

El JWT tendrá expiración.

El Refresh Token permitirá renovar la sesión.

RN-805

Toda sesión podrá cerrarse remotamente.

RN-806 (Nueva)

Si un usuario cambia su contraseña, todos los Refresh Tokens activos quedarán invalidados inmediatamente.

AUDITORÍA
RN-901

Toda acción importante generará un registro.

RN-902

Registrar:

Usuario.

Entidad.

Acción.

Antes.

Después.

Fecha.

IP.

Dispositivo.

RN-903

La auditoría nunca podrá modificarse.

RN-904

Solo el Administrador podrá consultarla.

ORGANIGRAMA
RN-1001

Todos los usuarios autenticados podrán visualizar el organigrama.

RN-1002

El organigrama mostrará:

Fotografía.

Nombre.

Cargo.

Distrito.

Casa de Paz.

Municipio.

RN-1003

La información organizacional siempre será pública dentro de la plataforma, pero las métricas y reportes dependerán del rol del usuario.

MAPA DE COLOMBIA
RN-1101

Toda Casa de Paz deberá estar asociada a:

Departamento.

Municipio.

RN-1102

El Departamento y Municipio deberán seleccionarse desde los catálogos oficiales cargados con los códigos DANE.

No se permitirá escribir nombres manualmente.

RN-1103

El mapa nacional utilizará únicamente los Departamentos y Municipios registrados.

No dependerá de servicios externos como Google Maps.

PWA
RN-1201

La plataforma deberá poder instalarse como una aplicación.

RN-1202

El sistema deberá funcionar con conectividad limitada para consultas previamente almacenadas y recursos estáticos.

RN-1203

Cuando la conexión se restablezca, la aplicación sincronizará automáticamente la información pendiente que pueda sincronizarse sin conflictos.

DASHBOARD
RN-1301

Todos los indicadores deberán calcularse automáticamente.

Nunca manualmente.

RN-1302

Toda gráfica deberá respetar los permisos.

RN-1303

Los filtros deberán actualizar todas las gráficas relacionadas.

RN-1304

Los dashboards utilizarán consultas optimizadas o vistas materializadas para evitar tiempos de carga elevados.

NOTIFICACIONES
RN-1401

El sistema notificará al Líder un día antes de su reunión.

RN-1402

Si una reunión no ha sido diligenciada después de su horario programado, se enviará un recordatorio.

RN-1403

Las notificaciones respetarán la configuración del usuario (si en futuras versiones se permite personalizarlas).

REGLAS TRANSVERSALES
RN-1501

Toda eliminación será lógica (Soft Delete), salvo catálogos temporales o registros técnicos definidos por el Administrador.

RN-1502

Todo cambio importante deberá quedar registrado en Auditoría.

RN-1503

Ningún usuario podrá acceder mediante URL directa a recursos fuera de su alcance.

El backend será el responsable de validar siempre el acceso.

RN-1504

La interfaz ocultará las acciones que el usuario no tenga permiso para ejecutar, pero el backend seguirá validando cada solicitud.

RN-1505

Toda fecha y hora se almacenará en UTC en la base de datos y se mostrará al usuario según la zona horaria configurada (inicialmente America/Bogota).

Reglas para el cálculo de métricas

Definir explícitamente cómo se calculan los indicadores:

Asistencia promedio mensual = Total asistentes del mes / Número de reuniones realizadas.
Crecimiento mensual = ((Mes actual - Mes anterior) / Mes anterior) × 100.
Cumplimiento de reuniones = Reuniones reportadas / Reuniones programadas.
Promedio de ofrenda = Total ofrendas / Número de reuniones.
Nuevos asistentes = Personas creadas durante el período seleccionado.

Estas fórmulas deberán ser utilizadas por todos los dashboards y reportes.

Resolución de conflictos

Para evitar inconsistencias cuando dos usuarios editen la misma información:

Si dos usuarios intentan modificar el mismo registro, se utilizará bloqueo optimista mediante un campo version o updatedAt.
Si el registro cambió desde que fue abierto, el sistema solicitará al usuario recargar la información antes de guardar.
Catálogo de estados

Todos los estados del sistema deberán definirse mediante enum o catálogos centralizados.

Ejemplos:

Estado de Usuario.
Estado de Distrito.
Estado de Casa de Paz.
Estado de Reunión.
Estado de Persona.
Estado de Notificación.

Nunca utilizar cadenas de texto "quemadas" en el código.

Conclusión

Con este documento ya hemos definido el comportamiento completo del negocio. Ahora tenemos:

✅ Reglas organizacionales.
✅ Reglas de seguridad.
✅ Reglas de reuniones.
✅ Reglas de asistencia.
✅ Reglas de ofrendas.
✅ Reglas de reportes.
✅ Reglas del organigrama.
✅ Reglas del mapa de Colombia.
✅ Reglas de auditoría.
✅ Reglas transversales.