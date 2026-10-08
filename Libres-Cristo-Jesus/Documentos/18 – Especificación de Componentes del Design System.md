DESIGN SYSTEM ENTERPRISE
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

Índice
1. Filosofía Visual

2. Identidad

3. Paleta de Colores

4. Tipografía

5. Espaciado

6. Grid

7. Elevaciones

8. Bordes

9. Iconografía

10. Botones

11. Inputs

12. Select

13. Cards

14. Dashboard

15. Tablas

16. Formularios

17. Modales

18. Drawer

19. Toast

20. Loading

21. Empty States

22. Error States

23. Skeleton

24. Charts

25. Animaciones

26. Responsive

27. Accesibilidad

28. Tokens
1. Filosofía del Diseño

El sistema debe transmitir exactamente estos valores:

Cercanía.
Organización.
Confianza.
Modernidad.
Claridad.
Esperanza.

El usuario nunca debe sentir que está usando un sistema complicado.

Debe sentirse como usar WhatsApp o una aplicación bancaria moderna.

2. Identidad Visual

Basándonos en el logotipo de la iglesia, la interfaz utilizará:

Color Principal

Morado institucional.

Representa:

autoridad;
liderazgo;
espiritualidad;
identidad.
Color Secundario

Dorado.

Representa:

excelencia;
crecimiento;
celebración.
Fondo

Blanco cálido.

Nunca gris oscuro.

Gris

Únicamente para:

textos secundarios;
bordes;
separadores.
3. Paleta Oficial
Primary
Primary 900

Primary 800

Primary 700

Primary 600

Primary 500

Primary 400

Primary 300

Primary 200

Primary 100

Primary 50

Todos derivados del color del logotipo.

Secondary

Dorado.

Gold 900

Gold 800

...

Gold 50
Success

Verde.

Warning

Naranja.

Error

Rojo.

Info

Azul suave.

Nunca azul intenso.

4. Tipografía

Fuente oficial

Inter

Títulos

Semibold.

Texto

Regular.

Números KPI

Bold.

Nunca mezclar más de una familia tipográfica.

Escala Tipográfica
Display

48

H1

36

H2

30

H3

24

H4

20

Body

16

Small

14

Caption

12
5. Espaciado

Sistema basado en 8 px.

4

8

12

16

24

32

40

48

64

Nunca utilizar medidas arbitrarias.

6. Grid

Desktop

12 columnas.

Tablet

8 columnas.

Mobile

4 columnas.

7. Border Radius
xs

4

sm

8

md

12

lg

16

xl

24

full

999
8. Sombras

Solo cuatro niveles.

sm

md

lg

xl

Nunca sombras exageradas.

9. Iconografía

Solo

Lucide React.

Nunca mezclar librerías.

Tamaño

16

20

24

32
10. Botones

Tres variantes.

Primary

Morado.

Secondary

Blanco.

Borde morado.

Ghost

Transparente.

Estados.

Hover.

Pressed.

Disabled.

Loading.

Nunca más de tres estilos.

11. Inputs

Todos los formularios deberán compartir el mismo componente.

Contendrá.

Label.

Input.

Helper.

Error.

Ejemplo

Nombre

[________________]

Texto de ayuda

12. Select

Mismo estilo.

Input.

Nunca HTML Select.

13. Cards

Tres tipos.

MetricCard

InfoCard

ActionCard

MetricCard

Asistencia

154

▲ 8 %

14. Dashboard

Todo Dashboard utilizará.

Metric Cards.

Charts.

Timeline.

Mapa.

Actividad.

Nunca tablas primero.

15. Tabla Enterprise

Todas las tablas compartirán.

Buscador.

Filtros.

Paginación.

Columnas configurables.

Exportar.

Nunca tablas simples.

16. Formularios

Siempre.

Wizard.

Si supera:

10 campos.

Campos obligatorios.

Con *

Errores.

Debajo del campo.

17. Modal

Pequeñas acciones.

Drawer

Grandes formularios.

Nunca formularios largos en Modal.

18. Drawer

Utilizar para.

Detalle Persona.

Detalle Casa.

Detalle Distrito.

Detalle Reunión.

19. Toast

Un solo sistema.

Success

Verde.

Warning

Naranja.

Error

Rojo.

Info

Morado.

20. Loading

Nunca spinner infinito.

Siempre Skeleton.

21. Empty State

Ejemplo.

