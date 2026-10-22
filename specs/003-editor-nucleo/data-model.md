# Modelo de datos: Editor núcleo (feature 003)

**Feature**: `003-editor-nucleo` | **Fecha**: 2026-10-20
**Entrada**: [spec.md](./spec.md), [research.md](./research.md)

El editor usa dos representaciones complementarias:

1. **Documento del editor (`EditorProject`)**: estado editable, tolerante a proyectos
   incompletos, con esquema propio `editor-1`.
2. **Contrato del reproductor (`Project`)**: estructura validada de la feature 001,
   generada al previsualizar o exportar. No se persiste como documento de trabajo.

Además, la lista liviana de borradores de la feature 002 sigue en `localStorage` y los
blobs de las capturas viven en IndexedDB.

## 1. Documento del editor

### 1.1 `EditorProject`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `schemaVersion` | `"editor-1"` | Sí | Versión del documento editable; se migra explícitamente si cambia |
| `id` | string | Sí | Igual al `id` del borrador de la feature 002; 1–128 caracteres seguros |
| `meta` | `EditorMeta` | Sí | Metadatos del proyecto |
| `steps` | `EditorStep[]` | Sí | 0 o más pasos; el orden del arreglo es la secuencia |
| `completion` | `{ title, message }` | Sí | Textos de la pantalla final; valores por defecto si el trainer no los edita |

### 1.2 `EditorMeta`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `title` | string | Sí | Nombre visible; no vacío después de recortar |
| `client` | string | No | Cliente o rubro; texto seguro |
| `description` | string | No | Descripción corta; texto seguro |
| `author` | string | No | Autor; texto seguro |
| `language` | `"es-CL"` | Sí | Fijo en la v1 |
| `version` | string | Sí | Formato `x.y.z`; inicia en `1.0.0` |
| `createdAt` | ISO 8601 | Sí | Fecha de creación del borrador |
| `updatedAt` | ISO 8601 | Sí | Última modificación confirmada |

### 1.3 `EditorStep`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `id` | string | Sí | Único dentro del proyecto; 1–128 caracteres seguros |
| `title` | string | Sí | Valor por defecto `Paso N`; puede estar vacío durante la edición y la vista previa exige un título |
| `instruction` | string | Sí | Puede estar vacía durante la edición; la vista previa usa el título como respaldo |
| `hint` | string | No | Pista para el alumno; se conserva para la feature 006 |
| `assetId` | string | Sí | Debe existir en los assets del proyecto |
| `mode` | `"interactive"` \| `"informative"` | Sí | Por defecto `interactive` |
| `informativeButtonLabel` | string | No | Solo para informativos; por defecto `Siguiente` o `Finalizar` si es el último paso |
| `messages` | `{ error?, success? }` | No | Mensajes del paso para clic y respaldo de texto |
| `clickZones` | `ClickZone[]` | Sí | Puede estar vacío; orden de creación |
| `clickMatch` | `"any"` \| `"all"` | Sí | Por defecto `any`; aplica al grupo de clic |
| `textZones` | `TextZone[]` | Sí | Puede estar vacío; el orden del arreglo es el orden de las acciones de texto |

**Reglas del paso**:

- Un paso `informative` no requiere zonas. Si conserva zonas, no se compilan y el panel lo
  informa; al volver a `interactive` las zonas siguen disponibles.
- Un paso `interactive` necesita al menos una zona de texto o de clic para poder
  previsualizarse. Sin zonas, el editor lo guarda como borrador incompleto, pero la vista
  previa lo rechaza con un mensaje accionable.
- Los mensajes vacíos se normalizan a `undefined`; nunca se guardan cadenas de solo
  espacios.
- `instruction` vacía se muestra como el título en la vista previa, sin modificar el
  documento.

### 1.4 `ClickZone`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `id` | string | Sí | Único dentro del paso |
| `label` | string | No | Nombre para el panel; por defecto `Zona N` |
| `rect` | `Rect` | Sí | Normalizado y dentro de la imagen |

### 1.5 `TextZone`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `id` | string | Sí | Único dentro del paso |
| `rect` | `Rect` | Sí | Normalizado y dentro de la imagen |
| `label` | string | Sí | Etiqueta visible del campo; puede estar vacía durante la edición y la vista previa la exige |
| `placeholder` | string | No | Texto de ayuda dentro del campo |
| `masked` | boolean | Sí | Si es verdadero, el valor se oculta y no se persiste ni reporta |
| `validation` | `TextValidationConfig` | Sí | Ver 1.6 |
| `fontSize` | number | No | 10–100 % del alto de la zona; 28 % por defecto; define el tamaño de la letra del input superpuesto |
| `errorMessage` | string | No | Reemplaza el mensaje de error del paso para esta zona |
| `successMessage` | string | No | Reemplaza el mensaje de acierto del paso para esta zona |

### 1.6 `TextValidationConfig`

