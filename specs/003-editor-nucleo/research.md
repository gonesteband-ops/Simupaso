# Investigación: Editor núcleo (feature 003)

**Feature**: `003-editor-nucleo` | **Fecha**: 2026-10-20
**Entrada**: [spec.md](./spec.md) y [plan.md](./plan.md)

Este documento resuelve las decisiones técnicas necesarias para implementar la carga de
capturas, la lista de pasos, el lienzo con zoom, las zonas de clic y texto, el panel de
propiedades, deshacer/rehacer y la vista previa. No se agregan dependencias de ejecución
nuevas; solo una dependencia de pruebas.

## Contexto existente

- La aplicación es React 19 + TypeScript 7 + Vite 8, con `base: "./"` y sin router.
- La feature 002 guarda la lista liviana de borradores en `localStorage`
  (`simupaso-studio-projects-v1`). Esa lista no contiene imágenes ni documentos completos.
- La feature 001 ya define el contrato Zod `projectSchema`, el reproductor vanilla
  TypeScript independiente (`src/player/`), el adaptador SCORM 1.2 y el exportador. El
  reproductor se compila con una configuración Vite separada y se empaqueta en
  `src/exporter/player-bundle.json`.
- El contrato actual exige al menos dos pasos y al menos una acción por paso; no tiene
  campos para pista ni mensajes por paso.
- El reproductor actual usa el DOM directamente y carga `project.json` por `fetch`.
  También crea el adaptador SCORM al iniciar.

## Decisiones

### D-001 — Persistencia del documento y de las imágenes en IndexedDB

**Decisión**: Mantener la lista de borradores de la feature 002 en `localStorage` y
guardar el documento del editor y los blobs de las capturas en IndexedDB, en una base
`simupaso-studio` versión 1 con dos almacenes:

- `editorProjects`: `{ id, document, updatedAt }`, clave `id`.
- `editorAssets`: `{ id, projectId, blob, mime, width, height, sizeBytes, name }`, clave
  `id` e índice `projectId`.

La escritura del documento y de los metadatos del borrador se coordina para que la lista
de proyectos y el editor no queden desalineados. Al eliminar un borrador se eliminan su
documento y sus assets en una sola transacción; si la limpieza falla, se informa el
problema y no se presenta como éxito.

**Razón**: `localStorage` tiene una cuota típica de pocos megabytes y almacena texto;
las capturas pueden llegar a 10 MB cada una. IndexedDB guarda `Blob` de forma nativa,
permite transacciones y tiene cuotas mucho mayores. Es una API del navegador, sin
servidor ni dependencia de ejecución.

**Alternativas consideradas**:

- Guardar imágenes como data URLs en `localStorage`: se descarta por cuota, memoria y
  costo de serialización.
- Usar Dexie o `idb`: añade una dependencia de ejecución sin ser necesaria para dos
  almacenes simples; se prefiere una capa tipada propia y pequeña.
- Migrar toda la lista de borradores a IndexedDB en esta feature: se descarta para no
  rehacer la feature 002 ni romper sus pruebas; la lista liviana sigue siendo suficiente.

**Evidencia**: MDN documenta IndexedDB como almacenamiento local orientado a objetos,
con transacciones y origen restringido, y advierte que las transacciones pueden abortarse
al cerrar el navegador; por eso el autoguardado se hace durante la edición y no en
`unload` (<https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB>).

### D-002 — Pruebas de IndexedDB con `fake-indexeddb`

**Decisión**: Agregar `fake-indexeddb` como dependencia **solo de desarrollo**, fijada en
la versión exacta que se instale (6.2.6 al momento de la investigación), y usarla en las
pruebas unitarias del repositorio de almacenamiento.

**Razón**: Vitest corre en Node y no ofrece IndexedDB. `fake-indexeddb` es una
implementación en memoria de la API, con tipos TypeScript, pensada para pruebas en Node.
Permite verificar apertura, transacciones, `put`, `get`, eliminación en cascada y errores
sin introducir código de servidor ni modificar el bundle de la aplicación.

**Alternativas consideradas**:

- Probar solo con un adaptador en memoria propio: no valida el uso real de transacciones
  ni la forma de los registros de IndexedDB.
- Probar solo con Playwright: cubre el camino feliz, pero no escenarios de error y
  cascadas de borrado con la precisión de una prueba unitaria.
- `jsdom` + polyfill: agrega más dependencias y no es necesario para probar la capa de
  almacenamiento.

