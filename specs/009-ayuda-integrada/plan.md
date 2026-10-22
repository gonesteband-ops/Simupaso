# Plan: Ayuda integrada (feature 009)

**Fecha**: 2026-10-21 | **Estado**: Implementación aprobada

## Enfoque

Agregar dos secciones estáticas a la app:

- `src/help/StepByStepGuide.tsx`: réplica visual del editor con datos ficticios,
  `aria-hidden`, y un recorrido de 9 pasos. El spotlight se calcula con
  `getBoundingClientRect` y se dibuja con un div fijo y `box-shadow` extendido; el velo es
  **plomo claro semitransparente**, no negro. El globo se posiciona junto al elemento y se
  mueve al viewport en pantallas angostas.
- `src/help/AboutPage.tsx`: manual por secciones con índice, tarjetas, tabla comparativa
  SCORM vs `.simpaso`, FAQ con `<details>` y enlaces internos.
- `src/help/help.css`: estilos de ambas páginas sobre los tokens existentes.
- El globo busca ubicarse a la derecha, izquierda, abajo o arriba del spotlight según el espacio; los pasos que lo necesitan evitan tapar el control resaltado.
- Integración en `src/app/App.tsx` con las secciones `guia` y `acerca`, botones desde Inicio
  y enlaces cruzados.

## Detalles de la guía

- Pasos: cargar capturas, lista de pasos, orden/duplicado, zonas de clic, zonas de texto y
  validaciones, panel de propiedades/tamaño/globo, difuminado, vista previa, SCORM y
  respaldo.
- Controles: Anterior, Siguiente, Saltar, reiniciar; teclado ←/→/Escape; progreso “Paso X de
  9”; `aria-live` y foco en el globo.
- Estados del mock según el paso: vacío, con pasos, con zonas, con panel y con difuminado.
- Imagen ficticia: `src/fixtures/assets/search-demo.png`.
- Sin IndexedDB, sin red, sin dependencias nuevas.

## Pruebas

- E2E `tests/e2e/help.spec.ts`: navegación, recorrido con mouse y teclado, spotlight, saltar,
  reiniciar, enlaces a manual/crear; índice y secciones del manual; ausencia de red.
- Verificación de contraste del velo y del globo, y de que el mock no es interactivo.
- Regresión completa y build.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Deriva entre la réplica y el editor | Reutilizar clases/tokens y centralizar pasos en un arreglo |
| Spotlight mal posicionado al hacer scroll | Recalcular en scroll/resize y usar `scrollIntoView` |
| Velo demasiado oscuro | Usar plomo claro y reforzar el foco con anillo/sombra |
| Tutorial inaccesible | Mock `aria-hidden`, texto en el globo, teclado y anuncios |
