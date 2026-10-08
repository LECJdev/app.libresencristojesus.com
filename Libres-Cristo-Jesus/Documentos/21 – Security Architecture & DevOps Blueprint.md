SECURITY ARCHITECTURE & DEVOPS BLUEPRINT
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

Índice
1. Filosofía

2. Arquitectura

3. Seguridad

4. Autenticación

5. Autorización

6. Infraestructura

7. Docker

8. CI/CD

9. Variables de Entorno

10. Logs

11. Monitoreo

12. Backups

13. Recuperación

14. Rendimiento

15. Escalabilidad

16. Checklist Producción
1. Filosofía

El sistema deberá cumplir cinco principios:

Seguridad por defecto.
Menor privilegio.
Observabilidad.
Automatización.
Recuperación rápida.

El objetivo no es solo proteger la información, sino facilitar el mantenimiento y la operación.

2. Arquitectura General
                     Internet
                         │
                  Cloudflare (Opcional)
                         │
                      HTTPS
                         │
                     NGINX Proxy
                  ┌──────┴──────┐
                  │             │
             Next.js        NestJS API
                  │             │
                  └──────┬──────┘
                         │
                      Redis
                         │
                    PostgreSQL
                         │
                    MinIO / S3
Componentes

Frontend

Next.js
React
PWA

Backend

NestJS

Base de Datos

PostgreSQL

Cache

Redis

Archivos

MinIO (desarrollo)
AWS S3 / Cloudflare R2 (producción)

Proxy

NGINX
3. Seguridad

Toda comunicación deberá usar:

HTTPS
TLS 1.3

Nunca permitir HTTP en producción.

Headers obligatorios:

HSTS
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Content-Security-Policy
Permissions-Policy
4. Autenticación

JWT Access Token

Duración:

15 minutos

Refresh Token

7 días

El Refresh Token se almacenará hasheado.

Nunca en texto plano.

5. Autorización

Se implementará RBAC (Role Based Access Control).

Roles:

Administrador
Pastores Generales
Pastores de Distrito
Líderes

Cada endpoint validará:

Usuario autenticado.
Rol permitido.
Alcance (Distrito o Casa de Paz).
6. Protección contra ataques

El backend deberá incorporar:

Rate Limiting.
Protección CSRF (si aplica según el mecanismo de autenticación).
Validación de DTO.
Sanitización de entradas.
Helmet.
CORS restringido.
Protección contra SQL Injection mediante Prisma.
Protección XSS.
7. Contraseñas

Hash:

Argon2id

Nunca almacenar contraseñas en texto plano.

Política mínima:

8 caracteres.
Mayúscula.
Minúscula.
Número.
Carácter especial.
8. Docker

Cada servicio tendrá su propio contenedor.

docker-compose.yml

Frontend

Backend

PostgreSQL

Redis

MinIO

NGINX

Nunca instalar dependencias directamente en el servidor.

9. Variables de Entorno

Nunca incluir secretos en el código.

Ejemplo:

DATABASE_URL=

JWT_SECRET=

JWT_REFRESH_SECRET=

REDIS_URL=

MINIO_ENDPOINT=

MINIO_ACCESS_KEY=

MINIO_SECRET_KEY=

SMTP_HOST=

SMTP_USER=

SMTP_PASSWORD=

Cada entorno tendrá su propio archivo:

.env.development
.env.test
.env.production
10. CI/CD

Repositorio:

GitHub.

Flujo:

main

↓

GitHub Actions

↓

Tests

↓

Build

↓

Docker Image

↓

Deploy

↓

Health Check

↓

Notificación

No desplegar código sin pruebas.

11. Estrategia Git

Ramas:

main

develop

