UX/UI Blueprint + Wireframes
Plataforma Gestión Casas de Paz

Versión 1.0

Índice
1. Filosofía UX

2. Flujo General

3. Mapa de Navegación

4. Wireframe Login

5. Dashboard General

6. Dashboard Distrito

7. Dashboard Casa de Paz

8. Organigrama

9. Mapa Colombia

10. Personas

11. Registro de Reunión

12. Reportes

13. Administración

14. Perfil

15. Configuración

16. Responsive

17. Componentes
1. Filosofía UX

Toda la plataforma seguirá cinco principios:

1

Mobile First

2

Máximo tres clics para cualquier operación frecuente.

3

El usuario nunca debe sentirse perdido.

Siempre deberá saber:

dónde está;
qué puede hacer;
cómo regresar.
4

Los botones principales estarán siempre visibles.

5

Las acciones críticas pedirán confirmación.

2. Flujo General
LOGIN

↓

Dashboard

↓

Seleccionar módulo

↓

Realizar acción

↓

Guardar

↓

Dashboard actualizado
3. Mapa de Navegación
LOGIN

│

├── Dashboard

│

├── Organización

│      ├── Distritos

│      ├── Casas de Paz

│      ├── Organigrama

│      └── Mapa Colombia

│

├── Personas

│

├── Reuniones

│

├── Reportes

│

├── Administración

│

└── Perfil
4. Pantalla Login
Objetivo

Autenticar usuario.

Wireframe
+-----------------------------------+

          LOGO

 Libres en Cristo Jesús

-------------------------------------

 Usuario

[_______________________]

 Contraseña

[_______________________]

☐ Recordarme

[ INGRESAR ]

-------------------------

¿Olvidó su contraseña?

Versión 1.0

+-----------------------------------+
Componentes

Logo

Input

Password

Button

Checkbox

Footer

Responsive

Móvil

100%

Tablet

80%

PC

400 px ancho

5. Dashboard General

Lo verá:

Administrador

Pastores Generales

Wireframe
--------------------------------------------------

LOGO

MENU

USUARIO

--------------------------------------------------

KPI

Asistencia

KPI

Distritos

KPI

Casas

KPI

Ofrendas

--------------------------------------------------

Gráfica Asistencia

--------------------------------------------------

Mapa Colombia

--------------------------------------------------

Últimas reuniones

--------------------------------------------------

Actividad reciente

--------------------------------------------------
Componentes

MetricCard

ChartCard

MapCard

ActivityCard

QuickActions

Navegación
Dashboard

↓

Gráfica

↓

Detalle

↓

Reunión
6. Dashboard Distrito

Muy similar.

Pero únicamente:

Su distrito.

KPIs

Casas

Asistencia

Ofrendas

Nuevos asistentes

7. Dashboard Casa de Paz

Este será el que más utilizará el líder.

Debe ser extremadamente sencillo.

Wireframe
------------------------------------

Mi Casa de Paz

------------------------------------

Reunión de esta semana

Tema

Lugar

Hora

------------------------------------

Asistencia

[ Registrar ]

------------------------------------

Ofrenda

[ Registrar ]

------------------------------------

Fotografía

[ Subir ]

------------------------------------

Historial

------------------------------------

El líder no debe navegar por muchos menús.

Todo debe estar en una sola pantalla.

8. Organigrama

Esta será una de las pantallas más bonitas del sistema.

Wireframe
Pastores Generales

📷

Marcos y Doris

│

├───────────────┐

│               │

Distrito 1     Distrito 2

📷             📷

Pastores      Pastores

│             │

Casa Paz      Casa Paz

📷            📷

Líderes       Líderes

Cada tarjeta mostrará:

Foto

Nombre

Cargo

Distrito

Municipio

Botón

Ver detalle

Al pulsar una tarjeta.

Se abrirá.

Drawer.

Con información.

9. Mapa Colombia

Este mapa utilizará SVG.

No Google Maps.

Wireframe
------------------------------

Mapa Colombia

------------------------------

[ Colombia SVG ]

🟣 Antioquia (8)

🟣 Bogotá (12)

🟣 Valle (5)

