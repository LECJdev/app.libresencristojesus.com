1. Objetivo

Toda comunicación entre Frontend y Backend deberá realizarse mediante una API REST documentada con OpenAPI 3.1.

No se permitirá consumir endpoints no documentados.

Toda API deberá estar versionada.

Ejemplo:

/api/v1/
2. Arquitectura
NextJS

↓

TanStack Query

↓

REST API

↓

NestJS

↓

Prisma ORM

↓

PostgreSQL
3. Convenciones

Todos los endpoints utilizarán:

JSON

UTF-8

HTTPS

JWT

CamelCase

4. Versionado
/api/v1/auth

/api/v1/users

/api/v1/districts

/api/v1/peace-houses

En futuras versiones:

/api/v2/
5. Formato de Respuesta

Todas las respuestas deberán tener exactamente la misma estructura.

Éxito
{
  "success": true,
  "message": "Distrito creado correctamente.",
  "data": {},
  "meta": null,
  "errors": null
}
Error
{
  "success": false,
  "message": "No fue posible crear el distrito.",
  "data": null,
  "meta": null,
  "errors": [
    {
      "field": "number",
      "message": "El número ya existe."
    }
  ]
}

Nunca devolver respuestas diferentes dependiendo del controlador.

6. Autenticación
Login
POST /api/v1/auth/login

Request

{
  "username": "distrito09",
  "password": "********"
}

Response

{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600,
  "user": {}
}
Refresh
POST /api/v1/auth/refresh
Logout
POST /api/v1/auth/logout
7. Usuarios
Obtener perfil
GET /api/v1/users/me

Actualizar perfil

PUT /api/v1/users/me

Cambiar contraseña

PUT /api/v1/users/change-password
8. Organización

Obtener organigrama

GET /api/v1/organization/tree

Obtener Dashboard

GET /api/v1/organization/dashboard

Buscar liderazgo

GET /api/v1/organization/search

Parámetros

name

district

municipality

role
9. Distritos

Obtener lista

GET /api/v1/districts

Obtener uno

GET /api/v1/districts/{id}

Crear

POST /api/v1/districts

Actualizar

PUT /api/v1/districts/{id}

Cambiar estado

PATCH /api/v1/districts/{id}/status
10. Casas de Paz

Listado

GET /api/v1/peace-houses

Detalle

GET /api/v1/peace-houses/{id}

Crear

POST /api/v1/peace-houses

Editar

PUT /api/v1/peace-houses/{id}

Cerrar

PATCH /api/v1/peace-houses/{id}/close
11. Personas

Buscar

GET /api/v1/people

Filtros

Nombre

Celular

Correo

Documento

Casa

Distrito

Municipio

Detalle

GET /api/v1/people/{id}

Crear

POST /api/v1/people

Editar

PUT /api/v1/people/{id}

Trasladar

POST /api/v1/people/{id}/transfer

Historial

GET /api/v1/people/{id}/history
12. Reuniones

Próximas

GET /api/v1/meetings

Detalle

GET /api/v1/meetings/{id}

Registrar

POST /api/v1/meetings/{id}/report

Cerrar

POST /api/v1/meetings/{id}/close
13. Asistencia

Listado

GET /api/v1/attendance/{meetingId}

Guardar

PUT /api/v1/attendance/{meetingId}

Request

{
  "attendees": [
    {
      "personId": "uuid",
      "present": true
    }
  ]
}
14. Fotografías

Subir

POST /api/v1/files/upload

Multipart FormData.

Listar

GET /api/v1/files/{meetingId}

Eliminar (Soft Delete)

DELETE /api/v1/files/{id}
15. Ofrendas

Registrar

POST /api/v1/offerings

Consultar

GET /api/v1/offerings
16. Dashboard

General

GET /api/v1/dashboard/general

Distrito

GET /api/v1/dashboard/district

Casa

GET /api/v1/dashboard/peace-house
17. Reportes

Excel

GET /api/v1/reports/excel

PDF (preparado para una versión futura)

GET /api/v1/reports/pdf
18. Catálogos

Departamentos

GET /api/v1/catalogs/departments

Municipios

GET /api/v1/catalogs/municipalities

Roles

GET /api/v1/catalogs/roles
19. Parámetros de Consulta