**Evidencia**: El proyecto oficial describe `fake-indexeddb` como una implementación
pura en JavaScript, en memoria, de la API IndexedDB, cuyo uso principal es probar código
que depende de IndexedDB en Node.js, e indica `npm install --save-dev fake-indexeddb`
(<https://github.com/dumbmatter/fakeIndexedDB>).

### D-003 — Modelo del editor inmutable y historial de instantáneas

**Decisión**: Modelar el proyecto editable como un documento inmutable
(`EditorProject`) y aplicar los cambios con un reducer puro. El historial de
deshacer/rehacer guarda instantáneas del documento (sin blobs ni URLs) en dos pilas,
`past` y `future`. Una edición nueva limpia `future`. El historial vive solo en memoria y
se reinicia al cargar el proyecto. La selección, el zoom y el estado de guardado no
forman parte del historial.

**Razón**: Los documentos son pequeños (texto y geometría), por lo que las instantáneas
son simples y predecibles. Un reducer puro permite probar todas las operaciones sin
montar React y cumple el requisito de deshacer/rehacer de la sesión. No se agrega Zustand,
Immer ni otra librería de estado.

**Alternativas consideradas**:

- Parches incrementales (patches): más eficientes en memoria, pero más complejos y
  propensos a errores para esta escala.
- Historial con límite fijo: la especificación pide deshacer durante la sesión; las
  instantáneas son pequeñas y no se impone un límite arbitrario.
- Librería de estado externa: no aporta valor frente a `useReducer` para un único
  documento.

### D-004 — Lienzo con imagen y capa SVG normalizada

**Decisión**: Renderizar la captura en un `<img>` y superponer una capa SVG para las
zonas. Las zonas se guardan como rectángulos normalizados (0 a 1) respecto de las
dimensiones naturales de la imagen. El zoom y el paneo se aplican al contenedor de la
imagen y la capa SVG con una transformación CSS; para convertir eventos de puntero a
coordenadas normalizadas se usa el rectángulo visible de la imagen, no valores de
pantalla acumulados.

Se usa `pointerdown`/`pointermove`/`pointerup` con captura de puntero para dibujar y
redimensionar; `setPointerCapture` evita perder el gesto al salir del lienzo. La
herramienta de mano permite desplazar el lienzo. Las zonas se pueden crear, mover y
redimensionar con mouse o con el teclado y el panel numérico.

**Razón**: SVG es accesible, nítido a cualquier zoom y permite manejar rectángulos y
manijas sin canvas. Las coordenadas normalizadas son las mismas del contrato y evitan
desalineaciones al cambiar el tamaño de la ventana. Los eventos de puntero cubren mouse,
lápiz y táctil con un solo modelo; MDN los describe como disponibles ampliamente desde
julio de 2020 y recomienda `touch-action` para controlar gestos del navegador
(<https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events>).

**Alternativas consideradas**:

- Canvas 2D: buen rendimiento, pero peor accesibilidad, selección y edición de elementos.
- `<div>` absolutos: posible, pero menos preciso para manijas y superposiciones; SVG
  expresa mejor la geometría.
- Guardar coordenadas en píxeles de pantalla: se rompe con zoom y tamaño de ventana.

### D-005 — Vista previa con el mismo runtime del reproductor

**Decisión**: Extraer el runtime del reproductor a un módulo compartido
(`src/player/runtime.ts`) con una función de montaje que recibe:

- el proyecto validado,
- un resolvedor de URL de assets,
- un adaptador LMS opcional (el reproductor independiente pasa SCORM 1.2; la vista
  previa no pasa adaptador),
- el índice del paso inicial.

El reproductor independiente (`src/player/main.ts`) queda como arranque delgado que
carga y valida `project.json`, resuelve rutas locales y monta el runtime. La vista previa
se ejecuta en un iframe propio (`preview.html`, entrada adicional de Vite) que carga el
mismo runtime y el mismo CSS del reproductor. El editor y el iframe se comunican por
`postMessage` únicamente para entregar el proyecto compilado, el mapa de URLs de assets
(objetos `blob:`) y el paso inicial; el iframe avisa cuando está listo y valida de nuevo
el contrato antes de montar.

**Razón**: El iframe aísla los estilos globales del reproductor (que incluyen `:root`,
`body` y `*`) de los estilos del editor, reproduce mejor el contexto de un LMS y permite
usar el mismo código sin duplicarlo. La vista previa no crea el adaptador SCORM, por lo
que no reporta nada a un LMS. El bundle SCORM sigue siendo independiente del editor.

**Alternativas consideradas**:

- Montar el reproductor directamente en un contenedor React: los selectores globales y
  `body` del CSS del reproductor chocan con la aplicación; aislarlos exigiría reescribir
  todo el CSS o usar Shadow DOM, con más riesgo.
- Duplicar el reproductor para la vista previa: viola el requisito de usar el mismo
  reproductor exportado y garantiza divergencias.
- Usar el iframe con `srcdoc` y código inline: complica la carga de módulos y la
  validación; una entrada Vite real es más simple y verificable.

**Seguridad**: el iframe es del mismo origen y no carga contenido remoto. El editor
verifica `event.source` y `event.origin` antes de aceptar mensajes; el iframe verifica
que el mensaje provenga de su ventana padre y valida el proyecto con `projectSchema`
antes de usarlo. Los assets se pasan como URLs `blob:` creadas localmente.

### D-006 — Extensiones compatibles del contrato 1.0

**Decisión**: Extender el contrato existente sin cambiar `schemaVersion`:

- `stepSchema`: campos opcionales `hint`, `messages: { error?, success? }`.
- `informativeActionSchema`: campo opcional `buttonLabel`.
- `inputActionSchema`: campo opcional `messages: { error?, success? }` para mensajes
  propios de una zona de texto.
- Relajar `steps` de mínimo 2 a mínimo 1, porque un proyecto de un paso es válido para
  previsualizar; los proyectos que ya eran válidos siguen siéndolo.

El documento del editor usa un esquema propio (`editor-1`) que admite cero pasos y datos
incompletos. Para previsualizar se compila a `Project` y se valida con `projectSchema`;
no se guarda un contrato inválido en el paquete SCORM. Los campos nuevos son opcionales,
por lo que los paquetes y fixtures existentes siguen siendo válidos y el reproductor
mantiene sus valores por defecto.

**Razón**: La política de versiones del proyecto permite agregar campos opcionales dentro
de `1.x`. Un esquema separado para el borrador evita relajar el contrato del reproductor
más de lo necesario y permite representar pasos a medio crear.

**Alternativas consideradas**:

- Usar `projectSchema` para el documento del editor: rechazaría borradores de cero o un
  paso y obligaría a inventar acciones para guardar.
- Subir a `2.0`: innecesario; no hay cambio incompatible.
- Guardar mensajes solo en el editor sin llevarlos al contrato: la vista previa y el
  paquete no reflejarían lo configurado.

### D-007 — Una acción compilada por paso y agrupación de zonas

**Decisión**: En esta feature, un paso se compila a una secuencia de acciones con esta
regla:

- Si el paso es informativo: una acción `informative` con `text` (instrucción o título) y
  `buttonLabel` (Siguiente/Finalizar).
- Si el paso es interactivo: una acción `input` por cada zona de texto, en el orden en que
  aparecen en el panel, seguida de una acción `click` que agrupa todas las zonas de clic
  con `match` `any` o `all`. Si no hay zonas de texto, la acción de clic es la única; si
  no hay zonas de clic, las acciones de texto quedan solas.

**Razón**: Cubre el caso de uso principal del proyecto (usuario → contraseña → clic) sin
introducir un editor de secuencias completo. Las zonas de texto se ordenan en el panel y
las zonas de clic se agrupan porque el contrato expresa "una o todas" en una sola acción.
La secuencia de varios clics independientes y las ramificaciones quedan para features
posteriores.

**Alternativas consideradas**:

- Una acción por zona sin agrupar: rompería `match: any`, porque el reproductor exigiría
  completar todas las acciones en orden.
- Un editor de secuencia con reordenamiento de acciones: mayor alcance y UI no pedida en
  esta feature.
- Limitar a una zona por paso: no cumple el requisito de varias zonas válidas.

### D-008 — Carga de imágenes y límites

**Decisión**: Aceptar PNG, JPG y WebP de hasta 10 MB por archivo. Validar el tipo MIME y
el tamaño antes de leer la imagen; obtener las dimensiones con `createImageBitmap` usando
orientación EXIF (`imageOrientation: "from-image"`), con respaldo a un `Image` y
`decode()`. Ordenar los archivos por nombre con `Intl.Collator("es-CL", { numeric: true,
sensitivity: "base" })`. Guardar el blob original en IndexedDB y mostrar la imagen y la
miniatura con un `URL.createObjectURL`, revocado al desmontar o eliminar el asset. No se
redimensiona ni se comprime en esta feature.

**Razón**: El límite de 10 MB fue aclarado con la persona usuaria. El orden natural por
nombre evita que "captura-10" aparezca antes de "captura-2". `createImageBitmap` obtiene
dimensiones sin insertar la imagen en el DOM y maneja la orientación de fotos JPEG; el
respaldo cubre navegadores sin esa API. Guardar el original es necesario para que la
edición no destruya la captura y para el difuminado no destructivo de la feature 004.

**Alternativas consideradas**:

- Leer todas las imágenes como data URL: consume mucha memoria y duplica el tamaño en el
  documento.
- Comprimir o redimensionar al importar: pertenece a la gestión de imágenes de la feature
  008 y podría afectar la legibilidad.
- Orden alfabético simple: produce un orden incómodo con números.

### D-009 — Mensajes, pista y botón informativo en el reproductor

**Decisión**: El reproductor usará los mensajes configurados cuando existan:

- una zona de texto puede definir mensajes de error y éxito propios; si no, se usan los
  del paso; si tampoco, los mensajes actuales;
- una zona de clic usa los mensajes del paso para acierto y clic fuera de zona;
- un paso informativo usa `buttonLabel`; si no existe, conserva "Continuar".

La pista se guarda en el contrato, pero su presentación en el reproductor (botón "Ver
pista") corresponde a la feature 006, porque depende de los modos de práctica. En esta
feature se edita y se conserva para no perderla.

**Razón**: Evita que los campos configurados en el editor sean datos muertos y mantiene la
vista previa fiel al paquete. No se adelanta la experiencia de pistas ni la puntuación de
la feature 006.

### D-010 — Estructura de la vista del editor

**Decisión**: Añadir una vista de editor a pantalla completa con:

- barra superior: volver, nombre del proyecto, estado de guardado, deshacer/rehacer y
  vista previa;
- columna izquierda: pasos con miniatura, reordenamiento, duplicar, eliminar e insertar
  captura;
- centro: lienzo con herramientas, zoom, ajustar a pantalla, restablecer y una barra de
  estado de la selección;
- columna derecha: panel con pestañas Paso y Zonas, propiedades del paso o de la zona.

La barra lateral principal se colapsa a una franja angosta con botones accesibles cuando
el editor está abierto, para dar espacio al lienzo. El editor no se optimiza para móvil;
con menos de 1024 px se muestra un aviso de escritorio.

**Razón**: Sigue la distribución de la sección 10.1 y el estilo de la sección 17, y
mantiene la navegación disponible sin competir con el lienzo. No se introduce un router:
la vista se controla con el estado de la aplicación y un identificador de proyecto
abierto, coherente con la app actual.

### D-011 — Pruebas y verificación

**Decisión**:

- Unitarias con Vitest para geometría, reglas de imagen, reducer/historial, compilación al
  contrato, validaciones y repositorio IndexedDB con `fake-indexeddb`.
- Integración con Vitest para el ciclo guardar → cargar → eliminar documento y assets.
- E2E con Playwright para carga de capturas, pasos, dibujo y edición de zonas, teclado,
  deshacer/rehacer, persistencia tras recarga, alineación a distintos zooms, vista previa
  en iframe y ausencia de peticiones externas.
- Se mantienen las pruebas existentes de contrato, RUT, exportador, SCORM y tamaño del
  reproductor; cualquier cambio del contrato debe hacerlas pasar.

**Razón**: Cubre los comportamientos críticos de la feature y las pruebas obligatorias de
la constitución aplicables (contrato, texto/RUT y almacenamiento local). El puntaje no
corresponde a esta feature.

**Alternativas consideradas**:

- Añadir Testing Library: útil, pero no imprescindible; las pruebas puras y Playwright
  cubren el flujo sin otra dependencia.
- Probar IndexedDB solo con E2E: no permite simular fallos de transacción ni verificar la
  cascada de borrado con precisión.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cuota de IndexedDB agotada al cargar capturas | Validar 10 MB antes de guardar; capturar `QuotaExceededError`; no agregar el paso y explicar el problema; el medidor de espacio llega en la 007 |
| Pérdida de datos por cierre inesperado | Autoguardado con debounce; estado de guardado real; no prometer persistencia si IndexedDB falla |
| Desalineación de zonas por zoom o redimensión | Coordenadas normalizadas y conversión basada en el rectángulo visible de la imagen; prueba E2E con tolerancia de 1 CSS px |
| Divergencia entre vista previa y paquete | Mismo runtime y mismo CSS del reproductor; vista previa valida el contrato compilado |
| Estilos del reproductor contaminan el editor | Iframe aislado con `preview.html` |
| Objetos URL filtrados | Registro central de URLs por proyecto; revocación al cerrar el editor, eliminar un asset o desmontar la vista previa |
| Cambios de contrato rompen paquetes existentes | Campos nuevos opcionales; relajación de mínimo de pasos; pruebas de contrato y exportador |
| Capturas reales en pruebas | Fixtures sintéticos; se reutiliza la imagen ficticia existente o se generan bytes PNG de prueba |

## Conclusión

No quedan incógnitas de `NEEDS CLARIFICATION`. Las decisiones mantienen la arquitectura
sin backend, el contrato como fuente de verdad, el reproductor separado del editor y las
pruebas obligatorias. La implementación puede continuar con `data-model.md`,
`contracts/` y `quickstart.md`.
