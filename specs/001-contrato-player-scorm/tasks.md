# Tasks: Contrato, reproductor mínimo y exportación SCORM 1.2

**Input**: Documentos de diseño en `/specs/001-contrato-player-scorm/`
**Prerequisitos**: `plan.md`, `spec.md`, `research.md`, `data-model.md` y `contracts/`

**Organización**: Las tareas se agrupan por historia de usuario para que cada entrega
pueda verificarse de forma independiente. Las pruebas constitucionales y de aceptación
se incluyen aunque algunas funciones generales del producto pertenezcan a features
posteriores.

## Convenciones

- Cada tarea tiene ID secuencial y ruta concreta.
- `[P]` indica que puede ejecutarse en paralelo sin editar archivos compartidos ni
  depender de una tarea incompleta.
- `[US1]`, `[US2]` y `[US3]` corresponden a las historias de `spec.md`.
- Escribir primero las pruebas de cada historia y confirmar que fallan antes de
  implementar el comportamiento.
- No usar capturas reales, datos personales ni credenciales. Solo fixtures ficticios.

## Phase 1: Setup

**Propósito**: Crear la base de la aplicación estática y las herramientas de calidad.

- [X] T001 Inicializar React + TypeScript + Vite en la raíz, fijar una versión LTS de Node en `.nvmrc` y declarar el mismo rango en `package.json`; crear `index.html`, `src/main.tsx` y `src/app/App.tsx`.
- [X] T002 Configurar TypeScript estricto, alias de imports y scripts de `dev`, `build`, `typecheck` y `preview` en `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts` y `package.json`.
- [X] T003 Configurar Vitest y Playwright, sus scripts y directorios base en `vitest.config.ts`, `playwright.config.ts`, `tests/contract/`, `tests/unit/`, `tests/integration/` y `tests/e2e/`; instalar únicamente las dependencias aprobadas en `plan.md`.

## Phase 2: Fundamentos compartidos

**Propósito**: Fijar el contrato común y los datos ficticios que necesitan las tres
historias antes de construir el player o el empaquetador.

- [X] T004 [P] Escribir pruebas del esquema versionado, metadatos, recursos, pasos, acciones, referencias, límites de coordenadas y campo opcional reservado de anotaciones en `tests/contract/project-schema.test.ts`.
- [X] T005 Implementar tipos y esquema Zod como fuente común, rechazar versiones no soportadas y referencias/rectángulos inválidos, y exponer la representación JSON Schema prevista en `src/contract/project.ts`, `src/contract/project-schema.ts` y `src/contract/json-schema.ts`.
- [X] T006 [P] Crear el proyecto ficticio de dos pasos y recursos locales SVG y PNG con dimensiones naturales declaradas, incluyendo acciones de clic, texto e informativa, en `src/fixtures/project.json`, `src/fixtures/assets/login-demo.svg` y `src/fixtures/assets/search-demo.png`.

**Checkpoint**: TypeScript y los runners están operativos; el contrato valida el
fixture ficticio y este no contiene información real.

El puntaje y el almacenamiento local no se implementan en 001; sus pruebas
constitucionales corresponden a las features 006 y 002/007, tal como delimita el plan.

## Phase 3: User Story 1 — Generar un paquete mínimo de simulación (Priority: P1)

**Objetivo**: Producir desde una API reutilizable y un comando Node un ZIP SCORM 1.2
autocontenido, reproducible y con un manifiesto que declara un único SCO.

**Prueba independiente**: Entregar al core un proyecto válido, assets y un bundle
independiente sintético; verificar ZIP válido, rutas seguras, manifiesto completo,
determinismo y ejecución del comando sin dependencias de filesystem o red dentro del
core.

### Pruebas de User Story 1

