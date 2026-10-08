Objetivo

Diseñar un modelo de datos robusto, escalable y normalizado que permita:

Crecer sin modificar la estructura principal.
Mantener el historial completo.
Evitar duplicidad de información.
Optimizar consultas para dashboards.
Facilitar auditoría.
Facilitar reportes.
Arquitectura General
┌──────────────────────────────┐
│          CHURCH              │
└──────────────┬───────────────┘
               │
               ▼
      LEADERSHIP UNIT
               │
               ▼
         DISTRICT
               │
               ▼
        PEACE HOUSE
               │
               ▼
           MEETING
               │
     ┌─────────┴─────────┐
     ▼                   ▼
ATTENDANCE          OFFERING
     │
     ▼
 PERSON
Filosofía

Cada tabla tendrá un único propósito.

Nunca mezclar conceptos.

Ejemplo:

Incorrecto

Persona

Nombre

Distrito

Casa

Pastor

Asistencia

Correcto

Persona

↓

Attendance

↓

Meeting

↓

PeaceHouse
Convenciones

Todas las tablas utilizarán:

id (UUID)

createdAt

updatedAt

deletedAt

createdBy

updatedBy

Nunca eliminar físicamente registros importantes.

Se utilizará Soft Delete.

Catálogos
Country

Aunque inicialmente solo exista Colombia.

Country

id

name

isoCode
Department
Department

id

codeDane

name
Municipality
Municipality

id

departmentId

codeDane

name

Esto permitirá construir el mapa nacional.

Organización
Church

Solo existirá un registro.

Church

id

name

logo

mission

vision

primaryColor

secondaryColor
LeadershipUnit

Esta será una de las entidades más importantes.

LeadershipUnit

id

username

email

password

roleId

status

photo

phone

Una LeadershipUnit representa una pareja.

Nunca una sola persona.

LeadershipMember
LeadershipMember

id

leadershipUnitId

firstName

lastName

gender

photo

birthday

phone

email

Relación

LeadershipUnit

↓

LeadershipMember

LeadershipMember

Normalmente serán dos.

Pero el modelo permitirá más integrantes en el futuro si fuese necesario.

Roles
Role

id

name

description
Permissions
Permission

id

code

description
RolePermission

Tabla pivote.

Usuarios

No existirá una tabla User independiente.

El usuario será la LeadershipUnit.

Esto representa correctamente el modelo de la iglesia.

Distrito
District

id

number

name

leadershipUnitId

status

Relaciones

District

↓

PeaceHouse
PeaceHouse
PeaceHouse

id

districtId

leadershipUnitId

name

address

departmentId

municipalityId

neighborhood

latitude (opcional)

longitude (opcional)

meetingDay

meetingHour

status

Observación: Aunque inicialmente no se usará Google Maps, conservar latitude y longitude como campos opcionales permitirá integrar mapas en el futuro sin migraciones complejas.

Persona

Esta tabla crecerá muchísimo.

Person

id

firstName

lastName

documentType

documentNumber

phone

email

birthday

gender

address

notes

No guardar:

Distrito.

Casa.

Asistencia.

Eso irá en tablas independientes.

PersonAssignment

Una persona puede cambiar de Casa de Paz.

Por eso no se debe guardar el peaceHouseId en la tabla Person.

PersonAssignment

id

personId

peaceHouseId

startDate

endDate

reason

Nunca se pierde historial.

MeetingSchedule

Aquí vive la programación semanal.

MeetingSchedule

id

peaceHouseId

weekday

hour

active

Un líder crea esta programación una sola vez.

Meeting

Cada semana se genera una reunión.

Meeting

id

scheduleId

meetingDate

topic

notes

offeringAmount

status

closedAt
Attendance
Attendance

id

meetingId

personId

present

registeredAt

No almacenar una lista de asistentes en formato JSON.

Cada asistencia será un registro independiente.

MeetingPhoto
MeetingPhoto

id

meetingId

fileId

caption
File

Tabla genérica.

File

id

filename

originalName

mimeType

extension

size

storagePath

publicUrl

checksum

En el futuro servirá para:

Logos.
Fotografías.
Firmas.
Documentos.
Archivos Excel.
Offering

Aunque hoy exista un único valor por reunión, propongo separarlo.

Offering

id

meetingId

amount

currency

observations

Esto permitirá auditoría financiera.

Notifications
Notification

id

title

message

userId

read

type

createdAt
AuditLog

Muy importante.

AuditLog

id

userId

entity

entityId

action

oldData

newData

ip

device

browser

createdAt

Nunca eliminar.

Session
UserSession

id

userId

refreshToken

device

os

browser

expiresAt
Configuración
SystemSetting

id

key

value

description
Relaciones
Church

↓

District

↓

PeaceHouse

↓

MeetingSchedule

↓

Meeting

↓

Attendance

↓

Person
Índices

Todos los campos de búsqueda tendrán índices.

Ejemplos

documentNumber

phone

email

meetingDate

districtId

peaceHouseId

municipalityId
Restricciones

No permitir:

Dos Distritos con el mismo número.

Dos Casas iguales en un mismo Distrito.

Dos usuarios con el mismo username.

Dos personas con el mismo documento dentro del mismo contexto.

Enums
RoleType

ADMIN

GENERAL_PASTOR

DISTRICT_PASTOR

LEADER
DistrictStatus

ACTIVE

INACTIVE

CLOSED
MeetingStatus

OPEN

CLOSED

PENDING
AttendanceStatus

PRESENT

ABSENT
Vistas Materializadas (Muy recomendadas)

Para que los dashboards sean extremadamente rápidos.

Ejemplo.

vw_dashboard_general

vw_dashboard_district

vw_dashboard_peace_house

Estas vistas pueden actualizarse automáticamente tras cerrar una reunión o mediante tareas programadas.

Seed Inicial

El proyecto deberá incluir datos semilla.

Crear automáticamente:

Iglesia.
País (Colombia).
Los 32 departamentos.
Todos los municipios con código DANE.
Roles.
Permisos.
Usuario Administrador.
Pastores Generales.
Configuración inicial.

Así el sistema quedará listo para usar desde la primera instalación.

Estrategia de Migraciones

Utilizar Prisma Migrate.

Reglas:

Nunca editar una migración ya aplicada.
Cada cambio estructural genera una nueva migración.
Mantener un historial completo de migraciones.
Multiidioma (Preparado)

Aunque inicialmente el sistema estará en español, las tablas de configuración y catálogos deberán estar preparadas para internacionalización si en el futuro se requiere.

Estrategia de Rendimiento

Para garantizar un excelente desempeño incluso con cientos de Distritos y miles de asistentes:

Índices compuestos para búsquedas frecuentes.
Consultas paginadas.
Uso de select en Prisma para traer únicamente los campos necesarios.
Evitar consultas N+1 utilizando include y relaciones optimizadas.
Caché para catálogos (departamentos, municipios y roles).
Modelo Prisma sugerido

La estructura del proyecto debería organizar los modelos por dominio:

prisma/
│
├── schema.prisma
├── enums.prisma
├── organization.prisma
├── people.prisma
├── meetings.prisma
├── attendance.prisma
├── security.prisma
├── audit.prisma
├── settings.prisma
└── seeds/
    ├── roles.seed.ts
    ├── colombia.seed.ts
    ├── church.seed.ts
    └── admin.seed.ts

Aunque Prisma utiliza un único schema.prisma, esta organización facilita el mantenimiento utilizando herramientas de composición o generación durante el desarrollo.