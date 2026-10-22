# Investigación: Feature 001

Fecha: 2026-10-18

## Decisiones

### 1. Un módulo generador compartido entre Node y navegador

- **Decisión**: Mantener el core del empaquetador en TypeScript puro y sin acceso a
  filesystem ni red. Una función recibe el proyecto y los bytes de recursos y devuelve
  el ZIP como `Uint8Array`. Un adaptador Node lee el fixture y escribe el archivo; la
  aplicación podrá invocar el mismo core desde navegador en una feature posterior.
- **Racional**: Satisface ejecución por comando/prueba hoy y evita duplicar lógica al
  habilitar exportación en navegador. La separación mantiene fuera del SCORM todo código
  del editor y del adaptador de filesystem.
- **Alternativas**: Hacer el generador dependiente de Node (descartado porque bloquearía
  el uso futuro en navegador); construir el ZIP manualmente (descartado por fragilidad).

### 2. Zod como esquema ejecutable; JSON Schema derivado

- **Decisión**: Declarar el contrato y sus validaciones una vez con Zod, inferir tipos
  TypeScript desde esos esquemas y derivar JSON Schema como artefacto comprobable.
- **Racional**: Una sola fuente reduce discrepancias entre tipos estáticos y validación
  de datos importados. La documentación oficial consultada presenta Zod 4 y conversión
  a JSON Schema. La prueba de tamaño del player decidirá si se mantiene Zod.
- **Alternativas**: Mantener interfaces TypeScript y validadores independientes
  (duplicaría reglas); mantener JSON Schema y tipos separados manualmente (riesgo de
  drift).