| `kind` | Campos adicionales | Regla |
|---|---|---|
| `non_empty` | ninguno | Cualquier valor no vacío es válido |
| `equals` | `expected: string` | El valor debe coincidir exactamente; puede estar vacío mientras se edita y la vista previa lo exige |
| `one_of` | `values: string[]` | El valor debe pertenecer a la lista; puede estar vacía mientras se edita, la vista previa exige al menos uno y las líneas vacías se descartan al compilar |
| `rut` | `normalize: boolean` | Valida RUT chileno y dígito verificador; por defecto `normalize: true` en el editor |

No se admiten expresiones regulares ni normalizaciones arbitrarias en esta feature. El
editor muestra los valores esperados como texto; no los interpreta como HTML.

### 1.7 `Rect`

| Campo | Tipo | Reglas |
|---|---|---|
| `x`, `y` | number | `0 ≤ x ≤ 1`, `0 ≤ y ≤ 1` |
| `w`, `h` | number | `> 0`; `x + w ≤ 1`, `y + h ≤ 1` |

Los rectángulos se guardan con precisión suficiente para que el redondeo a píxeles de
presentación no exceda 1 CSS px entre la zona y la imagen. Se permiten valores
fraccionarios; no se redondea a píxeles al persistir.

### 1.8 Asset del editor (`EditorAsset`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | string | Único en el proyecto; generado al importar |
| `projectId` | string | Igual a `EditorProject.id` |
| `blob` | `Blob` | Bytes originales de la captura; no se modifica |
| `mime` | `"image/png"` \| `"image/jpeg"` \| `"image/webp"` | Solo formatos aceptados |
| `width`, `height` | integer > 0 | Dimensiones naturales considerando orientación |
| `sizeBytes` | integer > 0 | Tamaño del blob; máximo 10 MB |
| `name` | string | Nombre original del archivo, solo para mostrar y ordenar |
| `createdAt` | ISO 8601 | Fecha de importación |

No se permite SVG en el editor de esta feature, aunque el contrato del reproductor lo
acepte para fixtures. Duplicar un paso reutiliza el mismo `assetId` y el mismo blob, sin
copiar la imagen; el contrato permite reutilizar un asset en varios pasos.

## 2. Estado de la interfaz

El estado de interfaz no se persiste con el documento ni entra en el historial:

| Campo | Tipo | Reglas |
|---|---|---|
| `activeStepId` | string \| null | Paso seleccionado; si se elimina, se elige el vecino |
| `activeZone` | `{ kind: "click" \| "text"; id }` \| null | Zona seleccionada; se limpia si desaparece |
| `tool` | `"select"` \| `"click"` \| `"text"` \| `"hand"` | Herramienta activa |
| `zoom` | number | Escala de presentación; mínimo 0.1, máximo 4 |
| `pan` | `{ x, y }` | Desplazamiento en píxeles de presentación |
| `saveState` | `"idle"` \| `"saving"` \| `"saved"` \| `"error"` | Refleja la última escritura confirmada |
| `preview` | `{ open, initialStepId }` | Estado de la vista previa |

`saving` se muestra al iniciar una escritura; `saved` solo después de que IndexedDB
confirme la transacción; `error` conserva el documento en memoria y muestra un mensaje.

## 3. Historial de edición

| Campo | Tipo | Reglas |
|---|---|---|
| `present` | `EditorProject` | Documento visible |
| `past` | `EditorProject[]` | Instantáneas anteriores; la última es la más reciente |
| `future` | `EditorProject[]` | Instantáneas rehacer; se limpia al editar |

- Cada acción que modifica el documento agrega `present` a `past` y genera un nuevo
  `present` inmutable.
- `undo` mueve el presente a `future` y restaura el último de `past`.
- `redo` mueve el presente a `past` y restaura el último de `future`.
- Cargar el proyecto deja `past` y `future` vacíos.
- La selección se valida después de cada undo/redo; si apunta a un elemento eliminado, se
  limpia.
- El historial no se guarda en IndexedDB y se pierde al recargar; el último estado
  guardado se conserva.

## 4. Persistencia local

### 4.1 `localStorage` (feature 002)

Se conserva `simupaso-studio-projects-v1` con la lista de `ProjectDraft`:

- `id`, `name`, `client?`, `industry?`, `description?`, `author?`, `createdAt`,
  `updatedAt`, `stepCount`, `status: "draft"`.

El editor actualiza `stepCount` y `updatedAt` después de guardar el documento. El nombre
del proyecto no se edita en esta feature; se mantiene el de la feature 002.

### 4.2 IndexedDB `simupaso-studio` versión 1

| Almacén | Clave | Índices | Contenido |
|---|---|---|---|
| `editorProjects` | `id` | ninguno | `{ id, document: EditorProject, updatedAt }` |
| `editorAssets` | `id` | `projectId` | `EditorAsset` |

Reglas:

