# Decisiones de arquitectura

Decisiones que **cuestan revertir** y el motivo por el que se tomaron. El
criterio para entrar aquí no es la importancia: es que alguien, dentro de un
año, vaya a mirar el código y preguntarse "¿por qué así?".

El plan por fases y las reglas de negocio viven en
`Documentos/00_PROYECTO_MASTER.md`.

---

## ADR-001 · Contradicciones de la documentación se arbitran, no se promedian

**Contexto.** Los 28 documentos originales tienen contradicciones reales: tres
planes maestros distintos, doc18 pidiendo un primario "morado" que el logo no
tiene, doc25 describiendo el registro de reunión como asistente de 5 pasos y
doc17 exigiendo "todo en una sola pantalla".

**Decisión.** `00_PROYECTO_MASTER.md` arbitra. Cuando dos documentos chocan se
elige uno **por escrito y con motivo**, y se anota en el código donde importa.

**Por qué.** Construir contra documentos contradictorios produce decisiones
incompatibles que se descubren tarde. Promediarlas produce algo que ninguno de
los dos pedía.

---

## ADR-002 · La semana ISO se calcula, nunca se almacena

**Decisión.** El estado de bloqueo de una reunión se deriva de su fecha y del
reloj, en cada lectura.

**Por qué.** Una bandera `bloqueada` en base necesita un proceso semanal que la
active. El día que ese proceso falle, las reuniones quedan editables **para
siempre y en silencio** — y nadie lo nota, porque no hay error.

**Costo aceptado.** Se recalcula en cada petición.

---

## ADR-003 · La reunión semanal se crea bajo demanda, no por cron

**Decisión.** Abrir la planilla de la semana la crea si no existe, de forma
idempotente, garantizada por `@@unique` sobre la semana ISO más captura de
`P2002`.

**Por qué.** Un cron que falla un domingo deja a todo el país sin planilla y el
fallo se descubre el lunes por la mañana, con los líderes bloqueados. La
creación perezosa no puede fallar "en general": falla como mucho para quien
está abriendo la pantalla, y reintentar es volver a entrar.

---

## ADR-004 · Dos mecanismos de alcance, no uno

**Decisión.** `ScopeGuard` para un recurso identificado en la ruta;
`peaceHouseScopeFilter` dentro del `where` para colecciones y agregados.

**Por qué.** Un guard necesita **un** id que resolver. Una lista no lo tiene. Y
filtrar después de consultar significa que las filas ya se leyeron: eso es la
fuga, no el arreglo.

**Consecuencia peligrosa, ya observada.** Una ruta cuyo identificador el guard
no sabe resolver queda **sin control por fila** y deja pasar en silencio. Al
añadir un módulo que opera sobre un id derivado hay que añadir su
`ScopeResourceType`. Probar como Administrador no sirve: ese rol está exento.

---

## ADR-005 · Recharts para gráficas, con su color validado por herramienta

**Decisión.** Recharts (doc23), pese a que doc03 dice Chart.js — pedido
explícito del dueño del proyecto. El color de las series es
`--color-chart-1`, un token propio.

**Por qué el token es propio.** Un color de gráfica responde a una restricción
que un botón no tiene: contraste ≥3:1 **contra la superficie donde se dibuja** y
una banda de luminosidad, en cada tema. Se verificó con el validador de paleta,
no a ojo: `#1E88E5` pasa las seis comprobaciones en claro y oscuro; el dorado
`#D4A017` **no alcanza contraste** (2.38 sobre blanco) y por eso no se usa como
marca de datos sin etiqueta visible.

**Regla para el futuro.** Una segunda serie obliga a volver a correr el
validador, no a elegir un color que se vea bien al lado.

---

## ADR-006 · El mapa usa Leaflet con datos propios, no un SVG de departamentos

**Contexto.** El plan original pedía un SVG de Colombia con 33 paths
identificables. Ese archivo fue la única dependencia externa sin resolver
durante nueve fases.

**Decisión.** Leaflet con tiles gratuitos sin API key, y puntos que salen de
coordenadas **propias**: el catálogo de municipios se geocodifica **una sola
vez** con Nominatim y se guarda en base.

**Por qué cumple la RN-1103** ("no dependerá de servicios externos como Google
Maps"). Los datos son 100 % nuestros. Lo externo son las imágenes de fondo, sin
clave ni costo.

**Por qué se geocodifica el catálogo y no cada Casa de Paz.** El catálogo es
acotado (~1.100 filas, una vez). Geocodificar direcciones sería ilimitado y
volvería a llamar al proveedor cada vez que nace una casa, contra un límite de
una consulta por segundo.

**Limitación aceptada.** Sin conexión los tiles no cargan y el mapa queda como
marcadores sobre lienzo vacío.

---

## ADR-007 · Una definición por reporte, dos renderizadores

**Decisión.** Cada reporte declara **una sola vez** su título, sus columnas y su
consulta. La vista previa y el Excel son dos renderizadores sobre ese objeto.

**Por qué.** La alternativa —un `findAll` para la tabla y un `exportToExcel` que
arma su propio encabezado— arranca idéntica y **diverge la primera vez que
alguien agrega una columna**: la pantalla la muestra, la descarga no, y quien
concilie las dos planillas no tiene forma de saber cuál miente.

---

## ADR-008 · Los "cuatro dashboards por rol" son uno solo

**Contexto.** doc17: "cada usuario verá un Dashboard diferente según su rol".

**Decisión.** Una pantalla. Las cuatro preguntas son las mismas; lo que cambia
es la **respuesta**, porque el servidor acota por rol (RN-1302). Un
`scopeLabel` dice en voz alta qué abarcan las cifras. Lo que sí ramifica por rol
son los accesos directos.

**Por qué no cuatro pantallas.** Habrían divergido, y tres se habrían
descubierto rotas meses después — porque nadie con ese rol las abrió.

---

## ADR-009 · Sin tests automatizados en el frontend

**Decisión.** `apps/web` no tiene runner de tests. Decisión explícita del dueño
del proyecto en la Fase 5.

**Cómo se compensa.** `typecheck`, `lint`, `build` y **verificación visual en
navegador real** al cerrar cada fase.

**Riesgo asumido, y ya materializado.** `<Grid>` estuvo roto desde la Fase 3 sin
que nada errara — Tailwind no escaneaba `packages/ui`. Lo encontró una captura
de pantalla, no una suite. Revisar esta decisión si el frontend sigue creciendo.