- [X] T007 [P] [US1] Escribir pruebas del API puro del generador para aceptar un proyecto válido y rechazar contrato inválido, asset ausente, bundle remoto/absoluto, rutas duplicadas o traversal en `tests/unit/exporter/create-scorm12-package.test.ts`.
- [X] T008 [P] [US1] Escribir pruebas de ZIP determinista byte por byte y de rutas internas relativas con `/` (sin `\`, rutas absolutas, `.` ni `..`) en `tests/unit/exporter/zip-output.test.ts`.
- [X] T009 [P] [US1] Escribir prueba Playwright que extraiga el manifiesto generado y use `DOMParser` para rechazar `parsererror`, exigir un SCO y comprobar que todos los recursos declarados existen en `tests/e2e/package-manifest.spec.ts`.
- [X] T010 [P] [US1] Escribir prueba automática que sume los bytes comprimidos de `index.html` y `player/**/*` dentro del ZIP, excluya imágenes, `data/project.json` y `imsmanifest.xml`, y falle si el total es igual o superior a 250 KiB en `tests/unit/exporter/player-size.test.ts`.
- [X] T011 [P] [US1] Escribir prueba de integración del comando Node que genera un ZIP desde el fixture y un bundle sintético, valida el nombre `simulador-<slug>-v<version>.zip` y falla con código distinto de cero ante entradas inválidas en `tests/integration/export-fixture.test.ts`.

### Implementación de User Story 1

- [X] T012 [US1] Implementar `createScorm12Package` como core puro que recibe proyecto, assets, bundle y metadatos y devuelve bytes ZIP/MIME/nombre, sin filesystem, reloj ni red, en `src/exporter/create-scorm12-package.ts`.
- [X] T013 [US1] Construir `imsmanifest.xml` determinista con un único SCO, identificador estable y referencias relativas completas a todos los archivos incluidos en `src/exporter/manifest.ts`.
- [X] T014 [US1] Empaquetar con `fflate`, ordenar entradas, fijar fechas/opciones de compresión y validar paths de cada entrada; trasladar el HTML a la raíz y reescribir solo sus referencias de entrada a `./player/`, conservando las relaciones internas del bundle, en `src/exporter/create-scorm12-package.ts`.
- [X] T015 [US1] Implementar el adaptador CLI que carga el fixture, assets y la representación local `PlayerBundle`, invoca el core y escribe el ZIP solicitado; reportar errores explícitos con código no cero en `src/cli/export-fixture.ts`.
- [X] T016 [US1] Implementar validación de argumentos y errores explícitos del CLI con código de salida distinto de cero, según `tests/integration/export-fixture.test.ts`, en `src/cli/export-fixture.ts`.

**Checkpoint**: El core y el CLI generan un paquete reproducible a partir de un bundle
válido; las pruebas de formato, rutas, manifiesto y tamaño pasan con el bundle de prueba.

## Phase 4: User Story 2 — Completar acciones básicas en el reproductor (Priority: P1)

**Objetivo**: Permitir que el alumno complete interacciones de clic, texto e
informativas en español de Chile, guiado por un player separado de React/editor.

**Prueba independiente**: Ejecutar el fixture en el player compilado y comprobar
validaciones, retención de texto inválido, clic fuera de zona sin avance, accesibilidad,
privacidad, error de imagen y geometría en los cuatro viewports exigidos.

### Pruebas de User Story 2

- [X] T017 [P] [US2] Escribir pruebas unitarias de `non_empty`, `equals`, `one_of` y `rut`, incluidos dígito verificador correcto/incorrecto y entradas RUT con y sin puntos y guion cuando normalización está activa, en `tests/unit/contract/text-validation.test.ts`.
- [X] T018 [P] [US2] Escribir pruebas Playwright de acciones: clic válido, clic fuera de zona con mensaje no bloqueante sin avance, texto inválido conservado, texto válido, acción informativa y secuencia de dos pasos en `tests/e2e/player-actions.spec.ts`.
- [X] T019 [P] [US2] Escribir pruebas Playwright con PNG y SVG que comprueben dimensiones naturales, escalado sin deformación y alineación de zonas con tolerancia máxima de 1 CSS px en 1024×600, 1366×768, 1920×1080 y 2560×1440 en `tests/e2e/player-geometry.spec.ts`.
- [X] T020 [P] [US2] Escribir pruebas Playwright para imagen que no carga, aviso bajo 1024×600, navegación por teclado/foco visible, contraste de texto normal mínimo 4,5:1, contenido del proyecto tratado como texto y anotaciones ignoradas por el player en `tests/e2e/player-accessibility.spec.ts`.
- [X] T021 [P] [US2] Escribir pruebas de privacidad que comprueben contraseña enmascarada, descarte del valor al abandonar acción/paso y ausencia de entradas del alumno en almacenamiento o datos de salida del player en `tests/e2e/player-privacy.spec.ts`.
- [X] T022 [P] [US2] Escribir una prueba Playwright que falle ante cualquier solicitud de red externa al cargar y completar el reproductor con fixtures locales en `tests/e2e/player-network.spec.ts`.

### Implementación de User Story 2

- [X] T023 [US2] Crear la entrada HTML/TypeScript vanilla y la compilación Vite independiente del player con `base: './'`, sin importar React ni módulos del editor, en `src/player/index.html`, `src/player/main.ts` y `vite.player.config.ts`.
- [X] T024 [US2] Implementar validadores de texto discriminados por tipo, normalización de RUT y cálculo del dígito verificador chileno en `src/contract/text-validation.ts`.
- [X] T025 [US2] Implementar renderizado de pasos y acciones secuenciales, controles accesibles y mensajes en español de Chile; insertar textos únicamente como texto DOM e ignorar el campo reservado de anotaciones en `src/player/main.ts` y `src/player/player.css`.
- [X] T026 [US2] Implementar inputs simulados con `type="password"` cuando corresponda, conservar temporalmente solo el valor activo, descartarlo al abandonar el control/paso y no serializarlo ni persistirlo en `src/player/main.ts`.
- [X] T027 [US2] Implementar imagen con proporción natural y coordenadas normalizadas transformadas al rectángulo visible, con zonas alineadas tras escalado y letterboxing en `src/player/image-layout.ts` y `src/player/player.css`.
- [X] T028 [US2] Implementar feedback no bloqueante para clic fuera de zona, bloqueo de interacciones cuando falle la imagen, aviso claro bajo 1024×600, teclado, foco y anuncios accesibles en `src/player/main.ts` y `src/player/player.css`.
- [X] T029 [US2] Comprobar contraste mínimo WCAG AA de 4,5:1 para texto normal en los estilos y mensajes del player, ajustando los tokens locales si corresponde, en `src/player/player.css`.
- [X] T030 [US2] Compilar el player y generar `src/exporter/player-bundle.json` como colección ordenada de paths relativos y bytes de HTML/JS/CSS/assets locales, reutilizable por CLI y futura UI, mediante `scripts/build-player-bundle.ts` y `package.json`.

**Checkpoint**: El player funciona de forma independiente y offline con el fixture, y
las pruebas automatizadas validan geometría, interacción, seguridad de texto y
privacidad.

## Phase 5: User Story 3 — Validar el registro de finalización en una plataforma SCORM (Priority: P1)

**Objetivo**: Reportar el ciclo básico SCORM 1.2 sin transmitir datos ingresados y
mantener funcionamiento autónomo si no existe API LMS.

**Prueba independiente**: Con API simulada, verificar inicialización, estado,
ubicación, tiempo, commits, cierre y ausencia absoluta de entradas del alumno en
cualquier llamada; luego probar el ZIP ficticio en una plataforma web SCORM real.

### Pruebas de User Story 3

- [X] T031 [P] [US3] Escribir pruebas de API simulada que exijan orden de inicialización, estado `incomplete`, `lesson_location` por paso, `session_time`, estado final `completed`, commits, un solo `LMSFinish` y ausencia de cualquier valor escrito en todos los datos reportados en `tests/unit/scorm/scorm12-adapter.test.ts`.
- [X] T032 [P] [US3] Escribir prueba Playwright que complete el fixture sin API LMS y compruebe modo autónomo sin errores visibles ni llamadas SCORM en `tests/e2e/player-standalone.spec.ts`.

### Implementación de User Story 3

- [X] T033 [US3] Implementar descubrimiento acotado de `API` en la ventana contenedora y `opener`, envoltura SCORM 1.2 y modo autónomo sin error visible en `src/scorm/scorm12-adapter.ts`.
- [X] T034 [US3] Integrar el ciclo de vida con el player: `LMSInitialize("")`, `incomplete`, ubicación por id/posición del paso, tiempo en formato SCORM 1.2, commits, `completed` y `LMSFinish("")` una sola vez; consultar `LMSGetLastError` sin éxito simulado en `src/player/main.ts` y `src/scorm/scorm12-adapter.ts`.
- [X] T035 [US3] Ejecutar el ZIP ficticio en una plataforma web gratuita SCORM 1.2 solo después de verificar acceso/condiciones; registrar proveedor, versión, resultados de estado/ubicación/tiempo y limitaciones en `specs/001-contrato-player-scorm/quickstart.md`, sin subir capturas ni datos reales.
- [ ] T036 [US3] Importar y probar en el LMS corporativo real, documentar apertura y criterios de reporte aplicables cuando se disponga de LMS, versión y acceso; si no están disponibles, conservar el gate pendiente y no cerrar la integración ni declarar compatibilidad corporativa en `specs/001-contrato-player-scorm/quickstart.md`.

**Checkpoint**: El resultado de SCORM Cloud u otra plataforma gratuita se limita a la
plataforma y versión efectivamente probadas; nunca sustituye el gate del LMS corporativo.

## Phase 6: Integración y verificación final

**Propósito**: Verificar el artefacto completo y dejar instrucciones reproducibles.

- [X] T037 [P] Añadir prueba E2E del ZIP real creado con el bundle compilado del player: abrirlo en modo autónomo, completar los dos pasos y verificar recursos locales y ausencia de peticiones externas en `tests/e2e/scorm-package.spec.ts`.
- [X] T038 [P] Actualizar `specs/001-contrato-player-scorm/quickstart.md` con los comandos exactos de instalación, typecheck, build separado del player, generación del bundle, exportación Node y pruebas; documentar rutas relativas, archivos incluidos y el flujo común de bytes para Node y la futura UI.
- [X] T039 Ejecutar typecheck, pruebas Vitest, pruebas Playwright, build del player y build del proyecto según los scripts de `package.json`; resolver fallos de esta feature y registrar resultados antes de cerrar la implementación.

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Setup (Phase 1)**: sin dependencias; establece Vite, TypeScript y runners.
- **Fundamentos (Phase 2)**: depende de Setup y bloquea las historias; el esquema se
  valida antes de implementar el resto del contrato.
- **US1, US2 y US3**: dependen de los fundamentos y se ejecutan en el orden definido
  por los IDs. US1 puede probar su core con un bundle sintético. La integración E2E del
  paquete compilado se deja para T037 después de que US2 genere el bundle real.
- **US3**: requiere el player de US2 y el generador de US1 para la prueba integral.
- **Integración final**: requiere las tres historias; el LMS corporativo sigue siendo
  gate de cierre si la organización no ha proporcionado LMS, versión y acceso.

### Dependencias entre historias

- **US1 (P1)**: puede comenzar después de Phase 2; el core del generador es verificable
  de forma independiente con un bundle sintético.
- **US2 (P1)**: puede comenzar después de Phase 2; su player compilado alimenta la
  integración final del generador.
- **US3 (P1)**: depende de US2 para los eventos de sesión y de US1 para el paquete
  importable; no puede declararse validada por plataforma antes de la prueba manual.

### Oportunidades de paralelismo

- T004 y T006 pueden escribirse en paralelo después de Setup; T005 depende de T004.
- T007–T011 son pruebas separables del generador y pueden escribirse en paralelo.
- T017–T22 son suites separadas y pueden escribirse en paralelo una vez acordados los
  selectores/IDs del fixture.
- T031 y T032 pueden prepararse en paralelo; la integración depende de ambas.
- T038 puede documentarse en paralelo con la integración final cuando los comandos y
  paths estén confirmados; T039 se ejecuta al finalizar los cambios.

## Ejemplos de trabajo paralelo

### User Story 1

```text
En paralelo: T007 API del generador, T008 determinismo/rutas,
T009 manifiesto Playwright, T010 presupuesto comprimido y T011 CLI.
Luego: T012–T016 implementación y ejecución de sus pruebas.
```

### User Story 2

```text
En paralelo: T017 validadores, T018 acciones, T019 geometría, T020 accesibilidad,
T021 privacidad y T022 red externa.
Luego: T023–T030 implementación y compilación independiente.
```

### User Story 3

```text
En paralelo: T031 API SCORM simulada y T032 modo autónomo.
Luego: T033–T036 integración y validación documental/manual.
```

## Estrategia de implementación

1. Completar Setup y fundamentos; mantener los fixtures ficticios y validar el esquema.
2. Entregar US1 como primer incremento verificable con el core puro y bundle sintético.
3. Entregar US2 con pruebas primero; generar el bundle real e independiente del player.
4. Entregar US3 con API simulada antes de subir el paquete ficticio a la plataforma
   real seleccionada.
5. Ejecutar T037–T039. No afirmar compatibilidad con el LMS corporativo y conservar
   explícito el gate de T036 hasta verificarlo realmente.
