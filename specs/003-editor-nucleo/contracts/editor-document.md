# Contrato del documento del editor (`editor-1`)

**Feature**: `003-editor-nucleo` | **Estado**: Planificado

Este contrato define lo que el editor guarda en IndexedDB y las funciones que usan las
pruebas, la vista previa y, en el futuro, la exportación. El detalle de campos está en
[data-model.md](../data-model.md); aquí se fijan las interfaces y las garantías.

## 1. Formato persistido

`EditorProject` es serializable a JSON **sin blobs ni URLs**. Los blobs se guardan en el
almacén `editorAssets`, referenciados por `assetId`. Un registro de `editorProjects`:

```ts
type StoredEditorProject = {
  id: string;
  document: EditorProject;
  updatedAt: string; // ISO 8601
};
```

Un registro de `editorAssets`:

```ts
type StoredEditorAsset = {
  id: string;
  projectId: string;
  blob: Blob;
  mime: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
  name: string;
  createdAt: string;
};
```

### Garantías

- `document.id === id` y `document.schemaVersion === "editor-1"`.
- Todo `assetId` referenciado por un paso existe en `editorAssets` con el mismo
  `projectId`.
- No se guardan objetos URL, funciones, `File` ni `Blob` dentro de `document`.
- Los textos se guardan tal como los escribió el trainer; la interfaz los renderiza como
  texto y nunca como HTML.
- Los campos vacíos opcionales se guardan como `undefined`/ausentes, no como cadenas de
  espacios.

## 2. Interfaz del repositorio

```ts
interface EditorRepository {
  loadProject(projectId: string): Promise<EditorProject | null>;
  saveProject(document: EditorProject): Promise<void>;
  saveAsset(asset: StoredEditorAsset): Promise<void>;
  loadAssets(projectId: string): Promise<StoredEditorAsset[]>;
  deleteProjectData(projectId: string): Promise<void>;
}
```

### `loadProject`

- Devuelve `null` si no existe documento para el borrador.
- Lanza un error legible si IndexedDB no está disponible, la versión es incompatible o el
  registro está dañado.
- No crea documentos vacíos implícitamente; esa decisión es de la capa de la vista.

### `saveProject`

- Escribe el documento completo en una transacción `readwrite` sobre `editorProjects`.
- Solo resuelve después de `transaction.oncomplete`.
- Rechaza documentos cuyo `schemaVersion` no sea `editor-1` o que violen las invariantes
  del modelo.
- Un fallo de cuota (`QuotaExceededError`) se propaga con un mensaje que la interfaz pueda
  mostrar; no se marca como guardado.

### `saveAsset`

- Valida MIME, tamaño ≤ 10 MB y dimensiones positivas antes de escribir.
- Guarda el blob original; no lo transforma.
- Si el `id` ya existe para otro `projectId`, rechaza la operación.

### `loadAssets`

- Devuelve los assets del proyecto ordenados por `createdAt` y luego por `id`, para que la
  carga sea determinista.
- No crea objetos URL; eso corresponde a la capa de presentación.

### `deleteProjectData`

- Elimina el documento y todos los assets con `projectId` en una sola transacción.
- Es idempotente: si no hay registros, resuelve sin error.
- No elimina el registro de `localStorage`; esa coordinación la hace la capa de la app
  después de que la transacción confirme.

## 3. Compilación para vista previa

```ts
type EditorIssue = {
  stepId?: string;
  zoneId?: string;
  field: string;
  message: string;
};

type CompileResult =
  | { ok: true; project: Project }
  | { ok: false; issues: EditorIssue[] };

function compileEditorProject(
  document: EditorProject,
  assets: StoredEditorAsset[],
): CompileResult;
```

### Reglas

- `projectSchema.safeParse` es la última validación; si falla, se convierten los problemas
  de Zod en `EditorIssue` con mensajes en español.
- Los pasos se ordenan según el arreglo `steps`.
- Las zonas de texto generan acciones `input` en su orden; las de clic se agrupan en una
  acción `click` al final, con `match` del paso.
- Un paso informativo genera una única acción `informative` y no incluye zonas.
- `instruction` vacía se reemplaza por el título **solo en la copia compilada**; el
  documento no se modifica.
- Los assets se incluyen con `file` relativo seguro (`assets/<id>.<ext>`), pero la vista
  previa usa un mapa de URLs local; nunca se descarga nada.
- No se compilan anotaciones ni redacciones en esta feature.

### Errores bloqueantes de la compilación

| Condición | Mensaje esperado |
|---|---|
| Proyecto sin pasos | "Agrega al menos un paso para previsualizar." |
| Paso sin asset o asset inexistente | "El paso «X» no tiene una captura válida." |
| Paso interactivo sin zonas | "El paso «X» necesita una zona de clic o de texto." |
| Zona de texto sin etiqueta | "La zona de texto del paso «X» necesita una etiqueta." |
| `equals` sin valor | "Define el valor esperado de la zona «Y»." |
| `one_of` sin valores | "Agrega al menos un valor válido en la zona «Y»." |
| Rectángulo fuera de la imagen | "La zona «Y» debe quedar dentro de la captura." |

## 4. Compatibilidad y migraciones

- Un documento con `schemaVersion` distinto de `editor-1` se rechaza con un mensaje claro;
  no se intenta interpretar.
- Los borradores de la feature 002 no tienen documento; la app crea uno inicial con los
  metadatos del borrador y lo guarda en el primer cambio.
- Cualquier cambio futuro de forma del documento requiere una nueva versión `editor-2` y
  una migración explícita; no se agregan campos obligatorios sin migración.
- Este contrato no modifica el contrato del reproductor; la compilación usa
  `projectSchema` de la feature 001 con las extensiones documentadas en
  [project-contract-additions.md](./project-contract-additions.md).

## 5. Invariantes de seguridad y privacidad

- No se guarda lo que el alumno escriba en la vista previa. Las zonas enmascaradas no
  persisten valores y la vista previa no envía datos a ningún lado.
- No se guardan URLs remotas; solo blobs locales y rutas relativas seguras.
- Los textos del trainer se renderizan como texto; no se usa `innerHTML` con contenido del
  proyecto.
- El repositorio no realiza peticiones de red.
