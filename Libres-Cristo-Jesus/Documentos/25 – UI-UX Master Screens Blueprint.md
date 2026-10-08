UI/UX MASTER SCREENS BLUEPRINT
Plataforma Gestión Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión 1.0

1. FILOSOFÍA DE DISEÑO

La plataforma debe transmitir cuatro sensaciones:

Simplicidad.
Cercanía.
Organización.
Confianza.

No debe parecer un ERP financiero ni un software complejo.

Debe sentirse como una herramienta creada para servir a la iglesia.

2. PRINCIPIOS DE UX

Toda pantalla deberá cumplir estas reglas:

Máximo 3 clics para llegar a cualquier función frecuente.
Información importante visible sin hacer scroll (cuando sea posible).
Botones grandes y fáciles de presionar desde dispositivos móviles.
Texto claro y lenguaje sencillo.
Iconografía consistente.
Estados vacíos con mensajes útiles.
Confirmaciones antes de acciones críticas.
3. ESTRUCTURA GENERAL
┌──────────────────────────────────────────┐
│ Header                                   │
├──────────────┬───────────────────────────┤
│ Sidebar      │ Contenido                 │
│              │                           │
│              │                           │
│              │                           │
└──────────────┴───────────────────────────┘

En móviles:

┌────────────────────────────┐
│ Header                     │
├────────────────────────────┤
│ Contenido                  │
│                            │
│                            │
├────────────────────────────┤
│ Bottom Navigation          │
└────────────────────────────┘
4. PANTALLA DE LOGIN

Objetivo:

Ingreso rápido al sistema.

Elementos:

Logo de la iglesia.
Nombre del sistema.
Correo.
Contraseña.
Recordar sesión.
Botón Ingresar.
Indicador de versión.

Diseño:

Fondo blanco con detalles en los colores institucionales definidos anteriormente.

5. DASHBOARD PRINCIPAL

Cada usuario verá un Dashboard diferente según su rol.

Todos compartirán la misma estructura visual.

KPIs

Gráficas

Filtros

Actividad reciente

Accesos rápidos
6. DASHBOARD DEL ADMINISTRADOR

Componentes:

Total de Distritos.
Total Casas de Paz.
Total Personas.
Asistencia del mes.
Ofrendas del mes.
Nuevos asistentes.
Mapa de Colombia.
Organigrama.
Ranking de Distritos.
Últimas reuniones.
Alertas del sistema.
7. DASHBOARD PASTORES GENERALES

Visualizarán:

KPIs generales.
Distritos.
Casas de Paz.
Asistencia mensual.
Crecimiento.
Ofrendas.
Mapa Colombia.
Organigrama.

No verán herramientas técnicas.

8. DASHBOARD PASTOR DE DISTRITO

Verá únicamente:

Casas de Paz de su Distrito.
Indicadores del Distrito.
Reuniones pendientes.
Ofrendas del Distrito.
Ranking de Casas de Paz.
Organigrama de su Distrito.
9. DASHBOARD LÍDER

Será el más simple.

Mostrará:

Próxima reunión.
Personas registradas.
Asistencia de la semana.
Ofrenda registrada.
Botón "Registrar Reunión".
Botón "Registrar Persona".
Historial reciente.

Todo pensado para operar desde un teléfono.

10. ORGANIGRAMA DE LA IGLESIA

Esta será una pantalla exclusiva.

Todos los usuarios podrán verla.

Estructura:

Pastores Generales
      │
───────────────
Distritos
      │
───────────────
Casas de Paz

Cada tarjeta mostrará:

Fotografía de la pareja.
Nombre completo.
Cargo.
Distrito.
Cantidad de Casas de Paz (cuando aplique).

La información visible dependerá del rol para las métricas, pero el organigrama será público dentro de la aplicación.

11. MAPA DE COLOMBIA

Pantalla dedicada.

Mapa SVG interactivo.

Cada departamento mostrará:

Número de Distritos.
Número de Casas de Paz.
Número de asistentes.

Al seleccionar un departamento:

Municipios con Casas de Paz.
Cantidad de reuniones.
Indicadores principales.

Sin utilizar Google Maps.

12. GESTIÓN DE DISTRITOS

Pantalla con:

Tabla.
Tarjetas (modo móvil).
Buscador.
Filtros.
Estado.
Pastor responsable.
Cantidad de Casas de Paz.
13. GESTIÓN DE CASAS DE PAZ

Vista tipo tarjetas.

Cada tarjeta mostrará:

