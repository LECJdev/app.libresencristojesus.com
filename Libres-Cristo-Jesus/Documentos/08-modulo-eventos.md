1. Filosofía de Diseño

La plataforma debe transmitir:

Cercanía.
Organización.
Confianza.
Claridad.
Esperanza.
Modernidad.
Excelencia.

No debe sentirse como un sistema administrativo tradicional.

Debe sentirse como una herramienta de apoyo al ministerio.

2. Principios UX

Toda pantalla deberá cumplir estos principios:

Simplicidad

El usuario nunca debe preguntarse:

"¿Ahora qué hago?"

Cada pantalla tendrá un objetivo claro.

Rapidez

Las acciones más comunes deberán realizarse en menos de tres clics.

Ejemplos:

Registrar asistencia.

↓

Abrir reunión.

↓

Marcar personas.

↓

Guardar.

Consistencia

Todos los botones tendrán el mismo comportamiento.

Todos los formularios seguirán el mismo diseño.

Todos los iconos tendrán el mismo estilo.

Accesibilidad
Tipografía grande.
Alto contraste.
Botones amplios.
Espaciado generoso.
Compatible con modo oscuro en el futuro.
3. Identidad Visual

Basada en el logo institucional.

Color Primario

Azul Institucional.

Uso:

Header.
Sidebar.
Botones principales.
Enlaces.

Representa:

Confianza.

Seguridad.

Dirección.

Color Secundario

Azul claro.

Uso:

Tarjetas.
Fondos.
KPI.
Color Destacado

Dorado.

Uso:

Botones importantes.
Indicadores.
Metas.
Logros.
Blanco

Color predominante.

Debe ocupar aproximadamente el 70 % de la interfaz.

Gris Claro

Fondos.

Separadores.

Tablas.

Verde

Éxito.

Asistencia completa.

Metas cumplidas.

Amarillo

Advertencias.

Pendientes.

Rojo

Errores.

Alertas.

4. Tipografía

Usaremos una única familia tipográfica.

Recomiendo:

Inter

Porque:

Excelente lectura en móvil.
Moderna.
Profesional.
Muy utilizada en productos SaaS.

Jerarquía

H1

32 px

Semibold

------------

H2

24 px

Semibold

------------

Título Tarjeta

20 px

------------

Texto

16 px

------------

Ayuda

14 px
5. Espaciado

Sistema basado en múltiplos de 8.

8

16

24

32

48

64

Nunca usar márgenes arbitrarios.

6. Bordes

Todos los componentes compartirán el mismo radio.

12 px

Las tarjetas principales podrán usar:

16 px
7. Sombras

Muy suaves.

No usar efectos exagerados.

8. Iconografía

Utilizar:

Lucide Icons

Porque ya se integra perfectamente con:

React.
Next.js.
Shadcn.
9. Dashboard

Todos compartirán la misma estructura.

Header

↓

Filtros

↓

KPIs

↓

Gráficas

↓

Actividad reciente

↓

Tablas
10. KPIs

Todos los indicadores tendrán el mismo formato.

👥

324

Asistentes

+12%

vs mes anterior
11. Sidebar

Desktop

Logo

Dashboard

Organización

Casas

Personas

Reuniones

Reportes

Configuración

Perfil

Mobile

Menú inferior.

Inicio

Reunión

Personas

Reportes

Perfil

El menú lateral completo aparecerá mediante un Drawer.

12. Header

Siempre mostrará:

Foto usuario.

Nombre.

Rol.

Notificaciones.

Configuración.

13. Cards

Todas compartirán el mismo estilo.

Ejemplo.

━━━━━━━━━━━━━━

👥

234 Personas

+15%

━━━━━━━━━━━━━━
14. Tablas

Las tablas nunca ocuparán toda la pantalla.

Tendrán:

Buscador.

Filtros.

Paginación.

Exportar.

15. Formularios

Todos los formularios seguirán el mismo orden.

Datos básicos.

↓

Datos adicionales.

↓

Ubicación.

↓

Observaciones.

↓

Guardar.

Nunca formularios interminables.

16. Wizard

Los formularios largos utilizarán pasos.

Ejemplo.

Nueva Casa de Paz.

Paso 1

Información.

↓

Paso 2

Ubicación.

↓

Paso 3

Horario.

↓

Paso 4

Liderazgo.

↓

Finalizar.

17. Estados

Toda pantalla deberá contemplar:

Loading.

Vacío.

Error.

Sin permisos.

Sin resultados.

18. Dashboard Organización

No utilizar tablas.

Solo tarjetas.

Organigrama.

Timeline.

Fotografías.

19. Dashboard Nacional

Mapa SVG.

Al hacer clic.

Departamento.

↓

Municipios.

↓

Casas.

20. Dashboard Reuniones

Mostrar:

Próxima reunión.

Pendientes.

Fotografías.

Ofrenda.

Asistencia.

21. Dashboard Personas

Gráficas.

Nuevos.

Consolidación.

Historial.

22. Dashboard Reportes

Filtros.

↓

Gráficas.

↓

Tabla.

↓

Excel.

