# Runbook de despliegue — LCJ Connect

Procedimiento para instalar, operar y recuperar la plataforma. Escrito para
ejecutarse **de arriba abajo**; cada paso dice qué esperar y cómo verificar que
salió bien.

> **Alcance:** despliegue con Docker Compose para las dependencias
> (PostgreSQL, Redis, MinIO, Mailpit) y los dos procesos de la aplicación
> (API NestJS y web Next.js). No cubre orquestación en Kubernetes ni CDN.

---

## 1. Requisitos

| Componente       | Versión           | Nota                                         |
| ---------------- | ----------------- | -------------------------------------------- |
| Node.js          | 22 LTS o superior | El repo se desarrolla en 24                  |
| pnpm             | 11 o superior     | Obligatorio: el repo es un workspace de pnpm |
| Docker + Compose | reciente          | Solo para las dependencias                   |
| PostgreSQL       | 17                | Provisto por Compose                         |
| Redis            | 7                 | Provisto por Compose                         |

---

## 2. Variables de entorno

**Hay dos archivos, y confundirlos es el error más común de esta instalación.**

### 2.1 `.env` en la RAÍZ del monorepo — lo consume la API

| Variable                                  | Obligatoria                  | Descripción                                                                                                |
| ----------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                | no (`development`)           | `production` en despliegue real. Activa el guardián del seeder                                             |
| `API_PORT`                                | no (`3001`)                  | Puerto de la API                                                                                           |
| `DATABASE_URL`                            | **sí**                       | Cadena de conexión de PostgreSQL                                                                           |
| `REDIS_URL`                               | **sí**                       | Cadena de conexión de Redis                                                                                |
| `JWT_SECRET`                              | **sí**                       | Mínimo 32 caracteres                                                                                       |
| `JWT_REFRESH_SECRET`                      | **sí**                       | Mínimo 32 caracteres, **distinto** del anterior                                                            |
| `MINIO_ENDPOINT`                          | **sí**                       | Host del almacenamiento de archivos                                                                        |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | **sí**                       | Credenciales del almacenamiento                                                                            |
| `SMTP_HOST`                               | **sí**                       | Servidor de correo                                                                                         |
| `SMTP_USER` / `SMTP_PASSWORD`             | no                           | Según el proveedor                                                                                         |
| `FRONTEND_URL`                            | no (`http://localhost:3000`) | Origen permitido por CORS. **Debe apuntar al dominio real** o el navegador rechazará la cookie de refresco |
| `COLOMBIA_API_URL`                        | no                           | Fuente del catálogo geográfico. Solo se usa en la instalación                                              |
| `SEED_ADMIN_PASSWORD`                     | **sí en producción**         | Ver §4.3                                                                                                   |

La API **no arranca** si falta una obligatoria: valida su entorno con Zod al
inicio y aborta nombrando la variable. Es deliberado — un servicio que arranca
a medias es peor que uno que no arranca.

### 2.2 `apps/web/.env.local` — lo consume el frontend

| Variable              | Obligatoria | Descripción                             |
| --------------------- | ----------- | --------------------------------------- |
| `NEXT_PUBLIC_API_URL` | **sí**      | URL absoluta de la API, sin barra final |

**Next solo lee archivos `.env` de su propia carpeta.** Ponerla en el `.env` de
la raíz no funciona: la aplicación pide `/undefined/auth/login` y el ingreso
falla con un mensaje que parece de credenciales. Desde la Fase 10 la pantalla
de login lo advierte explícitamente, pero la corrección es definir la variable.

Además, `NEXT_PUBLIC_*` **se incrusta en el bundle durante `pnpm build`**. Si
cambia, hay que reconstruir; no basta con reiniciar el proceso.

---

## 3. Instalación

```bash
pnpm install
docker compose up -d          # PostgreSQL, Redis, MinIO, Mailpit
```

Espere a que los contenedores estén sanos antes de seguir:

```bash
docker inspect -f '{{.State.Health.Status}}' lcj-postgres lcj-redis
```

Ambos deben decir `healthy`.

---

## 4. Puesta en marcha de la base de datos

Los cuatro pasos van **en este orden**.

### 4.1 Migraciones

```bash
pnpm db:migrate:deploy        # producción: aplica, nunca genera
```

En desarrollo se usa `pnpm db:migrate`, que además genera migraciones nuevas.
**Nunca use `migrate dev` contra producción.**

### 4.2 Catálogo geográfico

```bash
pnpm db:seed:geo
```

Descarga departamentos y municipios de Colombia **una sola vez**. Es seguro
re-ejecutarlo: no escribe si los catálogos ya tienen filas.

Si la fuente externa desapareciera, el sistema sigue funcionando — los
catálogos ya están en base. Reemplazarla es escribir un adaptador del puerto
`GeographySource` y cambiar una línea en `geography.module.ts`.

### 4.3 Datos base y administrador

```bash
SEED_ADMIN_PASSWORD=<un-secreto-real> pnpm db:seed
```

