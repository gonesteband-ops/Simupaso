# Plan de implementación: Editor núcleo

**Branch**: `003-editor-nucleo` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](./spec.md)
**Entrada**: Especificación de la feature 003 en `specs/003-editor-nucleo/spec.md`

## Resumen

Convertir los borradores de la feature 002 en proyectos editables: cargar capturas
ficticias o reales del trainer en el navegador, crear un paso por imagen, ordenar la
secuencia, dibujar y editar zonas de clic y de texto sobre un lienzo con zoom, configurar
sus propiedades, deshacer/rehacer durante la sesión y previsualizar con el mismo
reproductor que se exportará. El documento editable se guarda localmente en IndexedDB
junto con los blobs de las capturas; la lista liviana de borradores de la 002 se conserva
en `localStorage`. La vista previa se ejecuta en un iframe aislado con el runtime del
reproductor en modo guiado y sin adaptador SCORM.

La entrega no incluye anotaciones, difuminado, scroll, selección, vínculos, distractores,
modos práctica/evaluación, puntaje, exportación desde la interfaz ni historial. Tampoco se
afirma compatibilidad con ningún LMS.

## Contexto técnico

**Lenguaje/versión**: TypeScript estricto, React 19, Vite 8, Node.js 24.13.1.
**Dependencias principales**: React, Zod, `fflate` (existentes). No se agregan dependencias
de ejecución.
**Almacenamiento**: `localStorage` para la lista de borradores de la 002; IndexedDB nativa
(`simupaso-studio`, versión 1) para documentos editables y blobs de capturas. Sin backend.
**Pruebas**: Vitest para geometría, reglas de imagen, reducer/historial, compilación al
contrato, validaciones y repositorio IndexedDB con `fake-indexeddb` (solo desarrollo);
Playwright para editor, persistencia, alineación, teclado, vista previa y red.
**Plataforma objetivo**: aplicación web estática en navegador; Chrome/Edge recientes,
Firefox reciente, Safari deseable con advertencias de almacenamiento; escritorio de al
menos 1024 px para el editor.
**Tipo de proyecto**: aplicación web frontend con módulos compartidos, reproductor
independiente y entrada adicional de vista previa.
**Objetivos de rendimiento**: edición fluida de 30 pasos con capturas de 1920×1080;
respuesta de selección y arrastre percibida como inmediata; primer paso de la vista previa
en menos de 2 s; sin duplicar imágenes en memoria más allá del blob y su URL de objeto.
**Restricciones**: sin backend, cuentas, telemetría, peticiones externas ni recursos
remotos; texto seguro; capturas y datos permanecen en el navegador; límite de 10 MB por
imagen; formatos PNG, JPG y WebP; español (Chile); contraste AA.
**Escala/alcance**: 0–30 pasos por proyecto en el objetivo de rendimiento; una captura por
paso; múltiples zonas de clic y una o más zonas de texto por paso; un proyecto puede tener
cero pasos como borrador y uno o más para previsualizar.

## Constitution Check

*GATE: debe pasar antes de la investigación de Fase 0 y repetirse después del diseño.*

