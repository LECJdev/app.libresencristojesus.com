1. Principios Generales
RN-001 - La iglesia es una única organización

El sistema administrará una única iglesia denominada Libres en Cristo Jesús.

No será un sistema multiiglesia en la primera versión.

Toda la información pertenecerá a una sola organización.

Preparación para el futuro: La arquitectura deberá permitir convertir el sistema en multiiglesia sin rediseñar la base de datos.

2. Estructura Organizacional

La estructura oficial será:

Iglesia

↓

Pastores Generales

↓

Distritos

↓

Casas de Paz

↓

Asistentes

No podrá existir ninguna entidad fuera de esta jerarquía.

RN-002

Toda Casa de Paz pertenece obligatoriamente a un Distrito.

RN-003

Todo Distrito pertenece a la Iglesia.

RN-004

No pueden existir Casas de Paz sin Distrito.

RN-005

No pueden existir Distritos sin Pastor asignado.

3. Unidad de Liderazgo

Esta es una de las reglas más importantes del sistema.

RN-006

Los cargos pastorales siempre serán administrados mediante una Unidad de Liderazgo.

Una Unidad de Liderazgo está conformada por:

Integrante 1
Integrante 2
Un solo usuario
Un solo rol

Ejemplo:

Pastor Jorge

Pastora Johana

↓

Usuario

distrito09
RN-007

Nunca existirán dos usuarios diferentes para la misma Unidad de Liderazgo.

RN-008

Los dos integrantes compartirán la misma cuenta.

RN-009

Cada integrante tendrá su propia información personal y fotografía.

4. Pastores Generales
RN-010

Los Pastores Generales son el máximo nivel administrativo del sistema.

RN-011

Podrán visualizar toda la información de todos los Distritos.

RN-012

No podrán ser eliminados.

Solo el Administrador podrá modificar su información.

5. Distritos
RN-013

Cada Distrito tendrá un número único.

Ejemplo:

Distrito 1

Distrito 2

Distrito 3

RN-014

Cada Distrito tendrá un nombre.

RN-015

No podrán existir dos Distritos con el mismo número.

RN-016

Cada Distrito tendrá exactamente una Unidad de Liderazgo.

6. Casas de Paz
RN-017

Cada Casa de Paz pertenece únicamente a un Distrito.

RN-018

Una Casa de Paz tendrá únicamente una Unidad de Liderazgo activa.

RN-019

Una Unidad de Liderazgo únicamente podrá administrar una Casa de Paz.

RN-020

Las Casas de Paz nunca serán eliminadas físicamente.

Se marcarán como:

Activa
Suspendida
Cerrada
RN-021

Una Casa de Paz cerrada conservará todo su historial.

7. Personas
RN-022

Una persona se registra una sola vez en el sistema.

Nunca deberá duplicarse.

RN-023

Antes de crear una persona el sistema buscará coincidencias por:

Documento (si existe).
Celular.
Correo.
Nombre completo.
RN-024

Una persona puede tener datos incompletos.

No será obligatorio diligenciar todos los campos.

RN-025

Toda persona tendrá un historial permanente.

Nunca será eliminado.

RN-026

Una persona podrá cambiar de Casa de Paz.

El historial permanecerá intacto.

RN-027

El sistema deberá registrar la fecha de ingreso a cada Casa de Paz y, cuando aplique, la fecha de salida.

Esto permitirá conocer el recorrido histórico de cada persona.

8. Reuniones
RN-028

Las reuniones son generadas automáticamente.

Los líderes no crearán reuniones manualmente cada semana.

RN-029

Cada Casa de Paz tendrá una programación semanal.

Ejemplo:

Jueves

7:00 PM

RN-030

El sistema generará automáticamente la reunión correspondiente a cada semana.

RN-031

Cada reunión tendrá un estado:

Programada.
En curso.
Pendiente de reporte.
Reportada.
Validada.
Cerrada.
RN-032

Cuando se genere una nueva reunión, la reunión anterior quedará cerrada automáticamente.

RN-033

Una reunión cerrada no podrá modificarse.

9. Asistencia
RN-034

La asistencia será registrada únicamente para la reunión correspondiente.

RN-035

Solo podrán registrar asistencia los líderes responsables de esa Casa de Paz.

RN-036

La asistencia podrá modificarse únicamente mientras la reunión esté abierta.