🟣 Santander (4)

------------------------------

Panel lateral

Casas encontradas

------------------------------

Al hacer clic en un departamento.

Mostrar:

Municipios.

Al hacer clic en municipio.

Mostrar:

Casas.

Al hacer clic en casa.

Mostrar:

Información.

10. Personas
Wireframe
--------------------------------------

Buscar

[_______________]

--------------------------------------

Lista Personas

○ María

○ Juan

○ Carlos

--------------------------------------

+ Nueva Persona

Detalle

Foto

Nombre

Celular

Correo

Municipio

Casa Paz

Historial

Editar
11. Registro de Reunión

Esta será la pantalla más importante.

Wireframe
----------------------------------

Reunión Semana

----------------------------------

Tema

[_______________]

----------------------------------

Asistencia

☐ María

☐ Juan

☐ Pedro

☐ Andrés

----------------------------------

+ Nuevo asistente

----------------------------------

Ofrenda

$___________

----------------------------------

Foto

[Subir]

----------------------------------

Observaciones

________________

----------------------------------

Guardar

----------------------------------

Todo en una sola pantalla.

Sin cambiar de vista.

12. Reportes

Filtros arriba.

Resultados abajo.

Nunca al contrario.

Wireframe
----------------------------------

Fecha

Distrito

Casa Paz

Municipio

[Buscar]

----------------------------------

Gráfica

----------------------------------

Tabla

----------------------------------

Excel
13. Administración

Tarjetas.

No listas.

Usuarios

Roles

Permisos

Auditoría

Configuración
14. Perfil
Foto

Nombre

Rol

Distrito

Casa Paz

Cambiar contraseña

Cerrar sesión
15. Configuración

Solo administrador.

16. Responsive
Mobile

390 px

Menú

Drawer

Dashboard

1 columna

KPIs

Vertical

Tabla

Scroll horizontal

Tablet

768 px

2 columnas

Desktop

1440 px

4 columnas

17. Estados UX

Toda pantalla tendrá:

Loading

Skeleton.

Vacío

Ilustración.

Texto.

Botón.

Error

Mensaje.

Botón Reintentar.

Sin permisos

Pantalla amigable.

Sin datos

Invitar a crear el primer registro.

18. Flujo completo de una reunión
Login

↓

Dashboard

↓

Mi Casa de Paz

↓

Reunión semanal

↓

Tema

↓

Marcar asistentes

↓

Registrar nuevos asistentes

↓

Registrar ofrenda

↓

Subir fotografía

↓

Guardar

↓

Dashboard actualizado
19. Mejoras que propongo al diseño (muy importantes)

Después de leer todo el proyecto encontré varias oportunidades de mejora que harán que el sistema sea mucho más moderno y agradable de usar.

🟣 1. Dashboard tipo Microsoft Power BI

En lugar de un dashboard tradicional, propongo uno estilo Power BI + Notion, con tarjetas limpias, mucho espacio en blanco, gráficos elegantes y navegación intuitiva.

🟣 2. Command Palette (como Visual Studio Code)

Presionando Ctrl + K (o un botón de búsqueda en móvil), el usuario podrá escribir:

Persona.
Distrito.
Casa de Paz.
Reunión.
Reporte.

Y navegar inmediatamente al resultado sin recorrer menús.

🟣 3. Acciones rápidas flotantes

Para los líderes, incluir un botón flotante (FAB) con accesos directos a:

Registrar reunión.
Agregar asistente.
Ver historial.
Consultar reportes.

Esto reduce significativamente el tiempo de uso desde el celular.

🟣 4. Timeline de la Casa de Paz

En el Dashboard de cada Casa de Paz, mostrar una línea de tiempo con las reuniones anteriores:

Tema.
Número de asistentes.
Ofrenda.
Fotografía.

Esto facilita el seguimiento pastoral de un vistazo.

🟣 5. Centro de alertas

Un panel que muestre:

Reuniones pendientes de registrar.
Casas de Paz sin actividad.
Disminución de asistencia.
Nuevos asistentes sin seguimiento.

No solo será un sistema de registro, sino una herramienta de gestión.