No existen asistentes.

[ Crear primer asistente ]


Siempre ilustración.

22. Error

Nunca.

500


Siempre.

No fue posible obtener la información.


Botón.

Reintentar.

23. Skeleton

Todas las pantallas.

Dashboard.

Tabla.

Formulario.

Cards.

24. Charts

Únicamente.

Bar Chart.

Line Chart.

Pie.

Area.

Radar.

Heatmap (para futuras versiones).

Todos con la misma paleta institucional.

25. Animaciones

Framer Motion.

Solo.

150 ms

250 ms

300 ms

Nunca animaciones largas.

26. Responsive
Mobile

Bottom Navigation.

FAB.

Drawer.

Tablet

Sidebar contraído.

Desktop

Sidebar fijo.

27. Accesibilidad

Todos los botones.

ARIA.

Focus Visible.

Contraste.

AA.

Teclado.

100%.

28. Tokens

Todo deberá definirse mediante Design Tokens.

Ejemplo:

--primary-500

--success-500

--radius-lg

--space-4

--shadow-md

--font-body


Nunca utilizar valores "quemados" en los componentes.

29. Componentes Base

El sistema contará con una biblioteca única de componentes reutilizables.

Componentes de Entrada
Button
IconButton
Input
PasswordInput
Textarea
Select
MultiSelect
Combobox
Checkbox
Radio
Switch
DatePicker
TimePicker
FileUpload
CurrencyInput (COP)
Componentes de Visualización
Avatar
Badge
Chip
Card
MetricCard
StatisticCard
Timeline
Accordion
Tabs
Tooltip
Popover
EmptyState
ErrorState
Skeleton
Componentes de Navegación
Sidebar
BottomNavigation
Breadcrumb
PageHeader
SearchCommand (Ctrl + K)
Pagination
FiltersBar
Componentes de Datos
DataTable
ChartCard
KPIGrid
ColombiaMap
OrganizationalTree
ActivityFeed
30. Patrones de Pantalla

Todas las páginas seguirán la misma estructura:

┌──────────────────────────────┐
│ Header                       │
├──────────────────────────────┤
│ Breadcrumb                   │
├──────────────────────────────┤
│ Título + Acciones            │
├──────────────────────────────┤
│ Filtros (si aplica)          │
├──────────────────────────────┤
│ KPIs (si aplica)             │
├──────────────────────────────┤
│ Contenido principal          │
├──────────────────────────────┤
│ Paginación / Resumen         │
└──────────────────────────────┘

Esto crea una experiencia consistente en toda la aplicación.

31. Sistema de Colores por Rol

Para facilitar la identificación visual sin romper la identidad institucional:

Rol	Color de acento
Administrador	Morado oscuro
Pastores Generales	Dorado
Pastores de Distrito	Morado medio
Líder Casa de Paz	Morado claro

Los dashboards mantendrán la misma estructura, cambiando únicamente pequeños acentos visuales.

32. Microinteracciones

El sistema incluirá pequeñas animaciones para mejorar la experiencia:

Al guardar un registro → confirmación con animación suave.
Al completar una reunión → celebración discreta con check animado.
Al marcar asistencia → transición inmediata del checkbox.
Al cargar reportes → skeleton progresivo.
Al pasar el cursor sobre tarjetas → elevación sutil.

Estas animaciones deben reforzar la experiencia, nunca distraer.

33. Sistema de Ilustraciones

Las ilustraciones seguirán una línea moderna y minimalista.

Se utilizarán para:

Sin datos.
Error.
Sin conexión.
Acceso denegado.
Bienvenida.
Finalización de procesos.

Evitar ilustraciones infantiles o excesivamente decorativas.

34. Dark Mode (Preparado)

Aunque la versión 1.0 utilizará tema claro, todos los componentes deberán construirse utilizando Design Tokens para permitir incorporar un modo oscuro en futuras versiones sin reescribir la interfaz.

35. Guía para la IA

La IA deberá generar cualquier pantalla respetando siempre este Design System.

Nunca deberá:

Crear un botón diferente.
Cambiar espaciados.
Inventar colores.
Usar componentes HTML cuando exista uno reutilizable.
Romper la consistencia visual.

Antes de crear una nueva pantalla deberá preguntarse:

¿Puedo construir esta interfaz reutilizando los componentes existentes?

Si la respuesta es sí, deberá reutilizarlos.