| Principio / gate | Antes de la investigación | Después del diseño |
|---|---|---|
| I. Sin backend y procesamiento local | PASS: IndexedDB y blobs locales; no se agrega servidor ni cuentas | PASS: el editor, la vista previa y los assets usan solo APIs del navegador; sin red externa |
| II. Contrato versionado como fuente de verdad | PASS: se extiende el contrato 1.0 con campos opcionales y se compila el documento editable a `Project` | PASS: `compileEditorProject` valida con `projectSchema`; el documento `editor-1` tiene esquema y migración explícita |
| III. SCORM autocontenido y reproductor desacoplado | PASS: la vista previa reutiliza el runtime, pero el paquete SCORM no incluye el editor ni `preview.html` | PASS: el runtime se extrae a un módulo compartido; el bundle del reproductor sigue siendo independiente y sin recursos remotos |
| IV. Privacidad por defecto | PASS: no se guarda ni reporta lo que escribe el alumno; los campos enmascarados no persisten valores; la vista previa no usa adaptador LMS | PASS: los mensajes y el estado de la vista previa no contienen entradas del alumno; los originales quedan solo en IndexedDB local |
| V. Uso simple para trainers | PASS: flujo guiado por pasos, mensajes claros y valores por defecto | PASS: carga con arrastrar y soltar, herramientas con atajos, panel con pestañas, vista previa desde el paso actual y mensajes accionables |
| VI. Compatibilidad con LMS demostrada | PASS: esta feature no modifica el paquete ni declara compatibilidad | PASS: no se afirma compatibilidad; la validación del LMS corporativo sigue pendiente en la 001 |
| VII. Pruebas obligatorias | PASS: se cubren contrato, texto/RUT, almacenamiento local y regresión del exportador; el puntaje no pertenece a esta feature | PASS: pruebas unitarias, de integración y E2E planificadas; el exportador y el contrato se revalidan |
| VIII. Español (Chile), accesibilidad y contraste | PASS: textos en español, teclado, foco visible, `aria-live` y contraste AA | PASS: creación de zonas accesible por teclado, panel numérico, diálogos con foco y vista previa con título accesible |
| IX. Datos ficticios | PASS: fixtures sintéticos y ninguna captura real | PASS: quickstart y E2E usan solo la imagen ficticia existente o bytes PNG generados |
| X. Entregas pequeñas y verificables | PASS: alcance acotado a la sección 22, feature 003 | PASS: se difieren explícitamente las features 004–008; la entrega es demostrable con capturas, zonas y vista previa |

No hay violaciones constitucionales. La falta de pruebas de puntaje se debe a que el
puntaje pertenece a la feature 006; el almacenamiento local sí se prueba porque esta
feature lo introduce para el documento y los assets. La única dependencia nueva es de
desarrollo (`fake-indexeddb`) y no se distribuye.

## Estructura del proyecto

### Documentación de esta feature

```text
specs/003-editor-nucleo/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── editor-document.md
│   ├── preview-bridge.md
│   └── project-contract-additions.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # generado después por /speckit.tasks
```

### Código fuente (raíz del repositorio)

```text
preview.html                  # entrada Vite de la vista previa en iframe
src/
├── app/
│   ├── App.tsx               # navegación, borradores y entrada al editor
│   ├── storage.ts            # lista de borradores en localStorage (002)
│   └── styles.css            # tokens y estilos de la app
├── editor/
│   ├── EditorPage.tsx        # vista a pantalla completa del editor
│   ├── editor.css            # estilos del editor sobre los tokens existentes
│   ├── components/
│   │   ├── EditorHeader.tsx
│   │   ├── StepList.tsx
│   │   ├── CanvasStage.tsx
│   │   ├── PropertiesPanel.tsx
│   │   ├── ImageDropZone.tsx
│   │   └── PreviewDialog.tsx
│   ├── hooks/
│   │   └── useEditor.ts
│   ├── model/
│   │   ├── editor-types.ts
│   │   ├── editor-schema.ts
│   │   ├── editor-reducer.ts
│   │   ├── geometry.ts
│   │   ├── image-rules.ts
│   │   ├── image-ingest.ts
│   │   ├── preview-message.ts
│   │   └── compile-project.ts
│   └── storage/
│       ├── indexeddb.ts
│       └── editor-repository.ts
├── preview/
│   └── main.ts               # arranque del iframe; escucha postMessage
├── player/
│   ├── main.ts               # arranque independiente; carga project.json y SCORM
│   ├── runtime.ts            # runtime compartido y montaje del reproductor
│   ├── player.css
│   └── image-layout.ts
├── contract/                 # contrato Zod y validaciones existentes
├── exporter/                 # exportador existente
└── scorm/                    # adaptador existente
tests/
├── unit/
│   ├── editor/
│   │   ├── editor-schema.test.ts
│   │   ├── geometry.test.ts
│   │   ├── image-rules.test.ts
│   │   ├── editor-reducer.test.ts
│   │   ├── history.test.ts
│   │   ├── click-zones.test.ts
│   │   ├── text-zones.test.ts
│   │   ├── preview-bridge.test.ts
│   │   ├── compile-project.test.ts
│   │   └── editor-repository.test.ts
│   ├── app/storage.test.ts   # regresión 002
│   └── contract/             # contrato y RUT existentes
├── integration/
│   └── editor-persistence.test.ts
└── e2e/
    ├── editor-upload-steps.spec.ts
    ├── editor-zones.spec.ts
    ├── editor-text-zones.spec.ts
    ├── editor-keyboard-history.spec.ts
    ├── editor-preview.spec.ts
    ├── editor-network.spec.ts
    ├── editor-accessibility.spec.ts
    └── (pruebas existentes del reproductor y SCORM)
```