RN-037

Al cerrarse la reunión no podrá modificarse.

RN-038

La asistencia nunca será eliminada.

Solo podrá corregirse antes del cierre.

10. Ofrendas
RN-039

Cada reunión podrá registrar una única ofrenda principal.

RN-040

Las ofrendas se almacenarán exclusivamente en pesos colombianos (COP).

RN-041

No se permitirá registrar valores negativos.

RN-042

Toda modificación quedará registrada en la auditoría.

11. Fotografías
RN-043

Cada reunión podrá almacenar varias fotografías.

RN-044

Las fotografías no podrán eliminarse definitivamente.

Solo marcarse como ocultas o archivadas.

12. Organigrama
RN-045

Todos los usuarios podrán visualizar la estructura organizacional.

RN-046

El organigrama mostrará:

Fotografías.
Nombres.
Cargo.
Distrito.
Casa de Paz.
RN-047

El organigrama no mostrará indicadores financieros.

13. Dashboard
RN-048

Toda la información del Dashboard dependerá del rol del usuario.

RN-049

Un líder únicamente visualizará su propia Casa de Paz.

RN-050

Un Pastor de Distrito únicamente visualizará la información de su Distrito.

RN-051

Los Pastores Generales visualizarán toda la iglesia.

14. Cobertura Nacional
RN-052

La ubicación geográfica será administrativa, no mediante coordenadas GPS.

RN-053

Cada Casa de Paz tendrá:

Departamento.
Municipio.
Barrio (opcional).
Dirección.
RN-054

Los Departamentos y Municipios provendrán de un catálogo oficial basado en la división político-administrativa de Colombia.

RN-055

El Dashboard Nacional utilizará un mapa SVG de Colombia.

No utilizará servicios externos como Google Maps.

15. Exportación
RN-056

Todos los reportes podrán exportarse a Excel.

RN-057

La exportación respetará los permisos del usuario.

16. Seguridad
RN-058

Toda acción importante quedará registrada.

RN-059

Toda modificación almacenará:

Usuario.
Fecha.
Hora.
Dirección IP.
Acción realizada.
17. Eliminaciones
RN-060

El sistema evitará eliminar información histórica.

La política será eliminación lógica (Soft Delete).

RN-061

Las relaciones históricas deberán mantenerse.

18. Notificaciones
RN-062

El sistema notificará automáticamente:

Reunión pendiente.
Reporte faltante.
Nuevos asistentes.
Metas alcanzadas.
19. Estados Generales

Todas las entidades tendrán un estado.

Ejemplo:

Activo

Inactivo

Suspendido

Cerrado

Archivado

Nunca se eliminarán físicamente.

20. Principios de Auditoría

Todo cambio importante quedará registrado.

Ejemplo:

Usuario

Acción

Entidad

Valor anterior

Valor nuevo

Fecha

IP
21. Integridad de la Información

El sistema siempre priorizará la conservación del historial.

Nunca se sobrescribirá información histórica.

Las modificaciones generarán nuevos registros o quedarán reflejadas en la auditoría.

Reglas adicionales que considero importantes
RN-063 - Cambio de liderazgo con preservación del historial

Cuando una Casa de Paz cambie de líderes, no se creará una nueva Casa de Paz. Se asignará una nueva Unidad de Liderazgo y se conservará el historial completo de reuniones, asistentes, ofrendas e indicadores. Además, el sistema registrará las fechas de inicio y fin de cada liderazgo para mantener la trazabilidad histórica.

RN-064 - Metas por periodo

Las metas deberán definirse por períodos (mensual, trimestral o anual) y no como un único valor permanente. Esto permitirá comparar el crecimiento entre diferentes etapas y elaborar reportes históricos de cumplimiento.

RN-065 - Catálogo de ubicaciones administrado por el sistema

Los Departamentos y Municipios serán datos de referencia administrados por el sistema. Los usuarios no podrán crearlos, editarlos ni eliminarlos. Esto garantizará consistencia en los reportes y evitará duplicados o errores ortográficos.

RN-066 - Numeración interna de Casas de Paz

Además del nombre visible, cada Casa de Paz tendrá un identificador interno único e inmutable. Aunque el nombre cambie con el tiempo, el identificador permitirá conservar todas las relaciones históricas y simplificará la integración entre módulos.