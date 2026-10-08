UI COMPONENT LIBRARY & WIREFRAMES
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

OBJETIVO

Definir absolutamente todos los componentes reutilizables del sistema.

Toda pantalla deberá construirse utilizando únicamente estos componentes.

Nunca crear componentes repetidos.

FILOSOFÍA

Cada componente debe ser:

Simple
Elegante
Responsive
Accesible
Reutilizable
Tipado
Fácil de mantener
ARQUITECTURA UI
Pages

↓

Templates

↓

Layouts

↓

Sections

↓

Components

↓

UI Elements
ESTRUCTURA DEL DESIGN SYSTEM
packages/ui

components/

layout/

forms/

charts/

cards/

tables/

navigation/

feedback/

overlay/

icons/

hooks/

theme/

tokens/
SISTEMA DE GRID

Desktop

12 Columnas

Tablet

8 Columnas

Celular

4 Columnas
ESPACIADO

Utilizar una escala única:

4px

8px

12px

16px

24px

32px

48px

64px

Nunca valores aleatorios.

BORDES

Cards

16 px

Inputs

12 px

Botones

12 px

Modales

20 px
SOMBRAS

Tres niveles únicamente.

Small

Medium

Large

Nunca sombras exageradas.

BOTÓN BASE

Un único componente.

<Button />

Variantes

Primary

Secondary

Outline

Ghost

Danger

Success

Warning

Icon

Loading

Disabled

Propiedades

size

variant

loading

icon

disabled

fullWidth
INPUT
<Input />

Características

Floating Label

Iconos

Placeholder

Error

Helper Text

Readonly

Disabled

SELECT

Un único componente.

<Select />

Con:

búsqueda;
teclado;
virtualización (si la lista crece);
validación.
DATE PICKER

Utilizar un único DatePicker para todo el sistema.

Nunca librerías diferentes.

TIME PICKER

Componente reutilizable.

Formato

24 horas.

AUTOCOMPLETE

Utilizado para:

Personas.
Municipios.
Distritos.

Con búsqueda instantánea.

AVATAR

Tamaños

XS

SM

MD

LG

XL

Si no existe fotografía.

Mostrar iniciales.

BADGES

Estados

Activo

Inactivo

Pendiente

Nuevo

Miembro

Líder

Con colores del Design System.

ALERTAS

Tipos

Información

Éxito

Advertencia

Error

Todas reutilizables.

TOAST

Único sistema.

Posición

Superior derecha.

Duración

4 segundos.

MODAL

Un solo Modal.

Tamaños

SM

MD

LG

XL

Fullscreen

DRAWER

Para móviles.

Abrir desde la derecha.

TABS

Animación suave.

Iconos opcionales.

ACCORDION

Para información extensa.

CARD BASE
<Card />

Variantes

Simple

Con Header

Con Acciones

Con KPI

Con Imagen

KPI CARD

Será uno de los componentes más utilizados.

┌──────────────────────┐

Total Personas

4.523

↑ 12%

📈

└──────────────────────┘
CHART CARD

Contendrá:

Título

Filtro

Gráfica

Leyenda

Exportar

TABLA

Único componente.

<DataTable />

Características

Ordenar

Filtrar

Paginación

Columnas dinámicas

Exportar

Responsive

EMPTY STATE

Siempre que una lista esté vacía.

Mostrar:

Ilustración

Mensaje

Botón principal

SKELETON

Todas las pantallas.

Antes del Loading.

SEARCH BAR

Reutilizable.

Con búsqueda instantánea.

FILTER BAR

Componente independiente.

Utilizado en:

Reportes

Dashboard

Personas

Casas de Paz

PAGINACIÓN

Un único componente.

BREADCRUMB

Automático.

SIDEBAR

Siempre igual.

Solo cambian opciones según rol.

HEADER

Elementos

Logo

Nombre usuario

Foto

Notificaciones

Configuración

BOTTOM NAVIGATION

Solo móvil.

Botones

Inicio

Reuniones

Personas

Reportes

Perfil

ORGANIGRAMA CARD

Componente exclusivo.

Debe mostrar.

Foto

Nombre

Cargo

Distrito

Casas Paz

Botón Ver
PEACE HOUSE CARD
Nombre

Líder

Municipio

Asistencia

Próxima reunión
PERSON CARD
Foto

