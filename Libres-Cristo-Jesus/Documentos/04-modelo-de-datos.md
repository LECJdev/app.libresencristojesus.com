1. Objetivo

Definir el modelo de datos completo del sistema, las entidades, sus relaciones, restricciones, cardinalidades y reglas de integridad, garantizando una estructura escalable y preparada para futuras ampliaciones.

2. Organización del Modelo

El modelo de datos se dividirá en cuatro dominios principales:

BASE DE DATOS

├── Catálogos
├── Organización
├── Operación
└── Seguridad
3. Catálogos (Master Data)

Estas tablas serán administradas por el sistema y casi nunca cambiarán.

CatDepartment
id
codeDane
name
status
createdAt
updatedAt

Relación:

Departamento

↓

Muchos Municipios
CatMunicipality
id
departmentId
codeDane
name
status

Relación:

Municipio

↓

Pertenece

↓

Departamento
CatRole
id
name
description

Roles iniciales:

Administrador
Pastor General
Pastor Distrito
Líder
CatMeetingStatus
Programada

En Curso

Pendiente

Reportada

Validada

Cerrada
CatPersonStage

Aquí incorporamos el proceso pastoral que mencionamos anteriormente.

Nuevo Visitante

Asistente Frecuente

En Consolidación

Miembro

Servidor

Líder Potencial

Esto permitirá medir el crecimiento espiritual, no solo la asistencia.

4. Organización
Church

Aunque hoy exista una sola iglesia, recomiendo crear esta tabla para preparar el sistema hacia una arquitectura multiiglesia.

Church

id

name

logo

primaryColor

secondaryColor

address

phone

email
LeadershipUnit

Esta será una de las tablas más importantes.

No guardaremos directamente "Pastor" o "Líder".

Guardaremos una Unidad de Liderazgo.

LeadershipUnit

id

type

photo

username

passwordHash

roleId

status
LeadershipMember

Una Unidad de Liderazgo tendrá dos integrantes.

LeadershipMember

id

leadershipUnitId

firstName

lastName

gender

phone

email

photo

birthDate

Relación

LeadershipUnit

↓

Tiene

↓

2 LeadershipMembers
District
id

churchId

number

name

leadershipUnitId

status
PeaceHouse
id

districtId

leadershipUnitId

name

departmentId

municipalityId

neighborhood

address

meetingDay

meetingHour

status
5. Personas
Person
id

document

firstName

lastName

phone

email

birthDate

address

personStageId

status
PersonPeaceHouseHistory

Una de las tablas más importantes.

id

personId

peaceHouseId

startDate

endDate

reason

Gracias a esta tabla podremos saber:

dónde estuvo una persona;
cuándo cambió de Casa de Paz;
quién realizó el traslado.

Sin perder el historial.

6. Operación
MeetingSchedule

Aquí se almacena la programación semanal.

id

peaceHouseId

meetingDay

meetingHour

active
Meeting

Cada reunión generada automáticamente.

id

meetingScheduleId

meetingDate

status

themeId

offering

notes

validatedBy

closedAt
SermonTheme

No escribir el tema manualmente cada semana.

id

title

description

series

createdBy
Attendance
id

meetingId

personId

present

arrivalTime

comments
MeetingPhoto
id

meetingId

fileName

path

uploadedBy

createdAt

Permitir múltiples fotografías.

7. Reportes

No recomiendo guardar estadísticas calculadas.

Todas las métricas deberán calcularse a partir de los datos transaccionales para evitar inconsistencias.

En el futuro, si el volumen crece, se pueden añadir tablas materializadas o procesos de agregación.

8. Seguridad
UserSession
id

leadershipUnitId

refreshToken

device

browser

ip

lastAccess
AuditLog
id

entity

entityId

action

oldValue

newValue

userId

ip

createdAt
Notification
id

userId

title

message

type

read

createdAt
9. Relaciones Principales
Church
│
└── District
      │
      └── PeaceHouse
              │
              ├── MeetingSchedule
              │        │
              │        └── Meeting
              │                 │
              │                 ├── Attendance
              │                 ├── MeetingPhoto
              │                 └── Offering
              │
              └── LeadershipUnit
                        │
                        └── LeadershipMember
10. Personas
Person
│
└── PersonPeaceHouseHistory
         │
         └── PeaceHouse
11. Catálogos
Department

↓

Municipality

↓

PeaceHouse
12. Índices Recomendados

Crear índices sobre:

Documento de la persona.
Teléfono.
Correo electrónico.
Número de distrito.
Nombre de Casa de Paz.
Fecha de reunión.
Estado de la reunión.
Municipio.
Departamento.
Código DANE.
Usuario.
Refresh Token.
13. Eliminación Lógica

Todas las tablas principales incluirán:

status

deletedAt

deletedBy

Nunca se eliminarán registros físicamente.

14. Campos Comunes

Sugiero que todas las entidades principales hereden una entidad base con:

id (UUID)

createdAt

updatedAt

createdBy

updatedBy

deletedAt

deletedBy

status

version

El campo version facilitará implementar bloqueo optimista (optimistic locking) en operaciones concurrentes.

15. Convenciones
Claves primarias: UUID.
Relaciones explícitas mediante claves foráneas.
Fechas en UTC.
Dinero: Decimal (no Float).
Fotografías: solo almacenar la ruta del archivo.
Todos los nombres de tablas y columnas en inglés para mantener consistencia con Prisma y NestJS.
Mejoras que considero fundamentales antes de generar el schema.prisma
1. Separar Ofrendas de las Reuniones

Aunque actualmente una reunión tenga una única ofrenda, recomiendo crear una entidad independiente:

Offering

id

meetingId

amount

currency

notes

registeredBy

createdAt

Esto permitirá registrar ajustes, soportar futuras ampliaciones (por ejemplo, diferentes tipos de aportes) y mantener un historial financiero más sólido.

2. Historial de liderazgo

Crear una tabla específica:

PeaceHouseLeadershipHistory

id

peaceHouseId

leadershipUnitId

startDate

endDate

reason

Así se conservará el historial completo de quién lideró cada Casa de Paz a lo largo del tiempo.

3. Parámetros del sistema

En lugar de dejar configuraciones fijas en el código, crear una tabla:

SystemSetting

key

value

description

Aquí podrán almacenarse:

Nombre de la iglesia.
Logo.
Colores institucionales.
Duración de sesiones.
Configuración de la PWA.
Reglas generales del sistema.
4. Catálogo de archivos

En vez de tener tablas independientes para fotografías de reuniones o líderes, podríamos utilizar un modelo unificado:

File

id

entityType

entityId

category

fileName

path

mimeType

size

uploadedBy

createdAt

Con este enfoque, el mismo sistema de almacenamiento servirá para:

Fotografías de reuniones.
Fotos de líderes.
Logo institucional.
Documentos.
Archivos futuros.

Esto reducirá código duplicado y simplificará el mantenimiento.