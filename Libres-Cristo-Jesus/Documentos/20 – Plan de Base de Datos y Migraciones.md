DATA ARCHITECTURE & DATABASE BLUEPRINT
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

Índice
1. Filosofía

2. Arquitectura

3. Modelo ER

4. Dominios

5. Tablas

6. Relaciones

7. Índices

8. Soft Delete

9. Auditoría

10. Versionado

11. Backups

12. Performance

13. Prisma

14. Migraciones

15. Escalabilidad

16. Seguridad
1. Filosofía

La Base de Datos deberá ser:

Escalable.
Normalizada.
Optimizada para lectura.
Segura.
Fácil de mantener.
Preparada para crecimiento.

Nunca duplicar información.

Siempre utilizar relaciones.

2. Arquitectura General
                USERS

                   │

        ┌──────────┴──────────┐

        │                     │

     ROLES              PERMISSIONS

        │

        │

CHURCH

        │

DISTRICTS

        │

PEACE HOUSES

        │

MEETINGS

        │

ATTENDANCE

        │

PERSONS

3. Dominios

La Base de Datos se dividirá por dominios.

AUTH

USERS

ORGANIZATION

PEOPLE

MEETINGS

ATTENDANCE

OFFERINGS

REPORTS

FILES

AUDIT

SETTINGS

CATALOGS
4. Catálogos

Los catálogos nunca se escribirán "a mano".

Existirán tablas maestras.

Colombia

Departments

Municipalities

Roles

Admin

Pastor General

Pastor Distrito

Líder

Estado Persona

Nuevo

Frecuente

Miembro

Líder Potencial

Líder

Trasladado

Inactivo

5. Organización
Church
Church

id

name

logo

primaryColor

secondaryColor

createdAt
District
District

id

churchId

number

name

photo

pastorUserId

status
PeaceHouse
PeaceHouse

id

districtId

leaderUserId

municipalityId

address

meetingDay

meetingTime

status
6. Personas
Person

id

firstName

lastName

phone

email

birthDate

gender

municipalityId

peaceHouseId

status

photo

createdAt
Historial

No modificar registros.

Crear historial.

PersonHistory

id

personId

oldHouse

newHouse

date

reason

userId
7. Usuarios
User

id

email

password

roleId

districtId

peaceHouseId

isActive

lastLogin

Un usuario.

Una cuenta.

Los pastores esposos compartirán un solo usuario.

No dos.

Esto responde al modelo organizacional definido.

8. Reuniones
Meeting

id

peaceHouseId

meetingDate

theme

offering

photo

observations

status

createdBy

Estado

Programada

Abierta

Cerrada

Cancelada

9. Asistencia

Nunca guardar asistencia dentro de Meeting.

Crear tabla.

Attendance

id

meetingId

personId

present

createdAt

Ventaja.

Mucho más rápida.

Más limpia.

10. Fotografías

Nunca guardar imágenes en PostgreSQL.

Solo URL.

MeetingPhoto

id

meetingId

url

uploadedBy
11. Ofrendas

Separar.

Nunca dentro Meeting.

Offering

id

meetingId

amount

currency

notes

createdBy

Esto permitirá futuras auditorías.

12. Auditoría

Toda tabla importante tendrá auditoría.

AuditLog

id

userId

entity

entityId

action

oldValues

newValues

ip

userAgent

createdAt

Nunca eliminar auditoría.

13. Archivos
File

id

url

type

size

mime

uploadedBy
14. Configuración
Setting

id

key

value

description
15. Índices

Indexar.

email

phone

districtId

peaceHouseId

meetingDate

municipalityId

createdAt

status

Nunca indexar todo.

Solo consultas frecuentes.

16. UUID

Todas las PK.

UUID.

Nunca BIGINT.

17. Soft Delete

Todas las tablas.

deletedAt

deletedBy

Nunca eliminar físicamente.

18. Timestamps

Todas las tablas.

createdAt

updatedAt
19. Versionado

Nunca modificar registros históricos.

Crear nuevos.

20. Backups

Automáticos.

Diarios.

Semanales.

Mensuales.

21. Migraciones

Solo Prisma.

Nunca SQL manual.

Una migración.

Un cambio.

22. Performance

Consultas Dashboard.

No deberán calcular.

En tiempo real.

Crear.

Views Materializadas (cuando el volumen lo justifique).

Tablas resumen (opcional).

Cache Redis.

23. Escalabilidad

Preparado para.

100 Distritos.

