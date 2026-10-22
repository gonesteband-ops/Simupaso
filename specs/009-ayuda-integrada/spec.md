# Especificación: Ayuda integrada (feature 009)

**Fecha**: 2026-10-21
**Estado**: Aprobada e implementada
**Entrada**: Solicitud de dos pestañas nuevas para reducir las preguntas de “¿cómo se usa?”:
una guía visual paso a paso y un manual de usuario dentro de la app.

## Historias de usuario

### Historia 1 — Simu Paso a paso (P1)

Como trainer nuevo, quiero una guía visual que me muestre sobre una réplica del editor qué
hacer en cada etapa, para aprender sin depender de otra persona.

**Prueba independiente**: Abrir **Simu Paso a paso**, recorrer los pasos con Siguiente y
Anterior, comprobar el spotlight y terminar en “Empezar a crear”; repetir con teclado.

**Escenarios**:

1. La guía muestra una réplica del editor con un proyecto ficticio y una capa oscura que
   resalta el control del paso actual.
2. El primer paso resalta la carga de capturas y explica que cada imagen crea un paso.
3. Los pasos cubren lista de pasos, orden, zonas de clic, zonas de texto, propiedades,
   difuminado, vista previa, SCORM y respaldo.
4. Se puede avanzar, retroceder, saltar y reiniciar; al terminar se ofrece **Empezar a
   crear** y **Ver manual**.
5. La guía se controla con flechas y Escape, anuncia el paso y respeta
   `prefers-reduced-motion`.
6. La guía no crea proyectos, no escribe en IndexedDB y no usa datos reales.

### Historia 2 — Acerca de (P1)

Como trainer que prefiere leer, quiero un manual claro dentro de la app, para consultar el
flujo completo y resolver dudas sin buscar fuera.

**Prueba independiente**: Abrir **Acerca de**, navegar el índice y verificar que explica
creación, zonas, formulario, difuminado, respaldo/importación, vista previa y SCORM.

**Escenarios**:

1. La página tiene un índice y secciones con títulos claros, en español (Chile) y nivel
   usuario.
2. Explica la diferencia entre el SCORM (para el LMS) y el respaldo `.simpaso` (editable y
   con originales).
3. Explica que los proyectos viven en el navegador, no en el servidor, y que no hay
   sincronización ni cuentas.
4. Incluye preguntas frecuentes y límites conocidos.
5. Enlaza a la guía visual y a “Empezar a crear”.

## Requisitos funcionales

- **FR-001**: El menú lateral MUST incluir **Simu Paso a paso** y **Acerca de**, con estado
  activo y navegación accesible.
- **FR-002**: La guía MUST ser una réplica visual no interactiva del editor, usando una
  captura ficticia y sin tocar IndexedDB.
- **FR-003**: La guía MUST mostrar una capa de **plomo claro semitransparente** (no negra ni
  demasiado oscura) con un spotlight sobre el elemento del paso actual y un globo con número,
  título y explicación. El velo MUST dejar legible el contexto del editor sin competir con el
  elemento resaltado. El globo MUST colocarse fuera del área resaltada cuando haya espacio,
  para no tapar el control que se está explicando.
- **FR-004**: La guía MUST permitir Anterior, Siguiente, Saltar, reiniciar, Empezar a crear
  y Ver manual.
- **FR-005**: La guía MUST soportar flechas y Escape, anunciar el paso con `aria-live`, tener
  foco visible y respetar `prefers-reduced-motion`.
- **FR-006**: La guía MUST cubrir carga, pasos, orden, clic, texto, propiedades, difuminado,
  vista previa, SCORM y respaldo.
- **FR-007**: El manual MUST incluir índice, primeros pasos, editor, zonas, formulario,
  difuminado/privacidad, respaldo/importación, vista previa, SCORM/LMS, datos locales y FAQ.
- **FR-008**: El manual MUST explicar que los proyectos son locales y que no hay
  sincronización ni cuentas.
- **FR-009**: El manual MUST distinguir claramente SCORM y `.simpaso`, y advertir sobre datos
  sensibles.
- **FR-010**: Ambas páginas MUST usar el sistema visual existente, contraste AA y diseño
  legible a 1024 px.
- **FR-011**: Ambas páginas MUST funcionar sin backend, sin peticiones externas y sin datos
  de clientes.
- **FR-012**: La guía y el manual MUST enlazarse entre sí y ofrecer un camino a “Empezar a
  crear”.

## Criterios de éxito

- **SC-001**: Una persona nueva completa la guía en menos de 3 minutos y termina en el flujo
  de creación.
- **SC-002**: Los 9 pasos de la guía se pueden recorrer con mouse y teclado sin perder el
  foco.
- **SC-003**: El manual permite encontrar una respuesta sobre capturas, zonas, difuminado,
  respaldo o SCORM en menos de 1 minuto usando el índice.
- **SC-004**: Ninguna de las dos páginas crea proyectos, modifica IndexedDB ni realiza
  peticiones de red externas.
- **SC-005**: Ambas páginas mantienen el contraste AA y se ven correctamente en 1024×600 y
  1440×900.

## Supuestos

- La guía es una réplica visual; no se implementa un tutorial interactivo sobre el editor
  real en esta entrega.
- Se usa una captura ficticia existente en `src/fixtures/assets/`; no se incorporan datos de
  clientes.
- No se agregan videos, dependencias de tours ni servicios externos.
- La navegación sigue siendo por estado interno, sin router.
- El velo de la guía usa un gris plomo claro (por ejemplo `rgba(100, 116, 139, 0.35)`) y el
  foco se refuerza con un anillo y una sombra suave, no oscureciendo el resto en exceso.
