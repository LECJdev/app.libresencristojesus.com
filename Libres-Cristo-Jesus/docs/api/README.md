# API — LCJ Connect

La referencia viva y completa es **Swagger**, generado del código:

```
http://<api>/docs
```

Este documento cubre lo que Swagger no puede expresar: las convenciones
transversales y los motivos detrás de ellas.

---

## 1. Sin prefijo global

Los endpoints son `/auth/login`, `/offerings`, `/dashboard/summary` — **no**
`/api/v1/...`. `main.ts` no llama a `setGlobalPrefix`.

---

## 2. El sobre de respuesta

Toda respuesta, exitosa o no, lleva la misma envoltura:

```jsonc
// éxito
{ "success": true, "message": "…", "data": …, "meta": { … } }
// error
{ "success": false, "message": "…", "errors": [ … ] }
```

`meta` aparece en los listados con `page`, `pageSize`, `total` y `pages`.

Los mensajes de error vienen **en español y escritos para humanos**: el
frontend los muestra tal cual, porque reemplazarlos por una frase genérica
tiraría la única parte de la respuesta que le dice al usuario qué hacer.

### La única ruta sin sobre

`GET /reports/:type/export` devuelve un `.xlsx` binario.

> **Bug real, encontrado descargando el archivo:** el interceptor envolvía
> también el binario, produciendo un `.xlsx` cuyos primeros bytes eran
> `{"success":true,…`. Llevaba el `Content-Type` correcto, el
> `Content-Disposition` correcto y un `Content-Length` verosímil — todo pasaba
> menos Excel. Hoy el interceptor deja pasar intacto cualquier `StreamableFile`.
> No es un decorador por ruta a propósito: un opt-out que hay que recordar es
> un opt-out que alguien olvida.

---

## 3. Paginación, orden y búsqueda

`?page=1&pageSize=20&sort=name&order=asc&search=texto`

> **`pageSize` tiene tope de 100.** Pedir 200 para llenar un `<select>`
> devuelve 400.

**Cada servicio define qué columnas admite ordenar**, y esa lista _no_ coincide
con las columnas visibles. `sermon-themes` no ordena por `status`; `offerings`
solo por `amount` y `createdAt`. Marcar una columna como ordenable cuando el
backend la ignora produce una flecha que no ordena nada — hay que cruzar tabla
con servicio.

---

## 4. Permisos

`@RequirePermission('<recurso>', '<acción>')` sobre cada ruta, contra las
tablas `Permission` / `RolePermission` sembradas.

Cuando la ruta identifica **un** recurso, se añade el alcance:

```ts
@RequirePermission('meeting', 'register', {
  scopeType: ScopeResourceType.MEETING,
  paramName: 'meetingId',
})
```

**Un agregado o una lista no lleva `scopeType`** — no hay un id único que
resolver. El recorte ocurre en la cláusula `where` del servicio, vía
`peaceHouseScopeFilter`. Eso no es una omisión: está documentado en
`OfferingsController`, `DashboardController` y `ReportsController`.

---

## 5. Convenciones de escritura

- **`PUT` cuando el recurso es único por padre.** La ofrenda de una reunión es
  una sola (RN-039), así que registrarla y corregirla son el mismo acto sobre
  el mismo recurso; un `POST` invitaría a una segunda fila que la restricción
  única rechazaría.
- **`null` y `undefined` significan cosas distintas** en un `PATCH`: `null`
  desvincula, `undefined` no toca. Es la diferencia entre "no lo dictó nadie" y
  "no lo tocaron".
- **`version` obligatorio** en las actualizaciones con bloqueo optimista.
- **Los archivos viajan como RUTA, nunca como binario.** El flujo es
  `POST /files/upload` → recibir `path` → guardar ese `path` en la entidad.

---

## 6. Módulos

| Prefijo                                         | Qué resuelve                                             |
| ----------------------------------------------- | -------------------------------------------------------- |
| `/auth`                                         | Ingreso, refresco, cierre de sesión                      |
| `/users`, `/roles`, `/permissions`              | Cuentas y autorización                                   |
| `/organizations`, `/districts`, `/peace-houses` | Estructura organizacional                                |
| `/geography`                                    | Catálogos de departamentos y municipios (solo lectura)   |
| `/people`                                       | Personas y su historial de pertenencia                   |
| `/attendance`                                   | Planilla semanal y su bloqueo                            |
| `/meetings`                                     | Registro de la reunión: tema, predicador, ofrenda, fotos |
| `/offerings`                                    | Historial y estadísticas de ofrendas (solo lectura)      |
| `/sermon-themes`                                | Catálogo global de temas                                 |
| `/dashboard`                                    | Indicadores agregados (solo lectura)                     |
| `/reports`                                      | Consolidados y exportación a Excel (solo lectura)        |
| `/files`                                        | Subida y descarga                                        |
| `/settings`, `/audit`                           | Configuración y auditoría                                |

**Lecturas y escrituras viven separadas cuando responden a preocupaciones
distintas.** Registrar una ofrenda pertenece a la reunión que la produjo, donde
aplica el candado semanal (`PUT /meetings/:id/offering`); leerlas cruza
reuniones, casas y meses, así que tiene su propia colección (`GET /offerings`).