5.000 Casas.

300.000 Personas.

20 años de información.

Sin rediseñar BD.

24. Seguridad

Contraseñas.

Argon2.

Nunca texto plano.

Tokens.

No almacenar JWT.

Solo Refresh Token hasheado.

25. Prisma

Todos los modelos.

UUID.

Soft Delete.

Timestamps.

Relaciones.

Enums.

26. Relaciones
Church

↓

District

↓

PeaceHouse

↓

Meeting

↓

Attendance

↓

Person
27. Esquema lógico de la Base de Datos
Church
 │
 ├── District
 │      │
 │      ├── User (Pastores de Distrito)
 │      │
 │      └── PeaceHouse
 │              │
 │              ├── User (Líder)
 │              │
 │              ├── Person
 │              │
 │              └── Meeting
 │                      │
 │                      ├── Attendance
 │                      ├── Offering
 │                      └── MeetingPhoto
 │
 └── Users (Administradores y Pastores Generales)

Catalogs
 ├── Departments
 ├── Municipalities
 ├── Roles
 ├── PersonStatus
 └── MeetingStatus

Audit
 ├── AuditLog

Files
 ├── File

Settings
 ├── Setting
28. Reglas de Integridad

La base de datos deberá garantizar:

Una Persona solo puede pertenecer a una Casa de Paz activa a la vez.
Un Líder solo puede estar asignado a una Casa de Paz.
Una Casa de Paz pertenece a un único Distrito.
Un Distrito pertenece a una única Iglesia.
No se podrá eliminar un Distrito con Casas de Paz activas.
No se podrá eliminar una Casa de Paz con reuniones históricas; solo podrá inactivarse.
Las reuniones cerradas no podrán modificarse, salvo por un Administrador.

Estas reglas deben reforzarse tanto en la lógica del negocio como mediante restricciones en la base de datos cuando sea posible.

29. Estrategia de Optimización

Para mantener un excelente rendimiento:

Índices compuestos

Ejemplos:

(districtId, status)
(peaceHouseId, meetingDate)
(meetingId, personId) (único para evitar asistencia duplicada)
(municipalityId, status)
Consultas pesadas
Utilizar paginación.
Evitar SELECT *.
Proyectar únicamente las columnas necesarias.
Dashboard

El Dashboard no debe recorrer toda la base de datos en cada carga.

Se recomienda:

Redis para métricas frecuentes.
Jobs programados para recalcular indicadores.
Materialized Views cuando el volumen de datos lo justifique.
30. Estrategia de Archivos

Las imágenes no se almacenarán en PostgreSQL.

Se propone:

Almacenamiento S3 compatible (MinIO para desarrollo, AWS S3 o Cloudflare R2 en producción).
En la base de datos solo se almacenará la referencia (URL, tamaño, tipo MIME, fecha de carga).

Esto facilitará copias de seguridad y reducirá el tamaño de la base de datos.

31. Preparación para Multiiglesia (Futuro)

Aunque la versión inicial administrará una sola iglesia, toda la arquitectura deberá contemplar la posibilidad de múltiples iglesias en una versión futura.

Por ello:

Todas las entidades organizacionales estarán relacionadas con churchId.
Los filtros por iglesia deberán ser sencillos de incorporar.
No se asumirán valores fijos en el código.
32. Observaciones importantes sobre tu proyecto

Después de analizar todo el sistema, considero que hay tres decisiones que mejorarán mucho la arquitectura:

1. Catálogo oficial de Colombia

En lugar de guardar el nombre del municipio en texto, utilizar tablas maestras:

Department
Municipality

Esto permitirá:

Mapa de Colombia.
Estadísticas por departamento.
Evitar errores de escritura.
Filtros rápidos.
2. Historial pastoral

Además del historial de traslados, sería muy útil registrar el historial de participación de cada persona.

Por ejemplo:

Primera asistencia.
Última asistencia.
Número total de reuniones.
Porcentaje de asistencia.
Tiempo en la Casa de Paz.

Con esto podrás crear reportes muy valiosos sin recalcular constantemente.

3. Estados derivados

En lugar de que un líder cambie manualmente el estado de una persona, algunos estados podrían calcularse automáticamente:

Nuevo: primera reunión registrada.
Frecuente: asistió a varias reuniones consecutivas.
Inactivo: no asiste durante un periodo configurable.
Reactivado: vuelve a asistir después de un periodo de ausencia.

Así se reduce el trabajo manual y se mejora la calidad de los indicadores.