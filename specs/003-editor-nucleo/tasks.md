---
description: "Lista de tareas para la feature 003: editor núcleo"
---

# Tasks: Editor núcleo (feature 003)

**Input**: Documentos de diseño en `specs/003-editor-nucleo/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluidas las pruebas exigidas por la constitución y la especificación
(contrato, validaciones de texto y RUT, almacenamiento local y regresión del exportador).
Las pruebas de puntaje no aplican a esta feature; pertenecen a la 006.

**Organization**: Tareas agrupadas por historia de usuario para que cada una sea
implementable y verificable por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: US1–US5, según las historias de `spec.md`.
- Todas las rutas son relativas a la raíz del repositorio.

## Path Conventions

Proyecto único: `src/`, `tests/` y `preview.html` en la raíz.

---

## Phase 1: Setup

**Purpose**: Preparar la única dependencia de pruebas y confirmar la línea base.

- [X] T001 Confirmar la línea base con `npm run typecheck` y `npm test`; instalar `fake-indexeddb@6.2.6` como dependencia de desarrollo en `package.json` y `package-lock.json`, sin agregar dependencias de ejecución, y repetir las pruebas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato, modelo puro, almacenamiento y runtime compartido que necesitan todas
las historias.

**⚠️ CRITICAL**: Ninguna historia de usuario comienza hasta completar esta fase.

### Contrato

- [X] T002 [P] Escribir pruebas del contrato para los campos opcionales `hint`, `messages`, `buttonLabel` y para proyectos de un solo paso en `tests/contract/project-schema.test.ts`; comprobar que fallan antes de implementar.
- [X] T003 Implementar las adiciones compatibles del contrato en `src/contract/project-schema.ts` y exportar los tipos en `src/contract/project.ts`.
- [X] T004 Regenerar el JSON Schema en `src/contract/json-schema.ts` y cubrir su serialización en `tests/contract/project-schema.test.ts`.

### Modelo del editor

- [X] T005 [P] Escribir pruebas del documento `editor-1`, sus invariantes y el rechazo de versiones desconocidas en `tests/unit/editor/editor-schema.test.ts`.
- [X] T006 Implementar los tipos y el esquema Zod del documento editable en `src/editor/model/editor-types.ts` y `src/editor/model/editor-schema.ts`.
- [X] T007 [P] Escribir pruebas de geometría: conversión cliente↔normalizado con zoom, recorte a límites, tamaño mínimo y conservación de proporciones al redimensionar en `tests/unit/editor/geometry.test.ts`.
- [X] T008 Implementar las funciones puras de coordenadas y rectángulos en `src/editor/model/geometry.ts`.
- [X] T009 [P] Escribir pruebas de reglas de imagen: MIME permitido, límite de 10 MB, nombre y orden natural `es-CL` en `tests/unit/editor/image-rules.test.ts`.
- [X] T010 Implementar la validación y el orden de archivos en `src/editor/model/image-rules.ts`.
- [X] T011 [P] Escribir pruebas del reducer y del historial: agregar, reordenar, duplicar y eliminar pasos; undo/redo; limpieza de `future` al editar en `tests/unit/editor/editor-reducer.test.ts`.
- [X] T012 Implementar el reducer inmutable y las pilas de historial en `src/editor/model/editor-reducer.ts`.
- [X] T013 [P] Escribir pruebas de compilación al contrato: orden de acciones, paso informativo, agrupación de clic, valores por defecto y errores bloqueantes en `tests/unit/editor/compile-project.test.ts`.
- [X] T014 Implementar `compileEditorProject` en `src/editor/model/compile-project.ts` usando `projectSchema` como validación final.

### Almacenamiento local

- [X] T015 [P] Escribir pruebas del repositorio con `fake-indexeddb`: guardar/cargar documento, assets, índice `projectId`, error de cuota, documento inexistente y borrado en cascada en `tests/unit/editor/editor-repository.test.ts`.
- [X] T016 Implementar el envoltorio de IndexedDB y el repositorio en `src/editor/storage/indexeddb.ts` y `src/editor/storage/editor-repository.ts`.

### Runtime compartido del reproductor

- [X] T017 [P] Cubrir con la E2E de vista previa el montaje del runtime sin adaptador LMS y el inicio en un paso elegido en `tests/e2e/editor-preview.spec.ts`; conservar la regresión del reproductor independiente en `tests/e2e/player-standalone.spec.ts`.
- [X] T018 Extraer el runtime de `src/player/main.ts` a `src/player/runtime.ts` con resolución de assets y adaptador inyectables; dejar `src/player/main.ts` como arranque independiente y conservar el comportamiento actual.
- [X] T019 [P] Ampliar las pruebas E2E del reproductor para mensajes de paso, mensajes de zona de texto y `buttonLabel` informativo en `tests/e2e/player-actions.spec.ts`; comprobar que fallan antes de implementar.
- [X] T020 Implementar el uso de mensajes y `buttonLabel` con respaldo a los textos actuales en `src/player/runtime.ts`.
- [X] T021 Ejecutar `npm run typecheck`, `npm test` y las E2E del reproductor según los scripts de `package.json`; corregir la base antes de abrir las historias y dejar en verde `tests/unit/player/runtime.test.ts` y `tests/e2e/player-actions.spec.ts`.

**Checkpoint**: contrato, modelo, almacenamiento y runtime listos; las historias pueden comenzar.

---

## Phase 3: User Story 1 — Cargar capturas y armar la secuencia de pasos (Priority: P1) 🎯 MVP

**Goal**: Abrir un borrador en el editor, cargar capturas, crear un paso por imagen,
ordenarlos y conservar todo localmente.

**Independent Test**: Abrir un borrador, cargar dos copias de una imagen ficticia,
comprobar el orden, reordenar, duplicar y eliminar pasos, recargar y verificar que la
secuencia y las imágenes siguen disponibles.

### Tests for User Story 1

- [X] T022 [P] [US1] Escribir la E2E de carga múltiple, orden por nombre, reordenamiento, duplicado, eliminación y recarga en `tests/e2e/editor-upload-steps.spec.ts`.
- [X] T023 [P] [US1] Escribir la prueba de integración del ciclo borrador → documento → recarga → eliminación en cascada en `tests/integration/editor-persistence.test.ts`.

### Implementation for User Story 1

- [X] T024 [US1] Agregar la apertura de un borrador en el editor y la vista a pantalla completa en `src/app/App.tsx`, `src/editor/EditorPage.tsx` y `src/editor/editor.css`.
- [X] T025 [US1] Implementar la carga o creación inicial del documento y el estado de guardado en `src/editor/hooks/useEditor.ts`.
- [X] T026 [US1] Implementar la ingesta de capturas (validación, dimensiones, blob y objeto URL) y la zona de arrastrar/soltar en `src/editor/model/image-ingest.ts` y `src/editor/components/ImageDropZone.tsx`.
- [X] T027 [US1] Implementar la lista de pasos con miniatura, selección, reordenamiento accesible, duplicado, eliminación con confirmación e inserción de captura en `src/editor/components/StepList.tsx`.
- [X] T028 [US1] Sincronizar `stepCount`/`updatedAt` del borrador, el autoguardado y los avisos de almacenamiento o privacidad en `src/editor/hooks/useEditor.ts`, `src/app/App.tsx` y `src/editor/EditorPage.tsx`.
- [X] T029 [US1] Ejecutar las pruebas de la historia y corregir hasta que pasen; verificar que no se crean pasos con archivos inválidos en `tests/e2e/editor-upload-steps.spec.ts` y `tests/integration/editor-persistence.test.ts`.

**Checkpoint**: US1 funcional y demostrable; la app ya permite cargar capturas y conservar pasos.

---

## Phase 4: User Story 2 — Dibujar y editar zonas de clic (Priority: P1)

**Goal**: Marcar una o varias zonas de clic sobre la captura, moverlas, redimensionarlas y
definir si basta una o se requieren todas.

**Independent Test**: Sobre una captura ficticia, dibujar una zona de clic, moverla,
redimensionarla, editarla numéricamente, agregar otra y comprobar que se conserva al
cambiar el zoom y al recargar.

### Tests for User Story 2

- [X] T030 [P] [US2] Escribir pruebas unitarias de creación, movimiento, redimensión, recorte y duplicado de zonas de clic en `tests/unit/editor/click-zones.test.ts`.
- [X] T031 [P] [US2] Escribir la E2E de dibujo, selección, movimiento, redimensión, coordenadas, múltiples zonas y regla any/all en `tests/e2e/editor-zones.spec.ts`.

### Implementation for User Story 2

- [X] T032 [US2] Implementar el escenario del lienzo con imagen, capa SVG, zoom básico, paneo y selección en `src/editor/components/CanvasStage.tsx` y `src/editor/editor.css`.
- [X] T033 [US2] Implementar la herramienta de clic con dibujo por puntero, captura de puntero, manijas de redimensión y recorte a límites en `src/editor/components/CanvasStage.tsx` y `src/editor/model/geometry.ts`.
- [X] T034 [US2] Implementar el panel de propiedades de clic y las acciones de reducer para agregar, mover, redimensionar, duplicar y eliminar zonas en `src/editor/components/PropertiesPanel.tsx` y `src/editor/model/editor-reducer.ts`.
- [X] T035 [US2] Agregar la creación de una zona centrada y el movimiento/eliminado por teclado para la zona seleccionada en `src/editor/EditorPage.tsx` y `src/editor/components/CanvasStage.tsx`.
- [X] T036 [US2] Ejecutar las pruebas de la historia y corregir hasta que pasen; comprobar la alineación con la imagen a 50 %, 100 % y ajuste a pantalla en `tests/unit/editor/click-zones.test.ts` y `tests/e2e/editor-zones.spec.ts`.

**Checkpoint**: US2 funcional sobre la base de US1.

---

## Phase 5: User Story 3 — Dibujar y configurar zonas de texto (Priority: P1)

**Goal**: Marcar campos simulados, definir etiqueta, enmascarado, validación, valores
esperados y mensajes.

**Independent Test**: Crear una zona de texto ficticia, configurar valor exacto y RUT,
comprobar los mensajes y verificar que el documento guarda y recupera la configuración.

### Tests for User Story 3

- [X] T037 [P] [US3] Escribir pruebas unitarias de validación de zona de texto, valores esperados, mensajes y RUT con normalización por defecto en `tests/unit/editor/text-zones.test.ts`.
- [X] T038 [P] [US3] Escribir la E2E de creación de zona de texto, edición de etiqueta/placeholder/enmascarado, validaciones y mensajes en `tests/e2e/editor-text-zones.spec.ts`.

### Implementation for User Story 3

- [X] T039 [US3] Implementar la herramienta de texto y el dibujo de la zona en `src/editor/components/CanvasStage.tsx`.
- [X] T040 [US3] Implementar el panel de propiedades de texto, la validación de campos incompletos y el valor por defecto `normalize: true` para RUT en `src/editor/components/PropertiesPanel.tsx` y `src/editor/model/editor-schema.ts`.
- [X] T041 [US3] Compilar las zonas de texto a acciones `input` en orden, con rectángulo, etiqueta, placeholder, enmascarado, validación y mensajes en `src/editor/model/compile-project.ts`.
- [X] T042 [US3] Ejecutar las pruebas de la historia y corregir hasta que pasen; verificar que una zona enmascarada no guarda ni reporta valores en `tests/unit/editor/text-zones.test.ts` y `tests/e2e/editor-text-zones.spec.ts`.

**Checkpoint**: US3 funcional; clic y texto conviven en un paso.

---

## Phase 6: User Story 4 — Zoom, teclado e historial de cambios (Priority: P2)

**Goal**: Trabajar con precisión en capturas grandes y corregir acciones con
deshacer/rehacer durante la sesión.

**Independent Test**: Usar zoom y ajuste a pantalla, mover y redimensionar con teclado,
duplicar y eliminar, y recorrer deshacer/rehacer; recargar y confirmar que el historial se
reinicia y el último estado guardado se conserva.

### Tests for User Story 4

- [X] T043 [P] [US4] Escribir pruebas unitarias de deshacer/rehacer repetido, limpieza de `future`, invalidación de selección y límites de zoom en `tests/unit/editor/history.test.ts`.
- [X] T044 [P] [US4] Escribir la E2E de atajos de teclado, foco, undo/redo y alineación en zoom mínimo, 100 % y ajuste a pantalla en `tests/e2e/editor-keyboard-history.spec.ts`.

### Implementation for User Story 4

- [X] T045 [US4] Implementar los controles y atajos de deshacer/rehacer y el estado accesible del historial en `src/editor/hooks/useEditor.ts` y `src/editor/EditorPage.tsx`.
- [X] T046 [US4] Completar zoom, ajuste a pantalla, restablecer, paneo y conversión precisa de coordenadas en `src/editor/components/CanvasStage.tsx`, `src/editor/model/geometry.ts` y `src/editor/editor.css`.
- [X] T047 [US4] Implementar navegación completa por teclado en herramientas, lista de pasos, lienzo y panel, con foco visible, anuncios `aria-live` y respeto a `prefers-reduced-motion`, en `src/editor/components/StepList.tsx`, `src/editor/components/PropertiesPanel.tsx` y `src/editor/EditorPage.tsx`.
- [X] T048 [US4] Ejecutar las pruebas de la historia y corregir hasta que pasen; verificar la tolerancia de 1 CSS px en `tests/unit/editor/history.test.ts` y `tests/e2e/editor-keyboard-history.spec.ts`.

**Checkpoint**: US4 funcional; la edición es precisa y reversible en la sesión.

---

## Phase 7: User Story 5 — Revisar el simulador en vista previa (Priority: P2)

**Goal**: Previsualizar el proyecto en modo guiado con el mismo reproductor exportable,
desde el primer paso o el seleccionado.

**Independent Test**: Con un proyecto de dos pasos, abrir la vista previa desde el paso
actual, completar las interacciones, comprobar que no hay llamadas SCORM y volver al
editor sin perder cambios.

### Tests for User Story 5

- [X] T049 [P] [US5] Escribir pruebas unitarias del protocolo de vista previa: mensajes válidos, origen/fuente, `requestId`, proyecto inválido y assets faltantes en `tests/unit/editor/preview-bridge.test.ts`.
- [X] T050 [P] [US5] Escribir la E2E de vista previa en iframe, inicio desde el paso seleccionado, paso informativo, ausencia de API SCORM, cierre y retorno de foco en `tests/e2e/editor-preview.spec.ts`.

### Implementation for User Story 5

- [X] T051 [US5] Crear la entrada `preview.html`, el arranque `src/preview/main.ts` y la entrada adicional de Vite en `vite.config.ts`; cargar el runtime compartido y esperar el mensaje del editor.
- [X] T052 [US5] Implementar el diálogo de vista previa con iframe, validación de origen, `postMessage`, mapa de URLs de assets, revocación al cerrar, timeout y retorno de foco en `src/editor/components/PreviewDialog.tsx`.
- [X] T053 [US5] Implementar la lista navegable de problemas de compilación y el salto al paso o zona afectada en `src/editor/model/compile-project.ts` y `src/editor/EditorPage.tsx`.
- [X] T054 [US5] Implementar el cambio de paso a informativo, el texto del botón y su reflejo en el reproductor en `src/editor/components/PropertiesPanel.tsx`, `src/contract/project-schema.ts` y `src/player/runtime.ts`.
- [X] T055 [US5] Ejecutar las pruebas de la historia y corregir hasta que pasen; verificar que la vista previa no altera el documento en `tests/unit/editor/preview-bridge.test.ts` y `tests/e2e/editor-preview.spec.ts`.

**Checkpoint**: las cinco historias funcionan de forma integrada y demostrable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final, regresión y documentación.

- [X] T056 [P] Agregar la E2E de ausencia de peticiones externas en carga, edición y vista previa en `tests/e2e/editor-network.spec.ts`.
- [X] T057 [P] Agregar comprobaciones E2E de accesibilidad y contraste del editor y del diálogo de vista previa en `tests/e2e/editor-accessibility.spec.ts`.
- [X] T058 [P] Ejecutar la regresión de contrato, reproductor, exportador, ZIP y límite de 250 KiB en `tests/contract/project-schema.test.ts`, `tests/e2e/scorm-package.spec.ts` y `tests/unit/exporter/player-size.test.ts`; corregir cualquier ruptura.
- [X] T059 Ejecutar `npm run typecheck`, `npm test`, `npm run test:e2e` y `npm run build` según los scripts de `package.json`; corregir hasta que todo pase.
- [X] T060 Validar el recorrido manual de `specs/003-editor-nucleo/quickstart.md` y registrar resultados y limitaciones.
- [X] T061 Actualizar `PROGRESS.md` con decisiones, pruebas, errores resueltos, estado actual y próxima tarea.
- [X] T062 Revisar `src/editor/EditorPage.tsx`, `src/editor/editor.css` y `tests/e2e/editor-network.spec.ts` para eliminar código muerto, confirmar que no se muestran funciones de las features 004–008 y verificar que no haya recursos remotos ni datos reales.

---

## Phase 9: Mejora posterior — formulario realista (2026-10-21)

**Purpose**: Mostrar RUT y contraseña simultáneamente sobre la captura y validarlos al
pulsar la zona de Entrar, sin romper los proyectos existentes.

- [X] T063 [P] Agregar `formMode` opcional al contrato y sus pruebas en `src/contract/project-schema.ts` y `tests/contract/project-schema.test.ts`.
- [X] T064 Compilar `formMode` cuando el paso tenga texto y clic, con prueba en `src/editor/model/compile-project.ts` y `tests/unit/editor/compile-project.test.ts`.
- [X] T065 Implementar inputs superpuestos y validación conjunta con Enter en `src/player/runtime.ts`.
- [X] T066 Estilizar los inputs sobre la imagen y ocultar el borde de la zona de Entrar en `src/player/player.css`.
- [X] T067 Agregar fixture y E2E de formulario en `src/fixtures/project-form.json`, `tests/e2e/player-form.spec.ts` y `tests/e2e/editor-form-preview.spec.ts`; ejecutar la regresión completa.

---

## Phase 10: Descarga SCORM provisional (2026-10-21)

**Purpose**: Permitir descargar el SCORM 1.2 desde el editor usando el exportador de la
feature 001, como avance de la feature 007.

- [X] T068 Implementar `exportEditorProject` y `downloadBytes` en `src/editor/model/export-scorm.ts`, reutilizando compilación, assets y bundle del reproductor.
- [X] T069 Agregar el botón de descarga, estados y errores en `src/editor/EditorPage.tsx` y `src/editor/editor.css`.
- [X] T070 Escribir la E2E de descarga, contenido del ZIP y rechazo de proyectos inválidos en `tests/e2e/editor-export.spec.ts`.
- [X] T071 Actualizar spec, checklist, quickstart, plan, tareas y `PROGRESS.md`; ejecutar la regresión completa.

---

## Phase 11: Ajuste de tamaño de letra (2026-10-21)

**Purpose**: Permitir que la persona usuaria reduzca o amplíe la letra escrita sobre la
captura sin cambiar el tamaño de la zona.

- [X] T072 [P] Agregar `fontSize` (10–100, 28 por defecto) a los esquemas del contrato y del documento, con pruebas en `src/contract/project-schema.ts`, `src/editor/model/editor-schema.ts` y `tests/unit/editor/editor-schema.test.ts`.
- [X] T073 Compilar `fontSize` en la acción de texto y aplicarlo en el runtime con prueba en `src/editor/model/compile-project.ts` y `tests/unit/editor/compile-project.test.ts`.
- [X] T074 Agregar el control de tamaño al panel de texto en `src/editor/components/PropertiesPanel.tsx` y los estilos en `src/editor/editor.css`.
- [X] T075 Actualizar fixture/E2E de formulario, documentación y `PROGRESS.md`; ejecutar la regresión completa en `tests/e2e/player-form.spec.ts` y `tests/e2e/editor-form-preview.spec.ts`.

---

## Phase 12: Corrección de `project.json` (2026-10-21)

**Purpose**: Evitar que el paquete SCORM incluya `undefined` en propiedades opcionales y
falle al importarse en el LMS.

- [X] T076 Corregir `stableJson` para omitir propiedades `undefined` y agregar la prueba de regresión en `src/exporter/create-scorm12-package.ts` y `tests/unit/exporter/create-scorm12-package.test.ts`.
- [X] T077 Limpiar opcionales en la compilación y verificar el `project.json` descargado desde el editor en `src/editor/model/compile-project.ts` y `tests/e2e/editor-export.spec.ts`.

---

## Phase 13: Lienzo ampliado y pantalla completa (2026-10-21)

**Purpose**: Aprovechar todo el ancho de la ventana y ofrecer pantalla completa para que una
captura de escritorio se vea más cercana a la realidad.

- [X] T078 Cambiar el reproductor a una sola columna, ampliar el viewport y reducir márgenes en `src/player/player.css`.
- [X] T079 Agregar el botón de pantalla completa y el manejo de rechazo en `src/player/runtime.ts`.
- [X] T080 Convertir el aviso de 1024×600 en recomendación y actualizar las pruebas en `src/player/runtime.ts` y `tests/e2e/player-accessibility.spec.ts`.
- [X] T081 Verificar el nuevo ancho en `tests/e2e/player-form.spec.ts`, actualizar documentación y ejecutar la regresión.

---

## Phase 14: Difuminado de datos sensibles (2026-10-21)

**Purpose**: Permitir anonimizar capturas con datos de clientes y que el SCORM solo reciba
la imagen procesada.

- [X] T082 Agregar esquema y reducer de redacciones por asset en `src/editor/model/editor-schema.ts` y `src/editor/model/editor-reducer.ts`.
- [X] T083 Implementar utilidades de redacción (`redactions.ts`, `redact-image.ts`) y las pruebas unitarias en `tests/unit/editor/redactions.test.ts`.
- [X] T084 Agregar herramienta y panel de difuminado en `CanvasStage.tsx`, `PropertiesPanel.tsx`, `EditorPage.tsx` y `editor.css`.
- [X] T085 Aplicar redacciones en vista previa y exportación, con confirmación de privacidad, en `PreviewDialog.tsx`, `export-scorm.ts` y `tests/e2e/editor-redaction.spec.ts`.

---

## Phase 15: Globo de ayuda en campos (2026-10-21)

- [X] T086 Mostrar un globo con placeholder o etiqueta al pasar el mouse o enfocar un campo superpuesto, con `aria-describedby`, en `src/player/runtime.ts`, `src/player/player.css` y `tests/e2e/player-form.spec.ts`.

---

## Phase 16: Respaldo editable .simpaso (2026-10-21)

- [X] T087 Implementar `createProjectBackup` con proyecto, originales, difuminados y advertencia en `src/editor/model/project-backup.ts`.
- [X] T088 Agregar el botón y la confirmación de respaldo en `src/editor/EditorPage.tsx`.
- [X] T089 Probar el respaldo y su contenido en `tests/unit/editor/project-backup.test.ts` y `tests/e2e/editor-backup.spec.ts`; actualizar documentación y regresión.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational.
- **US2 (Phase 4)**: depende de US1 (necesita el editor y el lienzo).
- **US3 (Phase 5)**: depende de US1; comparte `CanvasStage.tsx` y `PropertiesPanel.tsx` con US2, por lo que se recomienda ejecutarla después de US2.
- **US4 (Phase 6)**: depende de US1–US3; pule zoom, teclado e historial.
- **US5 (Phase 7)**: depende de US1–US3 y del runtime extraído; puede ejecutarse en paralelo con US4 si se coordinan archivos compartidos.
- **Polish (Phase 8)**: depende de todas las historias.
- **Mejora de formulario (Phase 9)**: depende de US3, US5 y del runtime; no cambia los proyectos existentes sin `formMode`.
- **Descarga SCORM (Phase 10)**: depende de la compilación y del bundle del reproductor; no incluye historial ni validaciones completas de la 007.
- **Tamaño de letra (Phase 11)**: depende de US3 y del runtime del formulario; usa 28 % por defecto y no rompe documentos sin `fontSize`.
- **Corrección JSON (Phase 12)**: depende del exportador y de la compilación; es un bugfix compatible, sin cambios de contrato.
- **Lienzo ampliado (Phase 13)**: depende del reproductor y del layout; no cambia el contrato ni el editor.
- **Difuminado y globos (Phases 14–15)**: dependen del editor, de la vista previa y del runtime; las redacciones se queman antes de empaquetar.

### User Story Dependencies

- **US1**: no depende de otras historias; es el MVP.
- **US2**: depende de US1 para abrir el editor y mostrar el lienzo; se prueba con un documento sembrado si es necesario.
- **US3**: depende de US1 y comparte archivos con US2; se prueba con zonas de texto sobre un paso existente.
- **US4**: depende de US1–US3 para tener elementos que mover y deshacer.
- **US5**: depende de US1–US3 para compilar y ejecutar el reproductor; no requiere exportación SCORM.

### Within Each User Story

- Las pruebas se escriben primero y deben fallar antes de la implementación.
- Modelo y funciones puras antes de los componentes.
- Componentes antes de la integración y de las pruebas E2E finales.
- Cada historia termina con su prueba independiente y su checkpoint.

### Parallel Opportunities

- Foundational: T002, T005, T007, T009, T011, T013, T015, T017 y T019 tocan archivos
  distintos y pueden escribirse en paralelo; las implementaciones dependen de su prueba.
- US1: T022 y T023 pueden escribirse en paralelo.
- US2: T030 y T031 pueden escribirse en paralelo.
- US3: T037 y T038 pueden escribirse en paralelo.
- US4: T043 y T044 pueden escribirse en paralelo.
- US5: T049 y T050 pueden escribirse en paralelo.
- Polish: T056, T057 y T058 pueden ejecutarse en paralelo antes de la suite completa.

---

## Parallel Example: Foundational

```text
Task: "Escribir pruebas del contrato en tests/contract/project-schema.test.ts"
Task: "Escribir pruebas del esquema editor-1 en tests/unit/editor/editor-schema.test.ts"
Task: "Escribir pruebas de geometría en tests/unit/editor/geometry.test.ts"
Task: "Escribir pruebas de reglas de imagen en tests/unit/editor/image-rules.test.ts"
Task: "Escribir pruebas del reducer en tests/unit/editor/editor-reducer.test.ts"
Task: "Escribir pruebas del repositorio en tests/unit/editor/editor-repository.test.ts"
```

## Parallel Example: User Story 1

```text
Task: "E2E de carga y pasos en tests/e2e/editor-upload-steps.spec.ts"
Task: "Integración de persistencia en tests/integration/editor-persistence.test.ts"
```

## Parallel Example: User Story 5

```text
Task: "Pruebas del puente de vista previa en tests/unit/editor/preview-bridge.test.ts"
Task: "E2E de vista previa en tests/e2e/editor-preview.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational).
2. Completar US1: editor, carga de capturas, pasos y persistencia.
3. Detenerse y validar US1 con pruebas unitarias, integración y E2E.
4. Demostrar la carga de capturas y la secuencia guardada.