feature/*

fix/*

release/*

Commits siguiendo Conventional Commits:

feat:
fix:
refactor:
docs:
test:
chore:
12. Logs

Todos los eventos importantes deberán registrarse.

Ejemplos:

Login.
Logout.
Error 500.
Excepciones.
Cambios de configuración.
Registro de reuniones.
Cambios de permisos.

Formato:

{
  "timestamp": "...",
  "level": "info",
  "userId": "...",
  "module": "...",
  "message": "...",
  "traceId": "..."
}
13. Monitoreo

Se recomienda:

Grafana.
Prometheus.

Métricas:

CPU.
RAM.
Tiempo de respuesta.
Errores.
Usuarios conectados.
Consultas lentas.
14. Alertas

Enviar alertas cuando ocurra:

Error crítico.
Base de datos caída.
Espacio en disco bajo.
Tiempo de respuesta elevado.
Fallo en copias de seguridad.
15. Backups

PostgreSQL

Diario.
Semanal.
Mensual.

MinIO / S3

Copia diaria de archivos.

Guardar copias en una ubicación diferente al servidor principal.

16. Recuperación ante desastres

Objetivos recomendados:

RPO (Pérdida máxima de datos):

24 horas

RTO (Tiempo máximo de recuperación):

2 horas

Documentar el procedimiento de restauración y probarlo periódicamente.

17. Rendimiento

Objetivos:

Login < 1 segundo.
Dashboard < 2 segundos.
Reportes estándar < 5 segundos.
Exportación a Excel < 30 segundos.

Optimización:

Redis.
Compresión Gzip/Brotli.
Caché para consultas repetitivas.
Lazy Loading en frontend.
Paginación obligatoria.
18. PWA

Características:

Instalable.
Icono personalizado.
Pantalla Splash.
Funcionamiento parcial sin conexión.
Actualizaciones automáticas del Service Worker.

Cuando no haya Internet:

Mostrar aviso.
Permitir consultar información almacenada en caché.
Guardar temporalmente registros pendientes para sincronizarlos al recuperar conexión (cuando se implemente el modo offline).
19. Seguridad de archivos

Archivos permitidos:

JPG
PNG
WEBP

Tamaño máximo:

5 MB

El servidor validará:

Tipo MIME.
Tamaño.
Extensión.

Nunca confiar únicamente en la validación del navegador.

20. Gestión de errores

Todas las excepciones deberán pasar por un manejador global.

Las respuestas al cliente nunca mostrarán:

Stack Trace.
SQL.
Información interna.

Registrar el detalle únicamente en los logs.

21. Configuración del servidor

Sistema Operativo recomendado:

Ubuntu Server LTS

Servidor web:

NGINX

Firewall:

UFW

Permitir únicamente:

22 (SSH, preferiblemente restringido)
80 (redirección)
443 (HTTPS)
22. Observabilidad

Cada petición recibirá un identificador único (traceId).

Ese identificador viajará por:

Frontend.
Backend.
Base de datos (cuando aplique).
Logs.

Esto facilitará la investigación de incidencias.

23. Checklist para Producción

Antes de publicar una nueva versión:

Variables de entorno configuradas.
HTTPS activo.
Migraciones ejecutadas.
Backups verificados.
Logs funcionando.
Monitoreo activo.
Health Checks correctos.
PWA compilada.
Pruebas de autenticación superadas.
Pruebas de permisos superadas.
Auditoría validada.
Optimización de imágenes realizada.
24. Roadmap DevOps
Fase 1
Docker Compose.
VPS.
PostgreSQL.
Redis.
MinIO.
NGINX.
Fase 2
GitHub Actions.
Despliegue automático.
Health Checks.
Fase 3
Prometheus.
Grafana.
Alertas.
Fase 4
Alta disponibilidad.
Balanceador de carga.
Réplica de PostgreSQL.
CDN para archivos estáticos.
25. Recomendaciones específicas para este proyecto

Después de analizar el uso esperado (muchos líderes utilizando el sistema desde teléfonos móviles), estas son mis recomendaciones:

1. Mantener la infraestructura simple al inicio

Para la versión 1.0 no es necesario usar Kubernetes ni una infraestructura compleja. Un VPS con Docker Compose, PostgreSQL, Redis, MinIO y NGINX será suficiente y más fácil de administrar.

2. Sincronización para la PWA

Aunque el modo offline completo puede dejarse para una versión posterior, diseña desde el inicio la aplicación para que sea compatible con sincronización futura. Esto evitará cambios importantes en la arquitectura.

3. Almacenamiento de imágenes

Separar completamente las fotografías de la base de datos utilizando almacenamiento de objetos. Esto mantendrá PostgreSQL ligero y mejorará el rendimiento de las copias de seguridad.

4. Monitoreo desde el primer despliegue

Aunque la carga inicial sea baja, instalar desde el comienzo Prometheus y Grafana permitirá detectar problemas antes de que afecten a los usuarios y facilitará el crecimiento de la plataforma.