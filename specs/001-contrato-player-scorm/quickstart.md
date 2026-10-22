# Quickstart de desarrollo: Feature 001

Prerequisito: Node.js LTS y npm. Los comandos son el objetivo del proyecto; la
implementación añadirá los scripts en `package.json`.

```powershell
npm install
npm run typecheck
npm run build:player
npm run bundle:player
npm run test
npm run build
npm run package:demo -- --out .\dist\demo-scorm.zip
npm run test:e2e
```

## Cómo se incorpora el reproductor compilado al ZIP

1. `build:player` usa una configuración Vite independiente, `base: './'` y una salida
   dedicada `dist/player/`. No importa React ni el editor. El HTML compilado apunta a JS,
   CSS y recursos con rutas relativas; los nombres de salida son estables.
2. `bundle:player` recorre los archivos compilados, conserva sus rutas ZIP con `/`, los
   ordena de manera estable y genera `src/exporter/player-bundle.json` con cada ruta y
   sus bytes codificados. Incluye `index.html`, todos los chunks JS/CSS y cada asset
   local referenciado por el build. Esta lista es la entrada completa del player al
   empaquetador; no se incluyen archivos del editor.
3. El adaptador CLI de Node y una futura pantalla del navegador importan el mismo JSON
   generado. Ambos entregan idéntico `PlayerBundle` más proyecto/assets al generador
   puro; este no lee filesystem, DOM, URL ni reloj y produce los mismos paths y bytes
   para la misma entrada.
4. El ZIP instala el HTML como `index.html`, mantiene los JS/CSS y assets compilados
   bajo `player/`, y ajusta en el HTML raíz las referencias a `./player/<ruta>` de
   manera determinista; las referencias internas de chunks/CSS conservan sus rutas bajo
   `player/`. Agrega `imsmanifest.xml`, `data/project.json` y assets de simulación. Una
   validación falla si falta un target local o aparece un path absoluto, remoto o con
   `\`.

## Validación local

1. Las pruebas unitarias validan el esquema, las acciones, `non_empty`, `equals`,
   `one_of` y `rut` (dígito verificador y variantes con/sin puntos y guion).
2. La integración con API SCORM simulada verifica `incomplete`, `lesson_location`,
   `session_time`, `completed`, commit y finish, y que no se envíen valores de entrada.
3. La prueba de exportación verifica manifiesto XML bien formado, un solo SCO, paths
   relativos con `/` en todas las entradas ZIP, archivos locales, imágenes ficticias PNG
   y SVG, ZIP byte a byte determinista y suma de bytes comprimidos de `index.html` y
   runtime `player/**/*` < 250 KiB (imágenes, `data/project.json` y manifiesto
   excluidos). El límite se mide en los tamaños comprimidos registrados en la tabla
   central del ZIP; superarlo falla la prueba.
4. Playwright sirve localmente el bundle independiente, ejecuta el fixture en teclado y
   mouse, falla ante solicitudes externas y comprueba dimensiones naturales, imagen sin
   deformación y alineación de zonas a 1024×600, 1366×768, 1920×1080 y 2560×1440,
   comparando los rectángulos medidos con la geometría esperada con tolerancia máxima
   de 1 CSS px.
5. La persona usuaria seleccionó SCORM Cloud como plataforma pública de prueba. Su
   [página oficial](https://rusticisoftware.com/products/scorm-cloud/) ofrece una
   prueba gratuita y enlaza al [registro](https://cloud.scorm.com/sc/guest/SignUpForm);
   la página no especifica los límites efectivos de la cuenta. En el intento manual del
   2026-10-19, el primer intento fue rechazado con “The maximum number of courses
   for this account type has been reached.” Más tarde, la persona usuaria compartió
   que el curso `Consulta de demostración` se importó en SCORM Cloud (SCORM 1.2), abrió
   y funcionó correctamente de principio a fin; confirmó que todo estuvo OK, incluidos
   los resultados LMS solicitados de estado, ubicación y tiempo. Se considera validada
   esta ejecución en SCORM Cloud; no se infiere compatibilidad con otros LMS. Se usó
   únicamente el ZIP ficticio, sin capturas ni datos reales. La prueba en el LMS
   corporativo sigue siendo requisito independiente antes de cerrar la integración de
   feature 001, y debe documentarse cuando se identifique y haya acceso. Puntaje y
   reanudación se validarán en las features que los incorporen.

En caso de que el servicio de prueba exija un plan de pago o no esté disponible, no
subir datos alternativos ni afirmar compatibilidad: registrar el bloqueo y pedir una
decisión antes de contratar o cambiar de plataforma.

## Exclusiones de la feature

No se construye UI del editor, importación de capturas reales, IndexedDB, backups,
puntaje, reanudación ni acciones de scroll/selección. `npm run package:demo` es una
herramienta técnica de desarrollo, no la interfaz de exportación de trainers.
