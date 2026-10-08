Objetivo

Definir el modelo de autorización del sistema, estableciendo:

Roles
Permisos
Políticas
Restricciones
Alcance de los datos
Visibilidad de la información

El sistema deberá garantizar que cada usuario solo pueda visualizar y administrar la información correspondiente a su nivel jerárquico.

Modelo de Seguridad

El sistema implementará un modelo híbrido:

Usuario

↓

Rol

↓

Permisos

↓

Policies

↓

Acceso Final

El Rol define el perfil general.

Los Permisos definen las acciones permitidas.

Las Policies determinan sobre qué información puede actuar.

Roles Oficiales

Inicialmente existirán únicamente cuatro roles.

Administrador

↓

Pastores Generales

↓

Pastores de Distrito

↓

Líderes

Estos roles serán administrados desde la base de datos.

No estarán codificados dentro del sistema.

Jerarquía
Administrador
        │
        ▼
Pastores Generales
        │
        ▼
Pastores Distrito
        │
        ▼
Líderes

Cada nivel hereda únicamente las capacidades necesarias para su ámbito.

Rol 1 - Administrador

Existe un único usuario.

Este usuario corresponde al desarrollador o administrador técnico.

Tiene acceso absoluto.

Permisos

Puede:

Crear cualquier usuario.
Editar cualquier usuario.
Eliminar lógicamente usuarios.
Crear Distritos.
Crear Casas de Paz.
Reasignar liderazgos.
Cambiar contraseñas.
Restaurar información.
Configurar la plataforma.
Gestionar parámetros del sistema.
Ver todas las métricas.
Acceder a auditoría.
Exportar cualquier reporte.
Configurar notificaciones.
Administrar catálogos.
Ver todos los registros históricos.

No tendrá ninguna restricción funcional.

Rol 2 - Pastores Generales

Existe una única Unidad de Liderazgo.

Ejemplo:

Marcos
+

Doris

↓

Una sola cuenta
Alcance

Toda la iglesia.

Puede

Visualizar todos los Distritos.

Crear Distritos.

Editar Distritos.

Cambiar liderazgo de Distritos.

Crear reportes.

Visualizar todas las Casas de Paz.

Visualizar todas las asistencias.

Visualizar todas las ofrendas.

Visualizar estadísticas globales.

Consultar el organigrama.

Descargar reportes.

No puede

Modificar configuraciones técnicas del sistema.

Administrar auditoría.

Crear Administradores.

Eliminar información histórica.

Rol 3 - Pastores de Distrito

También corresponde a una Unidad de Liderazgo.

Ejemplo:

Jorge

+

Johanna

↓

Una sola cuenta
Alcance

Solo su Distrito.

Puede

Crear Casas de Paz.

Editar Casas de Paz.

Cerrar Casas de Paz.

Reabrir Casas de Paz.

Crear usuarios Líder.

Cambiar liderazgo de Casas de Paz.

Ver indicadores del Distrito.

Exportar reportes del Distrito.

Visualizar asistentes.

Consultar organigrama.

Gestionar reuniones de su Distrito.

Aprobar reuniones (si esa funcionalidad se activa).

No puede

Crear Distritos.

Modificar otros Distritos.

Ver información de otros Distritos.

Crear Pastores Generales.

Modificar parámetros del sistema.

Rol 4 - Líder

Una Unidad de Liderazgo.

Ejemplo:

Carlos

+

Andrea

↓

Una sola cuenta
Alcance

Solo una Casa de Paz.

Puede

Registrar personas.

Editar información de personas.

Registrar reuniones.

Registrar asistencia.

Registrar ofrendas.

Subir fotografías.

Consultar indicadores de su Casa de Paz.

Consultar historial de asistentes.

Exportar reportes de su Casa.

Consultar organigrama.

Modificar información de asistentes bajo su responsabilidad.

No puede

Crear usuarios.

Crear Distritos.

Eliminar reuniones.

Modificar reuniones cerradas.

Cambiar liderazgo.

Modificar otra Casa de Paz.

Ver estadísticas de otros Distritos.

Matriz de Permisos
Acción	Administrador	Pastores Generales	Pastor Distrito	Líder
Ver Organigrama	✅	✅	✅	✅
Dashboard General	✅	✅	❌	❌
Dashboard Distrito	✅	✅	✅	❌
Dashboard Casa	✅	✅	✅	✅
Crear Distrito	✅	✅	❌	❌
Editar Distrito	✅	✅	❌	❌
Crear Casa de Paz	✅	✅	✅	❌
Cerrar Casa de Paz	✅	✅	✅	❌
Crear Usuario Líder	✅	✅	✅	❌
Registrar Asistencia	✅	❌	❌	✅
Registrar Ofrenda	✅	❌	❌	✅
Registrar Reunión	✅	❌	❌	✅
Exportar Excel	✅	✅	✅	✅
Ver Auditoría	✅	❌	❌	❌
Configurar Sistema	✅	❌	❌	❌
Policies

