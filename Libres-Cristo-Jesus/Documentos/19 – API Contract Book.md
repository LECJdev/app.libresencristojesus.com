API CONTRACT BOOK
Plataforma Gestión Casas de Paz

Versión 1.0

Índice
1. Convenciones

2. Autenticación

3. Versionado

4. Formato Respuesta

5. Errores

6. Paginación

7. Filtros

8. Endpoints

9. DTO

10. Permisos

11. Auditoría

12. Swagger
1. Convenciones

Base URL

/api/v1

Todos los recursos utilizarán REST.

Ejemplo

GET

POST

PUT

PATCH

DELETE

Nunca verbos en la URL.

Incorrecto

/createPerson

Correcto

POST /persons
Convención JSON

Todas las respuestas utilizarán camelCase.

Ejemplo

{
  "firstName": "Jorge",
  "lastName": "Ramirez"
}

Nunca snake_case.

Formato Fecha

Siempre

ISO 8601

2026-08-15T18:30:00Z
Moneda

Todas las ofrendas se almacenarán como enteros en pesos colombianos (COP), sin decimales.

Ejemplo:

{
  "offeringAmount": 250000
}
UUID

Todos los recursos utilizarán UUID.

Nunca IDs consecutivos.

2. Autenticación

JWT

Bearer Token

Authorization

Bearer eyJhb...

Refresh Token

POST

/auth/refresh

Login

POST

/auth/login

Logout

POST

/auth/logout

Perfil

GET

/auth/me
Login Request
{
  "email": "lider@iglesia.com",
  "password": "********"
}

Respuesta

{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {}
}
3. Versionado

Siempre

/api/v1

Futuro

/api/v2

Nunca romper compatibilidad.

4. Formato Respuesta

Toda respuesta seguirá esta estructura.

{
  "success": true,
  "message": "Operación realizada correctamente.",
  "data": {},
  "meta": {},
  "errors": null
}
Error
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "Correo inválido"
    }
  ]
}
5. Códigos HTTP
200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation

500 Internal Server Error
6. Paginación

Todos los listados utilizarán.

?page=1

&pageSize=20

Respuesta

{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 250,
    "pages": 13
  }
}
7. Ordenamiento
?sort=name

?order=asc
Búsqueda
?search=jorge
Filtros
?districtId=

?houseId=

?municipalityId=

?status=

?from=

?to=
8. Módulos API

La API estará organizada por dominios.

/auth

/users

/roles

/church

/districts

/peace-houses

/persons

/meetings

/attendance

/offerings

/dashboard

/reports

/photos

/files

/settings

/audit
AUTH
Login
POST /auth/login
Logout
POST /auth/logout
Refresh
POST /auth/refresh
Perfil
GET /auth/me
USERS
Listar
GET /users

Crear

POST /users

Detalle

GET /users/{id}

Editar

PATCH /users/{id}

Eliminar (Soft Delete)

DELETE /users/{id}
DISTRICTS
GET

POST

PATCH

DELETE
PEACE HOUSES
GET /peace-houses
POST /peace-houses
PATCH /peace-houses/{id}
DELETE /peace-houses/{id}
PERSONS

Listar

GET /persons

Crear

POST /persons

Editar

PATCH /persons/{id}

Trasladar

POST /persons/{id}/transfer

Historial

GET /persons/{id}/history
MEETINGS

Crear programación

POST /meetings

Reuniones de la semana

GET /meetings/current

Detalle

GET /meetings/{id}

Actualizar

PATCH /meetings/{id}

Cerrar reunión

POST /meetings/{id}/close
ATTENDANCE

Registrar

POST /attendance

Actualizar

PATCH /attendance/{id}

Eliminar

DELETE /attendance/{id}

Consultar

GET /attendance
OFFERINGS

Registrar

POST /offerings

Consultar

GET /offerings

Detalle

GET /offerings/{id}
DASHBOARD

General

GET /dashboard/general

Distrito

GET /dashboard/district

Casa de Paz

GET /dashboard/peace-house

KPIs

GET /dashboard/kpis

Mapa Colombia

GET /dashboard/map

Organigrama

GET /dashboard/organization
REPORTES

Asistencia

GET /reports/attendance

Ofrendas

GET /reports/offerings

Excel

GET /reports/export
FILES

Subir Imagen

POST /files/upload

Eliminar

DELETE /files/{id}
SETTINGS
GET

PATCH
AUDITORÍA
GET /audit

Detalle

GET /audit/{id}
DTO

Ejemplo Persona

CreatePersonDTO
{
  "firstName": "Jorge",
  "lastName": "Ramirez",
  "phone": "3144640145",
  "email": "jorge@email.com",
  "municipalityId": "uuid",
  "peaceHouseId": "uuid"
}
Response DTO
{
  "id": "uuid",
  "firstName": "Jorge",
  "lastName": "Ramirez",
  "createdAt": "2026-08-15T20:00:00Z"
}
Permisos por Endpoint
Endpoint	Admin	Pastor General	Pastor Distrito	Líder
Usuarios	✅	❌	Crear líderes de su distrito	❌
Distritos	✅	Solo lectura	Solo su distrito	❌
Casas de Paz	✅	Lectura	CRUD de su distrito	Solo lectura
Personas	✅	Lectura	CRUD de su distrito	CRUD de su Casa de Paz
Reuniones	✅	Lectura	Gestión de su distrito	Registrar y editar su reunión
Dashboard	✅	Global	Distrito	Casa de Paz
Reportes	✅	Global	Distrito	Casa de Paz
Auditoría

Las siguientes operaciones deberán registrarse:

Inicio y cierre de sesión.
Creación, edición y eliminación de usuarios.
Creación y modificación de distritos y Casas de Paz.
Registro y cierre de reuniones.
Registro de asistencia.
Registro y modificación de ofrendas.
Cambios de configuración.
Cambios de permisos.

Cada registro incluirá:

Usuario.
Fecha y hora.
Dirección IP.
Dispositivo.
Acción realizada.
Recurso afectado.
Valores anteriores (cuando aplique).
Valores nuevos.
Swagger

Todos los endpoints deberán estar completamente documentados mediante OpenAPI.

Cada operación incluirá:

Descripción.
Parámetros.
DTO de entrada.
DTO de salida.
Ejemplos.
Posibles errores.
Permisos requeridos.
Versionado y Compatibilidad

Las futuras versiones de la API deberán mantener compatibilidad con /api/v1 durante un periodo de transición.

Las funcionalidades nuevas se agregarán preferiblemente sin romper contratos existentes.

Recomendaciones adicionales para este proyecto

Después de revisar toda la arquitectura, hay cuatro mejoras que considero muy valiosas antes de empezar el desarrollo:

1. API BFF (Backend for Frontend)

Crear un módulo BFF que agregue datos para el Dashboard. Así el frontend realiza una sola petición y el backend compone la información necesaria, reduciendo tiempos de carga.

2. API de métricas especializada

En lugar de reutilizar endpoints genéricos para los gráficos, crear un módulo /analytics con consultas optimizadas para indicadores, evitando cálculos pesados en tiempo real.

3. Idempotencia

Para operaciones sensibles (como registrar una reunión u ofrenda), implementar claves de idempotencia para evitar registros duplicados si el usuario presiona varias veces el botón desde un móvil con mala conexión.

4. Consistencia Offline para la PWA

Diseñar desde el inicio la API pensando en sincronización. Cuando la aplicación funcione sin conexión, las operaciones podrán almacenarse localmente y enviarse al servidor al recuperar Internet, resolviendo conflictos de forma controlada.