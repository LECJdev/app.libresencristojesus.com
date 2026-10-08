SEED DATA & DEMO ENVIRONMENT
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

OBJETIVO

Crear un entorno completamente funcional desde el primer día.

Después de ejecutar el proyecto por primera vez, el sistema deberá estar listo para usarse sin necesidad de ingresar datos manualmente.

El entorno de demostración deberá representar una iglesia real, permitiendo validar todas las funcionalidades del sistema.

1. DATOS MAESTROS
Iglesia
Nombre:
Iglesia Cristiana Libres en Cristo Jesús

Código:
ICLCJ

Estado:
Activo
Pastores Generales

Cuenta única:

Correo:
pastores@iglesia.com

Contraseña:
Cambiar en el primer ingreso

Nombres visibles:

Marcos y Doris

Fotografía:
assets/demo/pastores-generales.jpg
Administrador
Correo

admin@iglesia.com

Contraseña

Cambiar al iniciar

Nombre

Administrador Sistema

Foto

assets/demo/admin.jpg
2. DISTRITOS

Crear inicialmente 12 distritos.

Ejemplo:

Distrito 1

Pastores:

Carlos y Andrea

Casas de Paz

6
Distrito 2

Pastores:

David y Sandra

Casas

5

...

Distrito 12

Todos con fotografías de demostración.

3. CASAS DE PAZ

Crear entre 5 y 8 Casas de Paz por distrito.

Ejemplo:

Distrito 9

Casa de Paz El Bosque

Líderes

Jorge y Jhohana

Municipio

Bogotá

Barrio

Suba

Dirección

Carrera XX # XX

Horario

Martes

7:30 PM
4. USUARIOS

Generar automáticamente:

1 Administrador.
1 Usuario Pastores Generales.
12 Usuarios de Distrito.
72 Usuarios Líderes (aprox. 6 por distrito).

Todos con contraseñas temporales.

5. PERSONAS

Cada Casa de Paz deberá tener entre:

25 y 40 asistentes.

Total aproximado:

2.000 personas de demostración.

Cada persona incluirá:

Nombre.
Apellidos.
Teléfono.
Correo (cuando exista).
Fecha de nacimiento (opcional).
Fecha de ingreso.
Estado.
6. REUNIONES

Generar automáticamente:

12 meses de reuniones históricas.

Cada Casa de Paz tendrá:

52 reuniones.

7. ASISTENCIAS

Cada reunión deberá contener:

Entre:

15

y

35 asistentes.

Seleccionados aleatoriamente de su Casa de Paz.

Nunca de otra.

8. OFRENDAS

Generar valores realistas.

Ejemplo:

$85.000

$126.000

$210.000

$98.000

Todos en pesos colombianos.

9. TEMAS

Lista inicial:

La Fe.
El Perdón.
La Esperanza.
La Oración.
La Familia.
El Espíritu Santo.
Evangelismo.
Discipulado.
Servicio.
Amor al Prójimo.

Seleccionar aleatoriamente.

10. FOTOGRAFÍAS

Para el entorno demo utilizar imágenes de ejemplo libres de derechos o avatares generados.

En producción, estas serán reemplazadas por fotografías reales cargadas por los usuarios.

11. MUNICIPIOS

Cargar automáticamente:

Todos los departamentos y municipios oficiales de Colombia.

Utilizar una fuente oficial (por ejemplo, DANE o DIVIPOLA).

Esto permitirá:

Registrar Casas de Paz por municipio.
Alimentar el mapa SVG de Colombia.
Filtrar reportes por ubicación.
12. DASHBOARD DEMO

Al iniciar el sistema, los dashboards deberán mostrar información coherente.

Ejemplo:

Asistencia promedio

1.842

Personas registradas

2.156

Casas de Paz

72

Distritos

12

Ofrenda mensual

$18.450.000
13. DATOS HISTÓRICOS

Generar tendencias para que las gráficas tengan sentido.

Ejemplo:

Crecimiento progresivo de asistentes.
Variaciones normales de asistencia.
Ofrendas fluctuantes.

Evitar datos completamente aleatorios que no reflejen una realidad.

14. SCRIPT DE SEED

Crear un único comando:

pnpm db:seed

Que cargue toda la información de demostración.

El script deberá ser idempotente cuando sea posible o permitir reinicializar la base de datos fácilmente en desarrollo.

15. ENTORNOS

Configurar:

Desarrollo.
Pruebas.
Producción.

Cada uno con sus propias variables de entorno.

Nunca reutilizar datos de producción en desarrollo.

16. DATOS DE PRUEBA

Crear cuentas para cada rol:

Rol	Correo
Administrador	admin@iglesia.com
Pastores Generales	pastores@iglesia.com
Pastor Distrito 1	distrito1@iglesia.com
Líder Casa de Paz	lider1@iglesia.com

Las contraseñas iniciales deberán forzar cambio al primer ingreso.

17. CARGA DE ARCHIVOS

Crear carpeta de ejemplo:

storage/

avatars/

meeting-photos/

documents/

demo/
18. AUDITORÍA DEMO

Generar registros simulados para:

Inicios de sesión.
Registro de reuniones.
Cambios de personas.
Registro de ofrendas.

Esto permitirá validar el módulo de auditoría desde el primer momento.

19. EXPORTACIONES

El entorno demo deberá permitir generar:

Reportes en Excel.
Reportes PDF (cuando se implemente).
Dashboards completos.
20. VALIDACIÓN DEL ENTORNO

Antes de considerar listo el entorno demo, verificar:

Todos los usuarios pueden iniciar sesión.
Todos los dashboards muestran información.
Las gráficas contienen datos.
El organigrama está completo.
El mapa de Colombia refleja las Casas de Paz registradas.
Las reuniones históricas son consistentes.
Las asistencias coinciden con los asistentes registrados.
CHECKLIST DE ENTREGA

Antes de comenzar el desarrollo funcional, confirmar:

Arquitectura creada.
Proyecto compila.
Base de datos migrada.
Seed ejecutado.
Usuarios creados.
Roles configurados.
Design System implementado.
Autenticación operativa.
PWA configurada.
Documentación disponible.