Siembra roles, permisos, etapas del proceso pastoral, la iglesia y el
administrador inicial (usuario `admin`).

> **Con `NODE_ENV=production` el seeder ABORTA si no define
> `SEED_ADMIN_PASSWORD`.** La contraseña por defecto está publicada en este
> repositorio; cualquiera podría entrar como administrador.

Re-ejecutarlo es seguro y **no reinicia la contraseña** de un administrador que
ya existe.

### 4.4 Coordenadas del mapa (opcional, recomendado)

```bash
pnpm db:geocode:geo
```

Ubica departamentos y municipios para el mapa nacional. **Tarda alrededor de
media hora** porque el proveedor (Nominatim/OSM) permite una consulta por
segundo y bloquea a quien lo excede. Es interrumpible y reanudable: solo
procesa filas sin coordenadas.

Sin este paso la aplicación funciona con normalidad; el mapa muestra un aviso
con cuántas Casas de Paz no puede ubicar.

---

## 5. Arranque

```bash
pnpm build                    # packages, API y web
pnpm --filter @lcj/api start:prod
pnpm --filter @lcj/web start
```

### Verificación posterior al despliegue

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://<api>/auth/login   # 400/401 esperado
curl -s -o /dev/null -w "%{http_code}\n" http://<web>/login        # 200
```

Después, **entre por el navegador** e inicie sesión. Un `200` en `/login`
prueba que el servidor responde, no que la aplicación pueda hablar con la API:
esa es exactamente la falla que produce una `NEXT_PUBLIC_API_URL` mal puesta.

---

## 6. Respaldos

### 6.1 Qué respaldar

| Qué                                       | Dónde                   | Frecuencia mínima |
| ----------------------------------------- | ----------------------- | ----------------- |
| Base de datos PostgreSQL                  | volumen `postgres_data` | **Diaria**        |
| Archivos subidos (MinIO)                  | volumen de MinIO        | Diaria            |
| `.env` de la raíz y `apps/web/.env.local` | fuera del repositorio   | En cada cambio    |

Redis **no** se respalda: solo guarda estado de sesión reconstruible.

### 6.2 Respaldo de la base

```bash
docker exec lcj-postgres pg_dump -U <usuario> -Fc lcj_connect \
  > backup-$(date +%F).dump
```

El formato `-Fc` (custom) es el que permite restauración selectiva y
paralelizada. Un `.sql` plano solo se puede restaurar entero.

### 6.3 Restauración

```bash
docker exec -i lcj-postgres pg_restore -U <usuario> -d lcj_connect --clean \
  < backup-2026-07-29.dump
```

> **`--clean` elimina los objetos existentes antes de recrearlos.** Restaure
> siempre sobre una base vacía o confirmada como descartable.

### 6.4 Verificación del respaldo

**Un respaldo que nunca se restauró no es un respaldo.** Al menos una vez por
trimestre, restaure el dump más reciente sobre una base desechable y compruebe
que la aplicación arranca contra ella y que se puede iniciar sesión.

---

## 7. Rollback

1. **Detenga** los procesos de aplicación (la base sigue arriba).
2. **Restaure** el dump previo al despliegue (§6.3).
3. **Vuelva** al commit anterior y reconstruya:
   ```bash
   git checkout <tag-anterior>
   pnpm install && pnpm build
   ```
4. **Arranque** y verifique según §5.

> **Las migraciones no se revierten automáticamente.** Prisma no genera
> migraciones inversas. Volver atrás en el esquema significa restaurar el dump
> — por eso el respaldo previo al despliegue no es opcional.

---

## 8. Operación diaria

| Tarea                                | Comando                           |
| ------------------------------------ | --------------------------------- |
| Logs de las dependencias             | `docker compose logs -f`          |
| Estado de migraciones                | `pnpm exec prisma migrate status` |
| Reintentar geocodificación pendiente | `pnpm db:geocode:geo`             |
| Inspeccionar la base                 | `pnpm db:studio`                  |

Los logs de la API son **JSON estructurado** (Pino). Cada petición lleva un
`traceId` que también aparece en los errores, así que el reporte de un usuario
se puede rastrear si incluye ese identificador.

---

## 9. Lista de verificación previa a producción

- [ ] `NODE_ENV=production` en el entorno de la API
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` aleatorios, distintos entre sí, ≥32 caracteres
- [ ] `SEED_ADMIN_PASSWORD` definida, y la contraseña cambiada tras el primer ingreso
- [ ] `FRONTEND_URL` apuntando al dominio real (si no, CORS rechaza la cookie de refresco)
- [ ] `NEXT_PUBLIC_API_URL` en `apps/web/.env.local` **antes** de `pnpm build`
- [ ] Respaldo automático diario configurado **y una restauración probada**
- [ ] `pnpm exec prisma migrate status` dice "up to date"
- [ ] Ingreso verificado desde un navegador real, no solo con `curl`