Nombre.
Líder.
Dirección.
Municipio.
Próxima reunión.
Cantidad de personas.
Estado.
14. GESTIÓN DE PERSONAS

Diseño orientado a búsqueda rápida.

Barra superior:

Buscar.
Filtrar.
Exportar.

Tabla:

Foto.
Nombre.
Teléfono.
Estado.
Última asistencia.
Casa de Paz.

Acciones rápidas:

Ver perfil.
Editar.
Trasladar.
15. PERFIL DE PERSONA

Pantalla completa.

Secciones:

Fotografía.
Datos personales.
Historial de asistencia.
Línea de tiempo.
Observaciones.
Historial de traslados.
16. REGISTRO DE REUNIÓN

Formulario dividido por pasos:

Paso 1

Información general:

Fecha.
Hora.
Tema.
Observaciones.
Paso 2

Asistencia.

Lista con búsqueda y selección rápida mediante casillas de verificación.

Paso 3

Ofrenda.

Monto.

Notas.

Paso 4

Fotografía.

Subida de imágenes.

Paso 5

Resumen y confirmación.

17. PANTALLA DE ASISTENCIA

Diseño optimizado para móvil.

Cada asistente se mostrará como una tarjeta:

Foto (si existe).
Nombre.
Casilla de asistencia.
Estado.

Con búsqueda instantánea.

18. REPORTES

Filtros superiores:

Fecha.
Distrito.
Casa de Paz.
Municipio.
Estado.

Resultados:

KPIs.
Gráficas.
Tabla detallada.

Botones:

Excel.
PDF (versión futura).
19. CONFIGURACIÓN

Secciones:

Mi perfil.
Cambiar contraseña.
Preferencias.
Apariencia (preparado para futuro modo oscuro).
Información del sistema.
20. NOTIFICACIONES

Centro de notificaciones.

Tipos:

Nueva reunión programada.
Recordatorio de reunión.
Error en sincronización.
Actualizaciones del sistema.
21. COMPONENTES BASE

La plataforma utilizará un catálogo único de componentes reutilizables:

Botón.
Tarjeta.
Modal.
Tabla.
DataTable.
Input.
Select.
DatePicker.
TimePicker.
Breadcrumb.
EmptyState.
Loading.
Skeleton.
Avatar.
Badge.
KPI Card.
Chart Card.
Organigrama Card.
PeaceHouse Card.
Person Card.
Meeting Card.
22. NAVEGACIÓN

Menú lateral:

Dashboard.
Organigrama.
Distritos.
Casas de Paz.
Personas.
Reuniones.
Reportes.
Configuración.

El contenido visible dependerá del rol.

23. EXPERIENCIA MÓVIL

Como muchos líderes utilizarán el sistema desde el celular:

Botones mínimos de 44 px de alto.
Navegación inferior para acciones frecuentes.
Formularios de un solo campo por fila.
Uso intensivo de tarjetas en lugar de tablas.
Confirmaciones sencillas y visibles.
24. ESTADOS VISUALES

Cada pantalla deberá contemplar:

Cargando.
Sin datos.
Error.
Sin permisos.
Operación exitosa.
Sin conexión (PWA).
25. MICROINTERACCIONES

Añadir animaciones discretas:

Aparición de tarjetas.
Confirmación al guardar.
Indicadores de carga.
Expansión de paneles.
Transiciones suaves entre pantallas.

Evitar animaciones excesivas.

26. ACCESIBILIDAD

Todas las pantallas deberán cumplir:

Contraste adecuado.
Navegación por teclado.
Etiquetas ARIA.
Compatibilidad con lectores de pantalla.
Mensajes claros para errores de formulario.
27. SISTEMA DE ICONOS

Se utilizará una única librería (por ejemplo, Lucide React).

Cada módulo tendrá un icono representativo:

Dashboard.
Organigrama.
Distrito.
Casa de Paz.
Personas.
Reuniones.
Asistencia.
Ofrendas.
Reportes.
Configuración.

No mezclar varias librerías de iconos.

28. WIREFRAMES MAESTROS

Cada pantalla deberá tener un wireframe base antes de implementarse.

Esto permitirá que la IA genere componentes coherentes y evitará cambios constantes de estructura.

29. FLUJO DE NAVEGACIÓN

El recorrido principal para un líder será:

Login
   ↓
Dashboard
   ↓
Registrar Reunión
   ↓
Marcar Asistencia
   ↓
Registrar Ofrenda
   ↓
Subir Fotografía
   ↓
Cerrar Reunión
   ↓
Consultar Indicadores

El sistema debe minimizar la cantidad de pasos y mantener siempre visible el progreso.