**Decisión de estructura**: se mantiene un único proyecto Vite/React/TypeScript. El editor
se separa en `src/editor/` con un modelo puro (testeable sin DOM), una capa de IndexedDB y
componentes de React. El runtime del reproductor se extrae a `src/player/runtime.ts`; el
arranque independiente y el iframe de vista previa comparten ese módulo, pero el bundle
SCORM no importa código del editor. `preview.html` es una entrada adicional de Vite para
la aplicación; no se incluye en el paquete SCORM.

## Fase 0: investigación

Resultados en [research.md](./research.md):

- IndexedDB nativa para documento y blobs, con la lista de borradores de 002 en
  `localStorage`.
- `fake-indexeddb` solo para pruebas de almacenamiento.
- Reducer puro con historial de instantáneas en memoria.
- Lienzo con `<img>` + SVG y coordenadas normalizadas; eventos de puntero con captura.
- Vista previa en iframe aislado con el mismo runtime del reproductor y `postMessage`.
- Extensiones opcionales del contrato 1.0 y relajación de mínimo de pasos.
- Carga de imágenes con validación de MIME/tamaño y orden natural por nombre.
- Mensajes y botón informativo usados por el reproductor; pista almacenada para la 006.
- Pruebas unitarias, de integración y E2E descritas.

No quedan incógnitas pendientes.

## Fase 1: diseño y contratos

- [data-model.md](./data-model.md): documento `editor-1`, `EditorStep`, zonas, assets,
  estado de interfaz, historial, esquema de IndexedDB, compilación y migraciones.
- [contracts/editor-document.md](./contracts/editor-document.md): interfaz del repositorio
  y de la compilación; invariantes y errores.
- [contracts/preview-bridge.md](./contracts/preview-bridge.md): protocolo `postMessage`,
  validación de origen, assets y modo de ejecución.
- [contracts/project-contract-additions.md](./contracts/project-contract-additions.md):
  campos opcionales (`hint`, `messages`, `buttonLabel`) y `steps.min(1)`, compatibles con
  la versión 1.0.
- [quickstart.md](./quickstart.md): instalación, comandos, recorrido manual, cobertura y
  limitaciones.

## Enfoque de implementación

1. **Contrato y esquema**: agregar los campos opcionales y la relajación de pasos con
   pruebas primero; regenerar el JSON Schema; verificar que fixture, exportador y
   reproductor sigan pasando.
2. **Modelo puro**: tipos `editor-1`, esquema, reducer, historial, geometría, reglas de
   imagen y compilación; pruebas unitarias antes de la UI.
3. **Almacenamiento**: IndexedDB nativa y repositorio con `fake-indexeddb`; apertura,
   guardado, carga, error de cuota y borrado en cascada.
4. **Editor: pasos y capturas**: vista a pantalla completa, carga múltiple, orden natural,
   miniaturas, reordenamiento, duplicado, eliminación e inserción de capturas.
5. **Editor: lienzo y zonas**: herramientas de selección, clic y texto; dibujo con puntero;
   movimiento y redimensión con manijas; coordenadas numéricas; zoom, ajuste y paneo;
   panel de propiedades; atajos y accesibilidad por teclado.
