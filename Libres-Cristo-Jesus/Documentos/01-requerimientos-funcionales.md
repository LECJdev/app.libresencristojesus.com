1. Objetivo

Definir de manera detallada todas las funcionalidades que deberá cumplir la plataforma para administrar la organización, operación y crecimiento de la iglesia Libres en Cristo Jesús, garantizando que cada módulo tenga responsabilidades claras y que el sistema sea escalable.

2. Alcance Funcional

El sistema estará dividido en los siguientes módulos funcionales:

01. Autenticación

02. Organización

03. Distritos

04. Casas de Paz

05. Personas

06. Eventos Semanales

07. Asistencia

08. Ofrendas

09. Fotografías

10. Dashboard

11. Reportes

12. Usuarios

13. Configuración

14. Auditoría

15. Notificaciones

16. Cobertura Nacional
3. Módulo de Autenticación
RF-001 Login

El sistema permitirá autenticarse mediante:

Usuario
Contraseña

El sistema deberá validar:

Usuario activo
Contraseña correcta
Rol asignado

Después del inicio de sesión redireccionará al Dashboard correspondiente.

RF-002 Recuperación de contraseña

Permitirá cambiar la contraseña mediante correo electrónico.

RF-003 Cambio de contraseña

Todos los usuarios podrán cambiar su contraseña.

RF-004 Sesiones

El sistema deberá cerrar automáticamente la sesión después de un tiempo configurable de inactividad.

4. Módulo Organización

Este módulo representa la estructura oficial de la iglesia.

Todos los usuarios pueden visualizarla.

Solo usuarios autorizados podrán modificarla.

RF-005 Organigrama

Mostrar el árbol jerárquico completo.

Pastores Generales

↓

Distritos

↓

Casas de Paz

↓

Líderes
RF-006 Fotografías

Cada unidad de liderazgo tendrá:

Fotografía
Nombre de ambos integrantes
Cargo
Distrito
Casa de Paz
RF-007 Consulta

Todos podrán consultar el organigrama.

5. Módulo Distritos
RF-008 Crear Distrito

El administrador podrá crear distritos.

Cada distrito tendrá:

Número
Nombre
Pastor
Pastora
Usuario compartido
Estado
RF-009 Editar Distrito

Modificar información.

RF-010 Desactivar Distrito

Nunca eliminar físicamente.

Solo cambiar estado.

6. Módulo Casas de Paz
RF-011 Crear Casa de Paz

Cada Casa de Paz tendrá:

Nombre
Distrito
Líder
Líder mujer
Usuario compartido
Departamento
Municipio
Barrio
Dirección
Día reunión
Hora
Estado
RF-012 Una Casa por Líder

Un líder únicamente podrá administrar una Casa de Paz.

RF-013 Eliminación

Solo el Pastor del Distrito podrá cerrar o eliminar una Casa de Paz.

7. Módulo Personas
RF-014 Registro de Personas

Registrar asistentes.

Campos mínimos:

Nombres
Apellidos
Celular
Correo
Fecha nacimiento
Dirección
Observaciones

Los datos podrán quedar incompletos.

RF-015 Búsqueda

Antes de crear una persona el sistema buscará coincidencias.

RF-016 Historial

Cada persona tendrá historial de asistencia.

RF-017 Cambio de Casa de Paz

Una persona podrá cambiar de Casa de Paz sin perder su historial.

8. Eventos Semanales
Concepto

No existen eventos independientes.

Existe una Casa de Paz con programación semanal.

El sistema genera automáticamente las reuniones.

RF-018 Programación

Registrar:

Día
Hora
Lugar
RF-019 Recurrencia

La reunión será semanal.

No se crearán manualmente.

RF-020 Generación automática

El sistema generará automáticamente cada nueva reunión.

RF-021 Cierre automático

Cuando inicia una nueva semana:

La reunión anterior queda bloqueada.

9. Registro de Reuniones

Cada reunión tendrá:

RF-022 Tema

Registrar el tema.

RF-023 Predicador

Registrar quién predicó.

RF-024 Observaciones

Comentarios libres.

RF-025 Fotografía

Subir fotografías de la reunión.

Se recomienda permitir varias fotografías por reunión, no solo una.

RF-026 Ofrenda

Registrar:

Valor en pesos colombianos.

10. Asistencia
RF-027 Lista automática

Mostrar todas las personas registradas.

RF-028 Marcar asistencia

Simplemente seleccionar.

✔ Asistió

RF-029 Personas nuevas

Agregar personas nuevas durante la reunión.

RF-030 Edición

La asistencia podrá modificarse únicamente hasta el inicio de la siguiente reunión.

RF-031 Historial

Guardar todas las asistencias.

Nunca sobrescribir información histórica.

11. Dashboard

El Dashboard dependerá del rol.

RF-032 Dashboard Administrador

Visualiza:

