1. Objetivo

El módulo Organización será el núcleo estructural del sistema.

Su propósito es representar fielmente la estructura jerárquica de la iglesia, permitiendo conocer en cualquier momento:

Quiénes son los Pastores Generales.
Cuántos Distritos existen.
Quién administra cada Distrito.
Qué Casas de Paz pertenecen a cada Distrito.
Quién lidera cada Casa de Paz.
Cómo está distribuida la iglesia en Colombia.

Este módulo es principalmente de consulta, aunque los usuarios autorizados podrán administrar su contenido.

2. Jerarquía Oficial

La estructura organizacional será inmutable y seguirá siempre el mismo orden.

LIBRES EN CRISTO JESÚS
│
├── Pastores Generales
│      │
│      ├── Distrito 1
│      │      ├── Casa de Paz 1
│      │      ├── Casa de Paz 2
│      │      └── Casa de Paz 3
│      │
│      ├── Distrito 2
│      │      ├── Casa de Paz 1
│      │      ├── Casa de Paz 2
│      │      └── Casa de Paz 3
│      │
│      └── Distrito N
│
└── Cobertura Nacional

Esta jerarquía será utilizada por:

Dashboard Organizacional.
Dashboard Nacional.
Reportes.
Permisos.
Navegación.
3. Concepto de Unidad de Liderazgo

Este será uno de los conceptos más importantes de toda la plataforma.

El sistema nunca administrará una persona como líder.

Administrará una Unidad de Liderazgo.

Ejemplo

Unidad de Liderazgo

────────────────────

👨 Jorge Ramírez

👩 Johanna Ramírez

──────────────

Usuario:

distrito09

Rol:

Pastor Distrito

Esto permitirá que ambos compartan una única cuenta sin perder la información individual de cada integrante.

4. Organigrama

Todos los usuarios autenticados podrán consultar el organigrama.

No dependerá del rol.

Solo cambiarán las opciones de administración.

El organigrama mostrará tarjetas similares a LinkedIn.

Ejemplo.

📷 Foto

Distrito 09

Pastores

Jorge Ramírez

Johanna Ramírez

Casas de Paz

18

Asistencia promedio

340
5. Dashboard Organizacional

Este Dashboard será completamente independiente del Dashboard de métricas.

Su objetivo no es mostrar estadísticas.

Su objetivo es mostrar la estructura.

El flujo será:

Iglesia

↓

Pastores Generales

↓

Distritos

↓

Casas de Paz

↓

Liderazgo
6. Vista Principal

La pantalla principal tendrá cuatro tarjetas resumen.

Distritos

Casas de Paz

Liderazgos

Cobertura Nacional

Debajo aparecerá el organigrama.

7. Árbol Jerárquico

El árbol será expandible.

Ejemplo.

▶ Iglesia

      ▼

Pastores Generales

      ▼

Distrito 9

      ▼

Casa de Paz Esperanza

      ▼

Líderes

Cada nodo podrá expandirse y contraerse.

8. Tarjetas

Cada tarjeta tendrá.

Fotografía.

Nombre.

Cargo.

Distrito.

Municipio.

Cantidad de Casas.

Estado.

9. Perfil de Liderazgo

Al seleccionar una tarjeta se abrirá una ficha.

Ejemplo.

Pastores Distrito 09

Foto

Jorge

Johanna

Celular

Correo

Distrito

Casas

Promedio asistencia

Promedio ofrenda

Mapa

Historial
10. Historial

Todo liderazgo conservará historial.

Ejemplo.

2024-2025

Carlos

Sandra

↓

2025-Actual

Jorge

Johanna

Nunca se perderá información.

11. Vista Nacional

La segunda pestaña será:

Cobertura Nacional.

Aquí aparecerá el mapa SVG.

Al seleccionar un Departamento.

Antioquia

↓

Municipios

↓

Distritos

↓

Casas de Paz
12. Búsqueda Global

El módulo permitirá buscar.

Distrito.

Casa.

Líder.

Pastor.

Municipio.

Departamento.

13. Filtros

Filtros disponibles.

Departamento.

Municipio.

Distrito.

Estado.

Nombre.

Cargo.

14. Línea de Tiempo

Cada liderazgo tendrá una línea de tiempo.

Ejemplo.

2022

↓

Nombrado Líder

↓

2023

Pastor Distrito

↓

2025

Actual

Esto ayudará a comprender la evolución del liderazgo.

15. Fotografías

Las fotografías serán administradas desde este módulo.

Cada liderazgo tendrá:

Foto principal.

Foto secundaria (opcional).

16. Estados

Cada unidad podrá estar.

Activo

Inactivo

Suspendido

Retirado
17. Colores

Se utilizarán los colores institucionales.

Azul.

Dorado.

Blanco.

Nunca colores fuertes.

18. Componentes UI

Este módulo utilizará.

OrganizationTree

LeadershipCard

DistrictCard

PeaceHouseCard

Timeline

SearchBar

FiltersPanel

SummaryCards

ProfileDrawer

Breadcrumb

19. APIs
GET /organization/tree

GET /organization/dashboard

GET /organization/leadership/{id}

GET /organization/districts

GET /organization/peace-houses

GET /organization/search

PUT /organization/leadership

POST /organization/district

POST /organization/peace-house
20. Auditoría

Registrar.

Cambio de liderazgo.

Creación Distrito.

Creación Casa.

Cambio fotografía.

Cambio usuario.

Cambio estado.

21. Permisos

Administrador

Todo.

Pastores Generales

Administran toda la organización.

Pastores Distrito

Administran únicamente su Distrito.

Líderes

Solo consulta.

22. Animaciones

Me gustaría que este módulo se sintiera moderno.

Por ejemplo.

Expandir árbol.

Transiciones suaves.

Fade.

Hover.

Zoom.

Todo usando Framer Motion.

23. Responsive

En móvil.

El árbol se convertirá en tarjetas.

En escritorio.

Árbol horizontal.

24. Mejoras que propongo
A. Organigrama Interactivo

En lugar de un árbol estático, utilizaría React Flow para construir un organigrama moderno e interactivo.

Ventajas:

Zoom.
Arrastrar.
Expandir nodos.
Vista profesional.
Muy intuitivo.
B. Ficha 360°

Al pulsar sobre cualquier liderazgo, abrir una vista completa con información consolidada.

Ejemplo:

Fotografía.
Datos de contacto.
Historial de nombramientos.
Casas de Paz a cargo.
Gráficas de crecimiento.
Promedio de asistencia.
Promedio de ofrendas.
Personas nuevas.
Metas cumplidas.

Esto evitará que el usuario tenga que navegar entre varios módulos.

C. Indicador de Salud Organizacional

Cada Distrito podría mostrar un indicador visual calculado automáticamente.

Ejemplo:

🟢 Excelente

🟡 Atención

🔴 Crítico

Este indicador podría basarse en:

Porcentaje de reuniones reportadas.
Asistencia promedio.
Crecimiento.
Cumplimiento de metas.

Así, los Pastores Generales identificarán rápidamente qué Distritos necesitan acompañamiento.

D. Organigrama histórico

No solo mostrar el organigrama actual.

También permitir seleccionar una fecha.

Ejemplo:

Ver organización en:

Enero 2024

↓

Mostrar cómo estaba organizada
la iglesia en esa fecha.

Esto es muy útil cuando cambian líderes o se crean nuevos Distritos, ya que permite consultar la estructura de la iglesia en cualquier momento del pasado sin perder el contexto histórico.