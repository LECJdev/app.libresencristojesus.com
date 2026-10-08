PRODUCT REQUIREMENTS DOCUMENT (PRD)
Plataforma de Gestión de Casas de Paz
Iglesia Cristiana Libres en Cristo Jesús

Versión: 1.0

TABLA DE CONTENIDO
1. Introducción

2. Visión del Producto

3. Problema que resuelve

4. Objetivos

5. Alcance

6. Usuarios

7. Roles

8. Casos de Uso

9. Historias de Usuario

10. Wireframes

11. Flujo de Navegación

12. Flujos BPMN

13. Reglas de Negocio

14. Requisitos Funcionales

15. Requisitos No Funcionales

16. MVP

17. Roadmap

18. KPIs

19. Riesgos

20. Criterios de Aceptación
1. INTRODUCCIÓN
Nombre

Plataforma Gestión de Casas de Paz

Cliente

Iglesia Cristiana Libres en Cristo Jesús

Tipo

Sistema Web Empresarial

PWA

Responsive

Mobile First

2. VISIÓN DEL PRODUCTO
Problema actual

Actualmente la iglesia realiza el control de asistencia de las Casas de Paz de manera manual o mediante herramientas dispersas, lo que dificulta:

conocer el crecimiento real de la iglesia;
hacer seguimiento a los asistentes;
consolidar estadísticas;
controlar las ofrendas por Casa de Paz;
visualizar la estructura organizacional.

La información suele estar distribuida entre cuadernos, hojas de cálculo y mensajes de WhatsApp, dificultando la toma de decisiones.

Solución

Crear una plataforma web moderna que permita:

registrar las Casas de Paz;
controlar las reuniones semanales;
registrar asistencia;
controlar las ofrendas;
visualizar métricas;
administrar la estructura organizacional;
generar reportes.

Todo desde computador o celular.

3. OBJETIVOS
Objetivo General

Digitalizar completamente la administración de las Casas de Paz.

Objetivos Específicos
Reducir el tiempo de registro semanal.
Eliminar registros manuales.
Tener indicadores en tiempo real.
Centralizar la información.
Facilitar el trabajo pastoral.
Mejorar la toma de decisiones.
4. ALCANCE

El sistema permitirá administrar:

✔ Iglesia

✔ Distritos

✔ Casas de Paz

✔ Personas

✔ Reuniones

✔ Asistencia

✔ Ofrendas

✔ Dashboard

✔ Reportes

✔ Organigrama

✔ Usuarios

✔ Roles

✔ Auditoría

No incluye inicialmente:

Contabilidad general.
Diezmos individuales.
Escuela bíblica.
Encuentros.
Integración bancaria.
Multiiglesia.
5. TIPOS DE USUARIO
Administrador

Acceso total.

Pastores Generales

Visualización completa.

Pastores de Distrito

Administran únicamente su distrito.

Líder Casa de Paz

Administra únicamente su Casa de Paz.

6. PROPUESTA DE VALOR

Esta plataforma no busca únicamente almacenar información.

Busca responder preguntas estratégicas como:

¿Cuál distrito está creciendo más?
¿Qué Casa de Paz necesita acompañamiento?
¿Cuántos nuevos asistentes llegaron este mes?
¿Cuál es la permanencia de los asistentes?
¿Cuál fue la asistencia promedio del trimestre?
¿Qué municipios tienen mayor presencia?
7. CASOS DE USO (VISIÓN GENERAL)
Administración
Iniciar sesión.
Recuperar contraseña.
Gestionar usuarios.
Gestionar roles.
Consultar auditoría.
Organización
Crear distrito.
Editar distrito.
Crear Casa de Paz.
Asignar líder.
Consultar organigrama.
Personas
Registrar asistente.
Editar información.
Trasladar persona.
Consultar historial.
Reuniones
Crear programación.
Registrar reunión.
Registrar tema.
Registrar ofrenda.
Subir fotografía.
Registrar asistencia.
Dashboard
Consultar indicadores.
Filtrar por fechas.
Filtrar por distrito.
Filtrar por Casa de Paz.
Ver mapa de Colombia.
Reportes
Exportar Excel.
Consultar históricos.
Comparar periodos.
8. CASO DE USO DETALLADO (Ejemplo)
CU-001 – Registrar Reunión Semanal