Nombre

Estado

Teléfono

Última asistencia
MEETING CARD
Fecha

Tema

Estado

Asistencia

Ofrenda
OFFERING CARD
Monto

Fecha

Casa Paz

Distrito
MAPA COLOMBIA

Será un componente.

<ColombiaMap />

Permitirá:

Hover

Click

Tooltip

Indicadores

Filtros

Sin Google Maps.

SVG.

ORGANIGRAMA
<OrganizationTree />

Expandible.

Responsive.

CHARTS

Utilizar únicamente Recharts.

Tipos

Bar

Line

Pie

Area

Radar

Radial

Stacked

FORMULARIOS

Todos seguirán:

Título

Descripción

Campos

Acciones

Nunca formularios diferentes.

WIZARD

Registro Reunión

Paso 1

↓

Paso 2

↓

Paso 3

↓

Paso 4

↓

Resumen

WIREFRAME LOGIN
┌─────────────────────────────┐

LOGO

Iglesia Cristiana
Libres en Cristo Jesús

Correo

______________

Contraseña

______________

[ Ingresar ]

Versión

└─────────────────────────────┘
WIREFRAME DASHBOARD
┌────────────────────────────────────────────┐

Header

────────────────────────────────────────────

KPIs

KPIs

KPIs

KPIs

──────────────

Gráfica

──────────────

Mapa Colombia

──────────────

Organigrama

──────────────

Actividad Reciente

└────────────────────────────────────────────┘
WIREFRAME PERSONAS
Buscar

──────────────

Filtros

──────────────

Tabla

──────────────

Paginación
WIREFRAME REUNIÓN
Información

↓

Tema

↓

Asistencia

↓

Ofrenda

↓

Fotografía

↓

Confirmación
WIREFRAME REPORTES
Filtros

↓

KPIs

↓

Gráficas

↓

Tabla

↓

Exportar
ANIMACIONES

Utilizar Framer Motion.

Duración máxima.

200 ms

Nunca animaciones largas.

TRANSICIONES

Fade

Slide

Scale

Solo estas tres.

ICONOGRAFÍA

Lucide React.

Tamaño.

18 px

20 px

24 px
TIPOGRAFÍA

Fuente.

Inter.

Pesos.

400

500

600

700

Nunca usar más.

COMPONENTES ESPECIALES

Se crearán exclusivamente para este proyecto:

AttendanceSelector
WeeklyMeetingWizard
DistrictRankingCard
PeaceHouseRanking
GrowthChart
AttendanceTimeline
OfferingSummary
ChurchOrganizationTree
ColombiaChurchMap
KPIGrid
MeetingStatusBadge
PALETA OFICIAL

Toda la plataforma utilizará exclusivamente la identidad visual definida previamente:

Color primario: inspirado en el logo de la iglesia.
Color secundario: apoyo para botones y enlaces.
Color de acento: resaltado de métricas y elementos activos.
Colores neutros: grises para fondos y textos secundarios.
Colores semánticos: éxito, advertencia, error e información.

Ningún desarrollador podrá introducir colores nuevos fuera del sistema de diseño.

MODO OSCURO (PREPARADO)

Aunque la primera versión utilizará únicamente modo claro, todos los componentes deberán construirse utilizando variables de tema (CSS Variables o Tailwind Theme Tokens) para que la activación del modo oscuro en una versión futura no requiera reescribir componentes.

BIBLIOTECA DE PLANTILLAS

Se crearán plantillas reutilizables para:

Dashboard.
Listados con tabla.
Listados con tarjetas.
Formularios CRUD.
Wizard de varios pasos.
Reportes.
Configuración.
Perfil de usuario.

Cada nueva pantalla deberá partir de una plantilla existente antes de crear una nueva estructura.

WIREFRAMES DE ALTA PRIORIDAD

Antes de desarrollar el sistema se deberán diseñar completamente estas pantallas:

Login.
Dashboard Administrador.
Dashboard Pastor General.
Dashboard Pastor de Distrito.
Dashboard Líder.
Organigrama General.
Mapa de Colombia.
Gestión de Distritos.
Gestión de Casas de Paz.
Gestión de Personas.
Perfil de Persona.
Registro de Reunión (Wizard).
Registro de Asistencia.
Reportes.
Configuración.

Estas pantallas servirán como base para todas las demás.