### Incremental Delivery

1. US1 → cargar capturas y ordenar pasos.
2. US2 → zonas de clic y panel.
3. US3 → zonas de texto y validaciones.
4. US4 → zoom fino, teclado e historial.
5. US5 → vista previa con el reproductor.
6. Polish → red, accesibilidad, regresión y documentación.

Cada incremento debe dejar las pruebas anteriores en verde y no presentar como
disponibles las funciones de las features 004–008.

### Parallel Team Strategy

Con más de una persona, después de Foundational:

- Persona A: US1.
- Persona B: pruebas y modelo de US2/US3, coordinando `CanvasStage.tsx` y
  `PropertiesPanel.tsx` para evitar conflictos.
- Persona C: US5 (preview) sobre el runtime compartido, después de que US1–US3 estén
  integradas.

La historia US4 se reserva para después de US2/US3 porque depende de sus interacciones.

---

## Notes

- [P] significa archivos distintos y sin dependencia pendiente.
- No se agregan dependencias de ejecución; `fake-indexeddb` es solo de desarrollo.
- Las pruebas deben fallar antes de implementar (TDD).
- Los textos de la interfaz y los mensajes nuevos van en español (Chile).
- Usar solo capturas ficticias; no incluir datos ni imágenes de clientes.
- No se exporta SCORM desde la interfaz en esta feature; el exportador solo se verifica
  como regresión.
- No se crean commits automáticos; solo si la persona usuaria lo solicita.
- Al cerrar cada fase, actualizar `PROGRESS.md` con el resultado real de las pruebas.