- **Fuente**: [Zod JSON Schema](https://zod.dev/json-schema) (consulta 2026-10-18).

#### Alternativa de tamaño: Valibot

- **Condición**: El build de CI calcula el tamaño comprimido de todas las entradas del
  runtime player, excluyendo imágenes y contrato JSON. Si supera 250 KiB con Zod, el
  límite es bloqueante y se cambia el esquema de runtime a Valibot antes de aceptar el
  build.
- **Alternativa**: Valibot es modular, tree-shakeable, infiere tipos TypeScript y su
  documentación indica que el bundle puede comenzar bajo 700 bytes. La conversión a
  JSON Schema se ofrece mediante el paquete separado `@valibot/to-json-schema`; se
  verificará que el subconjunto de esquemas usado cubra el contrato.
- **Trade-off**: La documentación de Valibot indica que JSON Schema no es su formato
  nativo; la conversión agrega una dependencia de build, pero puede quedar fuera del
  runtime del SCORM. Medir el proyecto completo, no asumir el tamaño por cifras de
  marketing, antes de seleccionar el fallback.
- **Fuentes**: [Valibot Introduction](https://valibot.dev/guides/introduction/) y
  [Valibot JSON Schema](https://valibot.dev/guides/json-schema/) (consulta 2026-10-18).

### 3. `fflate` para producir el archivo ZIP

- **Decisión**: Usar `fflate` como dependencia local del generador, importando solo la
  operación ZIP necesaria. Mantener la librería fuera del bundle de runtime SCORM salvo
  que el reproductor requiera descompresión (no lo requiere).
- **Racional**: El README oficial describe la librería como JavaScript puro con soporte
  para Node.js y navegadores y documenta `zipSync`, `mtime` y opciones de compresión por
  entrada. Así comparte core sin adaptadores de plataforma; fijar versión, compresión,
  orden lexicográfico de paths, fecha ZIP y atributos permite comprobar que entradas
  iguales produzcan bytes idénticos.
- **Alternativas**: `JSZip` (API con promesas y mayor superficie para este caso);
  generador exclusivamente Node (incompatible con el uso futuro en browser).
- **Fuente**: [fflate README](https://github.com/101arrowz/fflate) (consulta 2026-10-18).

### 4. Reproductor independiente en TypeScript sin React

- **Decisión**: Usar un runtime DOM vanilla con punto de entrada y build separados del
  anfitrión React. El paquete SCORM incluye solo el HTML, CSS, JS, datos e imágenes
  necesarios del reproductor.
- **Racional**: Reduce acoplamiento y evita incluir pantallas de edición o dependencias
  del Studio en el paquete del alumno. La misma entrada se ejecuta en modo autónomo o
  con adaptador SCORM.
- **Alternativas**: Empaquetar la aplicación React completa (descartado por tamaño y
  acoplamiento); escribir dos reproductores (descartado por divergencia).

### 4a. Bundle compilado compartido por CLI Node y navegador

- **Decisión**: Compilar el player mediante una configuración Vite independiente, con
  `base: './'`, nombres de artefacto estables y salida en `dist/player/`. Un script de
  build lee los archivos generados, los ordena por ruta relativa `/` y produce
  `src/exporter/player-bundle.json` con paths y bytes codificados. El CLI Node y la
  futura UI importan el mismo JSON como estructura local `PlayerBundle` y la pasan al
  core puro del generador; ninguna de las dos rutas hace fetch ni resuelve archivos
  relativos en tiempo de ejecución.
- **Archivos incluidos**: `index.html`, chunks JS/CSS, y cualquier asset local realmente
  referenciado por el HTML/CSS; no se asume que un único JS representa todo el runtime.
  El ZIP instala el HTML de entrada en la raíz y los demás archivos bajo `player/`;
  ajusta de forma determinista las referencias del HTML raíz a `./player/<ruta>`, sin
  modificar los bytes de JS/CSS/chunks. Las referencias internas entre chunks y CSS
  conservan su estructura relativa bajo `player/`. El empaquetador valida que todas las
  referencias sean relativas, usen `/` y existan.
- **Racional**: Un artefacto de entrada explícito elimina diferencias por cwd o lectura
  de filesystem en navegador; ambos llamadores empaquetan los mismos bytes de una única
  compilación independiente y aplican la misma transformación de paths del HTML.
- **Alternativas**: empaquetar el build de Studio completo (incluye React/editor); hacer
  que el core genere rutas o lea disco (rompe reutilización en browser); intentar
  reconstruir player con distinto source desde cada entorno (riesgo de desvío).

### 5. SCORM Cloud para una validación pública, no como LMS corporativo

- **Decisión**: La persona usuaria eligió SCORM Cloud como plataforma de validación
  pública. Su página oficial ofrece una prueba gratuita; antes de importar hay que
  confirmar las condiciones efectivas de la cuenta. Enviar solo el ZIP sintético y
  registrar el nombre/versión del servicio. Si no existe acceso gratuito útil, detener
  la validación LMS y pedir decisión; no sustituirlo silenciosamente ni cargar capturas
  reales.
- **Racional**: La página oficial del producto lo presenta como plataforma para probar,
  reproducir y reportar contenido e indica “free trial”. La consulta del 2026-10-18
  confirma la oferta, pero no especifica límites ni acredita que se haya creado una
  cuenta o importado el paquete. No se afirma un nivel gratuito permanente ni
  compatibilidad hasta completar la prueba manual.
- **Alternativas**: declarar compatibilidad con el LMS corporativo, que aún no fue
  identificado ni está disponible; confiar solo en un API simulado, que no prueba el
  paquete importado en un LMS.
- **Fuentes oficiales**: [SCORM Cloud — Rustici Software](https://rusticisoftware.com/products/scorm-cloud/)
  y [formulario de prueba gratuita](https://cloud.scorm.com/sc/guest/SignUpForm)
  (consulta 2026-10-18).

### 6. Verificación en capas

- **Decisión**: Vitest cubre contratos/validadores, generador, ZIP byte-identical,
  paths ZIP con `/`, tamaño comprimido máximo de 250 KiB y API SCORM simulada. Playwright
  verifica que el manifiesto se parsea con `DOMParser` sin `parsererror`, que declara un
  SCO y que los recursos referenciados existen; también abre el player construido
  localmente y prueba dimensiones naturales, imagen sin deformación y alineación en
  1024×600, 1366×768, 1920×1080 y 2560×1440 con SVG y PNG, recorre acciones y registra
  solicitudes para detectar recursos externos. La importación en SCORM Cloud es una
  prueba manual separada, y la validación en el LMS corporativo sigue siendo obligatoria
  antes de cerrar la integración.
- **Racional**: Distingue corrección local repetible de compatibilidad observada en un
  servicio LMS concreto.
- **Alternativas**: solo test unitario (no observa navegación ni recursos del runtime);
  afirmar soporte LMS basándose solo en una API simulada (no aceptable según constitución).

## Notas de investigación

- La página oficial de SCORM Cloud indica que existe una prueba gratuita, pero no
  garantiza acceso indefinido ni especifica en esa página límites aplicables a este uso.
  La cuenta y condiciones se confirmarán antes de la importación.
- Pasar SCORM Cloud valida solo esa instancia/versión. No sustituye la prueba pendiente
  en el LMS corporativo, aun cuando el paquete haya superado los tests automatizados y
  sea SCORM 1.2. La integración se considera sin validar hasta completar también la
  prueba corporativa real y documentar los comportamientos de estado, ubicación, tiempo
  y apertura que forman parte de feature 001. Puntaje y reanudación quedan fuera de esta
  feature.
- La guía oficial de Valibot describe el tamaño inicial menor a 700 bytes, API modular y
  conversión JSON Schema por paquete separado; el tamaño del esquema real del player debe
  medirse en el build productivo.
- La referencia pública de SCORM Run-Time consultada fue
  [SCORM Run-Time Reference Guide](https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/).
  La especificación del proyecto ya define los elementos mínimos (`lesson_status`,
  `lesson_location`, `session_time`); su comportamiento se verificará contra un API
  simulado y el servicio real elegido.
- Las capturas de prueba son SVG y PNG ficticios. El paquete manual cargado al proveedor
  no tendrá contenido de CRM ni datos de personas.
- Las dependencias y versiones exactas se decidirán al implementar, se fijarán en el
  lockfile y no se cargarán desde CDN.