- Abrir la base crea los almacenes en `onupgradeneeded`; si la versión del navegador es
  mayor que la esperada, se informa un error claro en lugar de degradar datos.
- Guardar un documento y actualizar la lista de borradores se hace en ese orden; si falla
  el documento, no se anuncia guardado ni se actualiza `updatedAt` como si hubiera
  funcionado.
- Importar una captura: primero se guarda el asset, luego el paso y el documento; si falla
  el guardado del asset, no se agrega el paso.
- Eliminar un borrador: se eliminan el documento y todos los assets del `projectId` en una
  transacción `readwrite`; después se quita de `localStorage`. Si la transacción falla, se
  informa y no se presenta como éxito. Si el borrador ya no existe, la operación es
  idempotente.
- Si IndexedDB no está disponible, el editor funciona en memoria, muestra una advertencia
  visible y no afirma que el trabajo sobreviva al cierre.

### 4.3 Objetos URL

- Se crea una URL por asset para la miniatura, el lienzo y la vista previa.
- Las URLs se guardan en un registro en memoria por proyecto y se revocan al cerrar el
  editor, al eliminar el asset o al cerrar la vista previa.
- Nunca se persisten URLs en el documento ni en IndexedDB.

## 5. Compilación al contrato del reproductor

Al previsualizar se genera un `Project` válido para `projectSchema`:

| Destino | Origen |
|---|---|
| `schemaVersion` | `"1.0"` |
| `id` | `EditorProject.id` |
| `meta.title` | `meta.title` |
| `meta.language` | `"es-CL"` |
| `meta.version` | `meta.version` o `"1.0.0"` |
| `meta.description` / `meta.author` | Campos opcionales del borrador |
| `settings` | `{ allowedModes: ["guided"], defaultMode: "guided" }` |
| `assets` | Un asset por captura usada, con `file: "assets/<id>.<ext>"`, `mime`, `width`, `height` |
| `steps` | Pasos en orden, con `title`, `instruction` (respaldo al título), `assetId`, `hint`, `messages`, `formMode` y `actions` |
| `completion` | `{ title, message }` del documento; valores por defecto si faltan |

**Acciones por paso**:

1. `informative`: `[{ type: "informative", text: instruction || title, buttonLabel }]`.
2. `interactive`:
   - una acción `input` por cada `TextZone`, en orden, con `fontSize` si la zona lo define;
   - después, si hay `clickZones`, una acción `click` con todos los rectángulos y
     `match: clickMatch`;
   - si no hay zonas, no se puede compilar para vista previa.

`formMode` se marca cuando el paso tiene al menos una zona de texto y una zona de clic. En
la vista previa, el reproductor muestra todos los campos de texto a la vez sobre la
captura y valida el conjunto al activar la zona de clic; no se guarda lo escrito. Los
proyectos sin `formMode` mantienen el flujo secuencial.

Los IDs de acciones se derivan de los IDs de zona para que sean estables y no colisionen
con los IDs de pasos.

**Validaciones previas a la vista previa**:

- Al menos un paso.
- Cada paso referencia un asset existente y soportado.
- Cada paso interactivo tiene al menos una zona.
- Cada zona de texto tiene etiqueta no vacía y una validación completa (`equals` con
  valor, `one_of` con al menos un valor).
- Los rectángulos están dentro de la imagen.
- El proyecto compilado pasa `projectSchema.safeParse`.

Si falla, se muestra una lista de problemas con el paso y la zona afectados; no se abre el
iframe.

## 6. Migraciones y compatibilidad

- `editor-1` es la primera versión del documento editable. Un documento de una versión
  mayor se rechaza con un mensaje claro.
- Los borradores de la feature 002 no tienen documento de editor; al abrirlos se crea un
  `EditorProject` vacío con los metadatos del borrador. La operación no modifica el
  borrador hasta el primer guardado.
- Los campos opcionales agregados al contrato (`hint`, `messages`, `buttonLabel`) no
  cambian `schemaVersion` y mantienen válidos los proyectos existentes.
- Las capturas originales se conservan; el difuminado futuro será una capa de datos y no
  modificará el blob.

## 7. Invariantes verificables

1. No existen dos pasos con el mismo `id` ni dos zonas con el mismo `id` dentro de un paso.
2. Todo `assetId` de un paso existe y pertenece al proyecto.
3. Todo `Rect` cumple `0 ≤ x`, `0 ≤ y`, `w > 0`, `h > 0`, `x + w ≤ 1`, `y + h ≤ 1`.
4. Todo asset tiene MIME permitido y tamaño ≤ 10 MB.
5. Un documento guardado puede leerse y validarse como `editor-1` después de recargar.
6. El `Project` compilado para vista previa pasa `projectSchema`.
7. Deshacer seguido de rehacer devuelve el documento al estado anterior, salvo que se haya
   editado en medio (lo que limpia `future`).
8. Al eliminar un borrador no quedan documentos ni assets huérfanos de ese `projectId`.