Toda la iglesia.

RF-033 Dashboard Pastores Generales

Visualizan:

Todos los distritos.

RF-034 Dashboard Pastor Distrito

Solo su distrito.

RF-035 Dashboard Líder

Solo su Casa de Paz.

Indicadores

Mostrar:

Asistencia semanal

Asistencia mensual

Asistencia anual

Promedio

Personas nuevas

Personas recurrentes

Casas activas

Casas pendientes

Ofrendas

Crecimiento

12. Dashboard Organización

Todos los usuarios podrán visualizar.

No depende del rol.

Mostrará:

Organigrama

Fotografías

Distritos

Casas de Paz

Líderes

13. Dashboard Cobertura Nacional

Mostrar:

Mapa SVG de Colombia.

RF-036

Seleccionar:

Departamento

↓

Municipio

↓

Distrito

↓

Casa de Paz

Mostrar:

Cantidad de Casas

Cantidad de asistentes

Cantidad de líderes

Cantidad de distritos

14. Reportes
RF-037 Exportación

Exportar:

Excel

RF-038 Filtros

Filtrar por:

Fecha

Departamento

Municipio

Distrito

Casa de Paz

Líder

Persona

RF-039 Reporte de Asistencia

Mostrar:

Asistencias

Ausencias

Promedio

RF-040 Reporte Financiero

Mostrar:

Ofrendas

Por:

Semana

Mes

Año

Distrito

Casa

15. Usuarios

El sistema manejará cuatro perfiles.

Administrador

Pastores Generales

Pastores Distrito

Líderes

RF-041 Usuario Compartido

Los cargos pastorales funcionan mediante una única cuenta.

Ejemplo:

Pastor Jorge

Pastora Johana

↓

Usuario

distrito09

↓

Una sola contraseña
16. Notificaciones

Enviar recordatorios.

Ejemplo.

"No ha registrado la reunión de esta semana."

17. Auditoría

Registrar:

Quién creó.

Quién modificó.

Quién eliminó.

Fecha.

Hora.

IP.

18. Diseño Responsivo

El sistema deberá funcionar correctamente en:

Computador
Tablet
Celular

Con enfoque Mobile First.

19. Progressive Web App (PWA)

El sistema deberá permitir:

Instalarse como aplicación.
Icono propio.
Pantalla completa.
Actualizaciones automáticas.
Caché inteligente.
Funcionamiento offline para consulta y captura de datos previamente sincronizados (cuando esta funcionalidad sea implementada).
Sincronización automática cuando vuelva la conexión.
20. Requerimientos No Funcionales
Tiempo de carga menor a 2 segundos en condiciones normales.
Interfaz intuitiva y consistente.
Arquitectura modular.
Seguridad basada en JWT y control de acceso por roles (RBAC).
API documentada con Swagger.
Base de datos PostgreSQL.
Backend desarrollado con NestJS.
Frontend desarrollado con Next.js.
Diseño basado en la identidad visual de Libres en Cristo Jesús.
Compatibilidad con los principales navegadores modernos.
Código documentado y siguiendo principios SOLID.
Recomendaciones funcionales antes de pasar a la arquitectura

Antes de comenzar con el diseño de la base de datos, incorporaría cuatro funcionalidades que aportarán mucho valor y evitarán cambios importantes más adelante:

1. Consolidación de nuevos asistentes

No todas las personas tendrán el mismo estado. Una persona debería poder evolucionar dentro de un proceso pastoral.

Ejemplo de estados:

Nuevo visitante
Asistente frecuente
En consolidación
Miembro
Servidor
Líder potencial

Esto permitirá medir no solo cuántas personas asisten, sino también cómo crecen dentro de la iglesia.

2. Metas por Casa de Paz y Distrito

Cada Casa de Paz y cada Distrito podrá tener objetivos definidos para un período (mensual, trimestral o anual), por ejemplo:

Meta de asistencia.
Meta de personas nuevas.
Meta de apertura de nuevas Casas de Paz.
Meta de crecimiento.

Los dashboards mostrarán el porcentaje de cumplimiento de estas metas.

3. Estados de seguimiento de las reuniones

Además del registro de asistencia, cada reunión tendrá un estado operativo que facilite el control por parte de los pastores:

Programada.
Pendiente de reporte.
Reportada.
Validada por el pastor de distrito (opcional).
Cerrada.

Con un semáforo visual (verde, amarillo y rojo) será muy sencillo identificar qué Casas de Paz aún no han enviado su información semanal.

4. Catálogo de temas o prédicas

En lugar de escribir el tema manualmente todas las semanas, el sistema debería permitir administrar un catálogo de prédicas.

Cada reunión podrá:

Seleccionar un tema existente.
O crear un tema nuevo si corresponde.

Esto permitirá generar reportes históricos sobre los temas impartidos y mantener una mayor consistencia en la información.