6. **Deshacer/rehacer y autoguardado**: integración del reducer con la UI, indicador real de
   guardado, debounce y recuperación al abrir.
7. **Vista previa**: extraer el runtime, adaptar el arranque independiente, crear
   `preview.html`, el diálogo y el puente `postMessage`; compilar y validar el contrato.
8. **Integración y regresión**: sincronizar la lista de borradores, borrado en cascada,
   pruebas E2E de alineación, persistencia, teclado, red y vista previa; ejecutar toda la
   suite y el build.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos por cuota o IndexedDB bloqueada | Validar 10 MB, capturar `QuotaExceededError`, estado de guardado honesto y modo en memoria con aviso |
| Desalineación por zoom o tamaño de ventana | Coordenadas normalizadas, conversión desde el rectángulo visible de la imagen y prueba E2E de 1 CSS px |
| Divergencia entre vista previa y paquete | Mismo runtime y CSS; validación del contrato compilado; sin adaptador SCORM en preview |
| Estilos globales del reproductor | Iframe aislado con `preview.html` |
| Fugas de objetos URL | Registro central, revocación al cerrar/eliminar y pruebas de ciclo de vida |
| Cambios de contrato rompen paquetes | Campos opcionales, mínimo de pasos relajado y regresión completa del exportador |
| Capturas reales en pruebas | Solo fixtures ficticios o bytes PNG generados |
| Complejidad del lienzo | Modelo puro y pruebas de geometría antes de la interacción; alcance acotado a clic, texto e informativo |

## Seguimiento de complejidad

No se requieren excepciones a la constitución. Las decisiones que agregan complejidad
tienen justificación acotada:

| Decisión | Motivo | Alternativa rechazada |
|---|---|---|
| `fake-indexeddb` como dependencia de desarrollo | Probar transacciones, errores y borrado en cascada en Vitest sin navegador | Probar solo con E2E, que no cubre fallos ni cascadas con precisión |
| Iframe para la vista previa | Aislar el CSS global del reproductor y reproducir el contexto del paquete | Montar el reproductor en el DOM del editor con riesgo de colisiones de estilos |
| Esquema `editor-1` separado del contrato | Permitir borradores incompletos sin debilitar la validación del reproductor | Usar `projectSchema` para el documento, que rechazaría proyectos en construcción |
| Una acción de clic agrupada | Respetar `match: any/all` del contrato y cubrir el caso usuario → contraseña → clic | Una acción por zona, que exigiría completar todas las acciones en orden |

## Verificación posterior al diseño

- Se releyó la constitución: los diez principios siguen cumpliéndose.
- El editor y la vista previa no agregan red externa; los blobs y documentos son locales.
- El contrato se valida antes de la vista previa y antes de exportar; los campos nuevos son
  opcionales.
- No se reporta ni persiste lo que escribe el alumno; los campos enmascarados no guardan
  valores.
- Las pruebas obligatorias aplicables están cubiertas: contrato, validaciones de texto y
  RUT, almacenamiento local y regresión del exportador; el puntaje se difiere a la 006.
- El idioma, la accesibilidad, el contraste AA y los datos ficticios están contemplados en
  requisitos, quickstart y pruebas.
- La compatibilidad con el LMS corporativo no se declara; el gate de la 001 sigue abierto.

## Mejora posterior: formulario realista (2026-10-21)

Tras probar la feature, la persona usuaria pidió que el RUT y la contraseña se escriban
sobre la propia captura, no en una barra inferior. Se agregó `formMode` opcional al
contrato del paso: cuando un paso tiene zonas de texto y una zona de clic, el runtime
superpone todos los inputs en sus rectángulos, los valida juntos al activar la zona de clic
y oculta el borde de guía de ese botón. Enter envía el formulario. Los paquetes y fixtures
sin `formMode` mantienen el flujo secuencial y no requieren migración. Se añadieron el
fixture `project-form.json`, la E2E `player-form.spec.ts` y la E2E de editor
`editor-form-preview.spec.ts`; la suite y el build se volvieron a ejecutar.