Todas las listas soportarán:

?page=1

?pageSize=20

?sort=name

?order=asc

?search=jorge

Filtros múltiples

?department=11

&municipality=05001

&status=ACTIVE
20. Códigos HTTP
Código	Significado
200	Consulta exitosa
201	Recurso creado
204	Sin contenido
400	Solicitud inválida
401	No autenticado
403	Sin permisos
404	No encontrado
409	Conflicto
422	Error de validación
429	Demasiadas solicitudes
500	Error interno
21. Seguridad

Todos los endpoints privados deberán requerir:

Authorization

Bearer JWT
22. Paginación

Formato único.

{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 550,
    "pages": 28
  }
}
23. Auditoría

Cada endpoint deberá registrar:

Usuario

IP

Método

Endpoint

Tiempo

Resultado

24. Swagger

Disponible en:

/api/docs

Todo endpoint deberá incluir:

Descripción.

Ejemplo Request.

Ejemplo Response.

Errores.

Permisos.

Tags.

25. Convenciones DTO

Todos los DTO deberán terminar en:

CreateDistrictDto

UpdateDistrictDto

CreateMeetingDto

CreatePersonDto

Nunca usar objetos genéricos.

26. Nombres de Controladores
DistrictController

PeopleController

MeetingController

DashboardController
27. Servicios
DistrictService

MeetingService

PeopleService
28. Repositorios
DistrictRepository

MeetingRepository

AttendanceRepository
29. Validaciones

Toda validación deberá implementarse mediante:

class-validator
class-transformer
Pipes personalizados cuando sea necesario.
Zod en el frontend para mantener coherencia entre cliente y servidor.

Nunca confiar únicamente en el frontend.

30. Errores de Dominio

No todos los errores son errores técnicos. Define excepciones específicas del negocio:

DistrictAlreadyExistsException
PeaceHouseAlreadyClosedException
MeetingAlreadyReportedException
AttendanceClosedException
LeadershipAlreadyAssignedException

Esto hace que el código sea mucho más expresivo y facilita el manejo de errores en el frontend.

31. Idempotencia

Algunas operaciones deberán ser idempotentes.

Ejemplos:

Registrar una reunión no debe crear duplicados si el usuario pulsa dos veces el botón.
Subir la misma fotografía accidentalmente debe detectarse si aplica.
Registrar asistencia debe reemplazar el estado de la reunión y no duplicar registros.
32. API de Búsqueda Global

En lugar de hacer múltiples consultas desde el frontend, propongo un endpoint unificado:

GET /api/v1/search?q=jorge

Respuesta agrupada:

{
  "people": [],
  "districts": [],
  "peaceHouses": [],
  "leadershipUnits": []
}

Esto hará que el buscador global sea extremadamente rápido y sencillo de implementar.

33. API de Dashboard

Los dashboards no deberían construirse con decenas de llamadas.

Cada dashboard tendrá un endpoint agregado.

Ejemplo:

GET /api/v1/dashboard/leader

Respuesta:

{
  "summary": {},
  "kpis": {},
  "attendanceChart": [],
  "offeringChart": [],
  "recentMeetings": [],
  "notifications": []
}

Con una sola llamada el frontend podrá renderizar toda la pantalla.

34. API de Organigrama

El organigrama también debería devolverse como un árbol ya construido:

{
  "church": {
    "districts": [
      {
        "peaceHouses": [
          {
            "leadershipUnit": {}
          }
        ]
      }
    ]
  }
}

Así React Flow o cualquier componente visual solo tendrá que renderizar la estructura sin reconstruirla en el cliente.

35. Estrategia de Versionado Futuro

Las versiones mayores (v2, v3, etc.) nunca romperán los clientes existentes. Cuando una API quede obsoleta:

Se marcará como deprecated en OpenAPI.
Se mantendrá durante un período de transición.
Se documentará claramente la versión recomendada.
Conclusión

Con los documentos 00 al 09, el proyecto ya dispone de una especificación funcional y técnica comparable a la utilizada en desarrollos empresariales:

Visión del producto.
Requerimientos.
Reglas de negocio.
Arquitectura.
Modelo de datos.
Roles y permisos.
Historias de usuario.
UX/UI.
Contratos de API.