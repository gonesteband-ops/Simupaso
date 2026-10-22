# Contrato de la vista previa (iframe y `postMessage`)

**Feature**: `003-editor-nucleo` | **Estado**: Planificado

La vista previa usa el mismo runtime del reproductor exportable, montado en un iframe del
mismo origen (`preview.html`). Este contrato define el intercambio mínimo entre el editor
y el iframe. No hay red externa ni almacenamiento en el iframe.

## 1. Ciclo de vida

1. El editor compila y valida el `Project` con `projectSchema`.
2. El editor crea un `<iframe>` con `src` a `preview.html` (relativo a la app) y un
   `title` accesible, por ejemplo "Vista previa del simulador".
3. El iframe carga el runtime y envía `simupaso:preview:ready` a `window.parent`.
4. El editor responde con `simupaso:preview:load` y el proyecto compilado, el mapa de URLs
   de assets y el índice del paso inicial.
5. El iframe valida de nuevo el proyecto, monta el reproductor en modo guiado y avisa
   `simupaso:preview:mounted` o `simupaso:preview:error`.
6. Al cerrar, el editor elimina el iframe y revoca las URLs de assets. El iframe no
   conserva datos.

Si el iframe no envía `ready` en 5 segundos, el editor muestra un error y permite cerrar.

## 2. Mensajes

Todos los mensajes son objetos JSON serializables con un campo `type`. El editor incluye
un `requestId` en `load`; el iframe lo devuelve en `mounted` y `error` para descartar
respuestas obsoletas.

### Editor → iframe

```ts
type PreviewLoadMessage = {
  type: "simupaso:preview:load";
  requestId: string;
  project: Project;                 // ya validado por el editor
  assets: Record<string, string>;   // assetId -> URL blob: local
  initialStepIndex: number;         // 0..steps.length-1
};
```

### Iframe → editor

```ts
type PreviewReadyMessage = {
  type: "simupaso:preview:ready";
};

type PreviewMountedMessage = {
  type: "simupaso:preview:mounted";
  requestId: string;
};

type PreviewErrorMessage = {
  type: "simupaso:preview:error";
  requestId: string;
  message: string;
};
```

No se aceptan otros tipos. Los mensajes desconocidos se ignoran.

## 3. Validación de origen y fuente

- El editor solo acepta mensajes cuyo `event.source` sea exactamente
  `iframe.contentWindow` y cuyo `event.origin` sea `window.location.origin`.
- El iframe solo acepta mensajes cuyo `event.source` sea `window.parent` y cuyo
  `event.origin` sea `window.location.origin`.
- El `requestId` debe coincidir con el último enviado; si no, se ignora.
- El iframe vuelve a validar `project` con `projectSchema` antes de montar; si falla,
  responde `error` y no muestra contenido parcial.
- El editor no acepta HTML ni scripts en los mensajes; solo datos del contrato.

## 4. Assets y objetos URL

- El editor crea una URL `blob:` por cada asset usado y la incluye en `assets`.
- El iframe usa esa URL para la imagen del paso; no llama a `fetch` ni a recursos remotos.
- Las URLs se revocan al cerrar la vista previa o al desmontar el editor.
- Si falta una URL para un asset del proyecto, el iframe responde `error` con un mensaje
  claro; no muestra una imagen rota silenciosa.

## 5. Modo de ejecución

- Solo modo guiado.
- Sin adaptador SCORM: no se llama a `LMSInitialize`, `LMSCommit`, `LMSFinish` ni a ninguna
  API de LMS.
- Sin puntaje, pistas automáticas, reanudación ni panel de simulador de LMS.
- La pantalla final usa `project.completion` y no reporta nada.
- El paso inicial puede ser cualquiera; el iframe no persiste la ubicación.
- La vista previa es una instantánea: si el trainer edita mientras está abierta, debe
  cerrarla y volver a abrirla para ver los cambios.

## 6. Presentación

- El iframe ocupa el área del diálogo o de la vista previa a pantalla completa, con un
  borde y fondo coherentes con el sistema visual.
- El `title` del iframe y el nombre del diálogo son accesibles.
- Al cerrar, el foco vuelve al botón "Vista previa" del editor.
- El iframe respeta `prefers-reduced-motion` mediante el CSS del reproductor.
- El iframe no modifica el historial del navegador ni la URL de la app.

## 7. Pruebas del contrato

- Un mensaje válido monta el reproductor en el paso solicitado.
- Un mensaje con `project` inválido produce `error` y no monta.
- Un mensaje de origen o fuente distinto se ignora.
- Un `requestId` obsoleto no cambia el estado del editor.
- No se realizan peticiones de red desde el iframe.
- Al cerrar se revocan las URLs y se libera el iframe.
