# Contrato del generador SCORM

## API de módulo

El core del generador es agnóstico de Node y de DOM y se puede invocar desde una prueba,
un comando adaptador o una futura UI:

```ts
type ProjectAsset = {
  id: string;
  file: string;
  mime: string;
  bytes: Uint8Array;
};

type ScormPackageInput = {
  project: Project;
  assets: ProjectAsset[];
  playerBundle: PlayerBundle;
};

type PlayerBundle = Array<{
  path: string;
  bytes: Uint8Array;
}>;

type ScormPackageOutput = {
  fileName: string;
  mimeType: "application/zip";
  bytes: Uint8Array;
};

function createScorm12Package(input: ScormPackageInput): ScormPackageOutput;
```

`Project` deriva del esquema único del contrato. `playerBundle` contiene todos los
archivos de la compilación independiente del player, incluidos HTML, JS, CSS y assets
locales referenciados. Su build Vite usa `base: './'` y produce paths relativos con `/`.
El empaquetador pone el HTML de entrada en la raíz, los demás archivos bajo `player/`
y reescribe de forma determinista las referencias en el HTML a `./player/<ruta>`; los
JS/CSS y las referencias internas entre chunks conservan los mismos bytes/estructura.
El CLI Node y la futura UI del navegador cargan la misma estructura desde
`src/exporter/player-bundle.json`; no hay variantes de build ni acceso a red durante la
generación.

La implementación rechaza proyectos inválidos, recursos ausentes, referencias de
player absolutas/remotas, paths con `\`, duplicados y cualquier path que resuelva fuera
de la raíz del ZIP. No accede a filesystem, reloj del sistema ni red.

## Requisitos reproducibles

- Normalizar y ordenar entradas por ruta relativa antes de comprimir.
- Fechas de ZIP, niveles/opciones de compresión y metadatos de manifiesto fijos.
- Igual input y misma versión bloqueada de dependencias producen exactamente los mismos
  bytes; una prueba compara `Uint8Array` byte por byte.
- Probar que `imsmanifest.xml` se parsea como XML sin `parsererror`, referencia un único
  SCO y declara todos los recursos necesarios.
- Inspeccionar cada path de la tabla central del ZIP y rechazar separadores `\`,
  absolutos, `.`/`..` y rutas remotas; todo path interno usa `/`.
- Sumar los tamaños comprimidos de `index.html` y `player/**/*`, excluyendo imágenes,
  `data/project.json` y `imsmanifest.xml`; el total debe ser menor que `250 * 1024`
  bytes.
- Nombrar el archivo `simulador-<slug>-v<version>.zip`; el slug deriva del título con
  reglas estables y seguras para nombre de archivo.
- El adaptador CLI lee el fixture sintético, llama a `createScorm12Package` y escribe
  el resultado a la ruta solicitada. Errores salen con código distinto de cero y
  mensaje explícito.

## Paquete

La raíz del ZIP contiene `imsmanifest.xml`, `index.html`, el bundle independiente del
player y `data/project.json`; imágenes en `assets/`. El manifiesto declara un solo SCO y
lista todos los recursos locales requeridos, con paths `/` relativos.