Aquí está la verdadera inteligencia del sistema.

No basta con tener un rol.

También debe validarse el alcance.

Policy 1

Un Líder únicamente podrá acceder a la Casa de Paz que administra.

Nunca a otra.

Policy 2

Un Pastor de Distrito únicamente podrá consultar información de su Distrito.

Policy 3

Los Pastores Generales podrán consultar cualquier Distrito.

Policy 4

El Administrador podrá acceder a cualquier información.

Restricciones

Ejemplo.

Un líder intenta abrir:

/casas/12

Pero administra la Casa 5.

Respuesta:

403

Forbidden

Aunque conozca la URL.

Visibilidad

La interfaz cambiará según el rol.

Ejemplo.

Administrador

Dashboard

Usuarios

Distritos

Casas

Configuración

Auditoría

Reportes

Pastor Distrito

Dashboard

Casas de Paz

Líderes

Reportes

Organigrama

Líder

Dashboard

Mi Casa

Personas

Reuniones

Reportes

Organigrama
Navegación

Toda la navegación será dinámica.

No habrá menús codificados.

Cada menú dependerá de los permisos.

Dashboard

También dependerá del rol.

Administrador

Toda la iglesia

Pastor General

Todos los Distritos

Pastor Distrito

Su Distrito

Líder

Su Casa
Exportación

El sistema nunca permitirá exportar información fuera del alcance del usuario.

Ejemplo.

Líder.

Solo exporta:

Su Casa.

Nunca el Distrito.

Auditoría

Solo el Administrador podrá consultar:

Logs.
Cambios.
Accesos.
Errores.
Acceso a Fotografías

Todos podrán visualizar fotografías únicamente dentro de su alcance.

Ejemplo.

Un Líder no podrá consultar fotografías de otra Casa de Paz.

Acceso al Organigrama

El Organigrama será completamente público para los usuarios autenticados.

Todos podrán visualizar:

Pastores Generales.
Distritos.
Casas de Paz.
Fotografías.
Liderazgos.

No podrán modificarlos.

Cambio de Contraseña

Todos los usuarios podrán cambiar su propia contraseña.

Nadie podrá cambiar la contraseña de otro usuario.

Excepto:

Administrador.

Sesiones

Un usuario podrá iniciar sesión desde varios dispositivos.

Ejemplo.

Computador.

Celular.

Tablet.

Todas las sesiones quedarán registradas.

Acciones Críticas

Las siguientes acciones requerirán confirmación explícita:

Cerrar una Casa de Paz.
Reasignar liderazgo.
Cambiar Pastor de Distrito.
Restaurar información.
Eliminar usuarios (eliminación lógica).
Reabrir una Casa de Paz.
Permisos Especiales (Preparación para el Futuro)

Aunque inicialmente existan cuatro roles, el modelo permitirá asignar permisos excepcionales.

Ejemplo:

Líder

↓

Permiso Temporal

↓

Puede consultar

el reporte del Distrito

durante 15 días.

No será necesario crear un nuevo rol.

Delegación Temporal

Una mejora muy útil para la realidad de la iglesia es permitir que un Pastor de Distrito o un Líder delegue temporalmente la administración de su cuenta.

Ejemplo:

Un líder sale de vacaciones.
Otro líder registra las reuniones durante dos semanas.
Finalizado el período, el acceso expira automáticamente.

Esto evita compartir contraseñas y mantiene la trazabilidad.

Doble validación para acciones críticas

Para operaciones especialmente sensibles, como cambiar el liderazgo de un Distrito o cerrar definitivamente una Casa de Paz, puede implementarse una segunda confirmación mediante contraseña o código temporal.

No es obligatorio para la primera versión, pero la arquitectura debería dejar previsto este mecanismo.

Menús y componentes basados en permisos

No solo las rutas estarán protegidas. Los botones, acciones, pestañas y componentes de la interfaz también deberán evaluarse según los permisos del usuario.

Por ejemplo:

Si un Líder no puede crear usuarios, el botón "Nuevo Usuario" ni siquiera debe mostrarse.
Si un Pastor de Distrito no tiene acceso a Auditoría, ese módulo no debe aparecer en el menú lateral.

Esto mejora la experiencia del usuario y reduce errores.

Conclusión

Con este documento ya quedan definidos:

La jerarquía de acceso.
El alcance de cada usuario.
La navegación dinámica.
La protección de rutas.
La visibilidad de los datos.
La base para implementar JWT + Guards + Policies + Decorators en NestJS y un frontend completamente adaptativo según permisos.