Actor Principal: Líder de Casa de Paz.

Objetivo: Registrar toda la información de la reunión semanal.

Precondiciones
Usuario autenticado.
Casa de Paz activa.
Reunión generada automáticamente para la semana.
Flujo Principal
El líder inicia sesión.
Accede al módulo "Mi Casa de Paz".
Selecciona la reunión de la semana.
Registra el tema de la prédica.
Marca la asistencia de los participantes.
Agrega nuevos asistentes si es necesario.
Ingresa el valor de la ofrenda.
Adjunta una fotografía.
Guarda la reunión.
Resultado Esperado
La reunión queda registrada.
Se actualizan las métricas.
La auditoría registra la operación.
Reglas Aplicables
RN-401.
RN-405.
RN-501.
RN-601.
9. HISTORIAS DE USUARIO (Ejemplo)
HU-001

Como Líder de Casa de Paz,

quiero registrar la asistencia semanal de mi grupo,

para llevar el control de quienes participaron en la reunión.

Criterios de aceptación
Solo se muestran personas de mi Casa de Paz.
Puedo agregar un nuevo asistente.
Puedo marcar asistencia con un solo toque.
El registro queda bloqueado cuando inicia la siguiente reunión.
HU-002

Como Pastor de Distrito,

quiero visualizar el desempeño de todas las Casas de Paz de mi distrito,

para identificar oportunidades de acompañamiento y crecimiento.

10. PERSONAS (PERSONAS)

Además del registro básico, cada persona tendrá un ciclo de vida:

Nuevo asistente.
Asistente frecuente.
Miembro.
Líder potencial.
Líder.
Trasladado.
Inactivo.

Esto permitirá, en futuras versiones, construir un módulo de consolidación.

11. INDICADORES PRINCIPALES (KPIs)

El Dashboard mostrará, según el rol del usuario:

Total de asistentes.
Asistencia de la semana.
Asistencia del mes.
Asistencia del año.
Crecimiento mensual.
Nuevos asistentes.
Casas de Paz activas.
Distritos activos.
Promedio de asistentes por reunión.
Total de ofrendas.
Promedio de ofrenda por Casa de Paz.
Reuniones pendientes por registrar.
12. EXPERIENCIA DE USUARIO

Principios de diseño:

Máximo tres clics para cualquier tarea frecuente.
Formularios cortos.
Botones grandes para uso en móvil.
Mensajes claros.
Retroalimentación inmediata.
Colores coherentes con la identidad de la iglesia.
13. WIREFRAMES (Plan)

Cada módulo tendrá un wireframe antes de ser implementado:

Login.
Dashboard General.
Dashboard Distrito.
Dashboard Casa de Paz.
Organigrama.
Mapa de Colombia.
Gestión de Personas.
Registro de Reunión.
Reportes.
Administración.
14. FLUJOS BPMN (Plan)

Se documentarán los procesos principales:

Inicio de sesión.
Creación de usuario.
Creación de Casa de Paz.
Programación automática de reuniones.
Registro de reunión.
Registro de asistencia.
Registro de ofrenda.
Generación de reportes.
Exportación a Excel.
15. REQUISITOS NO FUNCIONALES
Responsive (Mobile First).
PWA instalable.
Tiempo de carga < 2 segundos para vistas comunes.
Alta disponibilidad.
Copias de seguridad.
Auditoría completa.
Accesibilidad WCAG AA.
Seguridad con JWT + Refresh Token.
Compatibilidad con los principales navegadores modernos.
16. MVP

La primera versión estará lista cuando permita:

Iniciar sesión.
Administrar la organización.
Registrar personas.
Registrar reuniones.
Registrar asistencia.
Registrar ofrendas.
Ver dashboards.
Exportar reportes.
Instalar la aplicación como PWA.
17. CRITERIOS DE ÉXITO

El proyecto se considerará exitoso cuando:

Un líder registre una reunión completa en menos de 2 minutos.
Toda la información esté disponible desde el celular.
Los pastores puedan visualizar métricas en tiempo real.
La información sea consistente y auditable.
El sistema pueda crecer sin rediseños importantes.