## Descarga SCORM provisional (2026-10-21)

La persona usuaria necesitaba descargar el paquete antes de la feature 007. Se agregó
`src/editor/model/export-scorm.ts`, que compila y valida el documento con
`compileEditorProject`, convierte los blobs de las capturas a bytes, decodifica el bundle
del reproductor y llama a `createScorm12Package`. El editor ofrece **Descargar SCORM 1.2**,
muestra problemas y no descarga paquetes inválidos. El historial de exportaciones,
snapshots y la validación previa completa siguen en la 007. La E2E
`editor-export.spec.ts` comprueba el ZIP, el manifiesto, el proyecto, el reproductor y el
rechazo de un proyecto vacío.

## Ajuste del tamaño de letra (2026-10-21)

La persona usuaria detectó que el texto de los campos superpuestos era demasiado grande.
Se agregó `fontSize` opcional a la zona de texto y a la acción `input`: porcentaje del alto
de la zona, rango 10–100, valor inicial 28. El panel de propiedades permite editarlo y el
runtime calcula la letra a partir del alto natural de la captura, por lo que el tamaño se
mantiene coherente con el zoom. Los proyectos sin el campo usan 28 % y siguen siendo
válidos.

## Lienzo ampliado y pantalla completa (2026-10-21)

Las capturas del proyecto de prueba son de 1919×1028. El reproductor reservaba una columna
lateral de 17–21 rem aunque el área de acciones estuviera vacía, reduciendo la captura a
~35 %. Se cambió la tarjeta a una columna, se amplió el viewport (`82vh`, máximo 64 rem), se
redujeron márgenes y se agregó un botón de pantalla completa con manejo de rechazo del
navegador/LMS. El aviso de 1024×600 pasó a recomendación. No se agregó el modo 100 % con
scroll; sigue como posible mejora si se necesita tamaño real exacto.

## Difuminado y globos de ayuda (2026-10-21)

La persona usuaria necesitaba anonimizar capturas con datos de clientes y leer la ayuda de
los campos. Se agregó una capa de redacciones por asset (`redactions`) con estilos
`solid`, `blur` y `pixelate`, editable en el panel **Difuminado** y en el lienzo con la
herramienta B. Las redacciones son datos del proyecto; al previsualizar o exportar se aplican
en Canvas a una copia de la imagen, de modo que el SCORM no contiene los píxeles originales.
El original permanece en IndexedDB. Antes de exportar se exige confirmar que se revisaron los
datos personales. Además, los campos superpuestos muestran un globo con su placeholder o
etiqueta al pasar el mouse o enfocar, con `aria-describedby`.

## Respaldo editable `.simpaso` (2026-10-21)

Se agregó un segundo botón **Descargar respaldo** independiente del SCORM. Genera un ZIP
`.simpaso` con `backup.json` (documento `editor-1`), las capturas **originales** y los
rectángulos de difuminado, más un `LEEME.txt`. Antes de descargar se advierte que contiene
imágenes sin difuminar y se exige confirmación. El respaldo no se incluye en el SCORM. La
importación del respaldo queda pendiente para una siguiente entrega.

## Definición de terminado

1. `npm run typecheck`, `npm test`, `npm run test:e2e` y `npm run build` pasan.
2. Un trainer puede crear un borrador, abrirlo, cargar varias capturas, reordenar pasos,
   dibujar zonas de clic y texto, editar sus propiedades, deshacer/rehacer, recargar sin
   perder el trabajo y previsualizar en modo guiado.
3. Las zonas permanecen alineadas con la captura en los zooms probados, con tolerancia de
   1 CSS px.
4. La vista previa usa el mismo runtime del reproductor, no crea adaptador SCORM y no
   realiza peticiones de red externas.
5. La lista de borradores y el documento local quedan sincronizados; eliminar un borrador
   limpia documento y assets.
6. No quedan funciones de las features 004–008 presentadas como disponibles.
7. `PROGRESS.md` registra decisiones, resultados de pruebas y próximo paso.