23. Componentes Base

Todos los módulos reutilizarán estos componentes.

Button

Input

Textarea

Select

MultiSelect

DatePicker

TimePicker

Switch

Checkbox

RadioGroup

Avatar

Badge

Chip

Dialog

Drawer

Toast

Tooltip

Popover

Alert

Skeleton

Pagination

Breadcrumb

Tabs

Accordion

Card

MetricCard

EmptyState

SearchBar

FiltersPanel

DataTable

FileUploader

ImageGallery

Timeline

ChartCard

MapCard
24. Animaciones

Usar:

Framer Motion.

Animaciones suaves.

No exageradas.

Ejemplo.

Fade.

Scale.

Slide.

Hover.

25. Responsive

Primero móvil.

Después Tablet.

Después Desktop.

Nunca al contrario.

26. PWA

Cuando el usuario instale la aplicación.

Debe sentirse como una App.

Sin barra navegador.

Splash Screen.

Ícono.

Actualización automática.

27. Accesibilidad

Contraste WCAG.

Navegación teclado.

Lectores pantalla.

Focus visible.

28. Feedback

Cada acción importante mostrará respuesta inmediata.

Ejemplos.

✅ Guardado correctamente.

⚠ Registro actualizado.

❌ Error.

29. Empty States

Nunca mostrar una pantalla vacía.

Ejemplo.

Todavía no tienes reuniones.

[ Crear primera reunión ]
30. Skeleton Loading

Nunca utilizar únicamente un spinner.

Siempre utilizar Skeleton.

31. Página de Inicio (Landing después del Login)

En lugar de abrir directamente el Dashboard, propongo una pantalla de bienvenida personalizada.

Ejemplo:

Buenos días, Jorge.

Hoy tienes:

🟢 Reunión programada

👥 18 asistentes registrados

📸 Falta subir fotografías

💰 Ofrenda pendiente

📊 Distrito con 95 % de cumplimiento

Esto genera una experiencia mucho más humana.

32. Pantalla de Registro de Asistencia (la más importante)

Quiero mejorar mucho esta pantalla porque será la más utilizada.

Debe parecer una aplicación de lista de asistencia.

Ejemplo:

Casa de Paz Esperanza

Jueves 7:00 PM

──────────────────────────

☐ María Gómez

☐ Juan Pérez

☐ Carlos Díaz

☑ Ana Torres

☐ Pedro López

──────────────────────────

➕

Agregar Persona

──────────────────────────

💰 Ofrenda

📸 Fotografías

📝 Tema

──────────────

Guardar Reunión

Cada fila deberá poder tocarse completa, no solo el checkbox, facilitando el uso desde el móvil.

33. Ficha de Persona (Vista 360°)

Al pulsar un asistente se abrirá una ficha completa.

Información:

Foto (opcional).
Datos personales.
Historial de asistencia.
Casa de Paz actual.
Casas anteriores.
Línea de tiempo.
Etapa espiritual.
Observaciones pastorales.
Fecha de ingreso.
Gráfica de asistencia.
Última asistencia.

Esto convierte la plataforma en una herramienta de seguimiento pastoral y no únicamente de control.

34. Centro de Actividad

En la página principal incluiría un panel tipo "Actividad reciente".

Ejemplo:

Hace 5 minutos

Distrito 9 registró su reunión.

Hace 20 minutos

3 nuevos asistentes agregados.

Hace 1 hora

Casa de Paz Esperanza alcanzó su meta mensual.

Hace que el sistema se sienta vivo.

35. Sistema de Búsqueda Global

Quiero incorporar una búsqueda inteligente similar a la de Notion o Slack.

Con un solo buscador será posible encontrar:

Personas.
Distritos.
Casas de Paz.
Liderazgos.
Reuniones.
Municipios.

Incluso podría abrirse con el atajo Ctrl + K en escritorio.

36. Modo de Alto Contraste

Aunque el modo oscuro puede esperar para una versión futura, recomiendo dejar preparado un tema de alto contraste para usuarios con dificultades visuales, manteniendo siempre la identidad institucional.

37. Microinteracciones

Las pequeñas animaciones mejoran enormemente la percepción del sistema.

Ejemplos:

Al marcar asistencia, el elemento cambia suavemente de color y aparece un icono de confirmación.
Al alcanzar una meta mensual, mostrar una pequeña animación de celebración muy discreta.
Al guardar un formulario, mostrar una confirmación visual antes de redirigir.

Estas interacciones transmiten calidad sin distraer al usuario.

38. Guía de estilos para la IA

Para garantizar que todas las pantallas mantengan la misma identidad visual, la IA deberá seguir estas reglas en todo el proyecto:

Utilizar Tailwind CSS con variables CSS para los colores institucionales.
Construir todos los componentes sobre Shadcn/UI sin modificar su accesibilidad.
Emplear Lucide React para la iconografía.
No crear estilos inline.
Reutilizar componentes antes de crear nuevos.
Mantener una separación clara entre componentes de presentación y lógica de negocio.
Priorizar tarjetas, listas y paneles frente a tablas cuando el usuario esté en dispositivos móviles.