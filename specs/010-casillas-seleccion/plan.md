# Plan: Casillas de selección (feature 010)

## Modelo

- `EditorCheckboxZone = { id, rect, label?, expected: boolean }`.
- `EditorStep.checkboxZones` se persiste en `editor-1`; los documentos sin el campo siguen
  siendo válidos.
- Contrato del reproductor: nueva acción `checkbox` con `items` (`id`, `rect`, `label?`,
  `expected`) y regla exacta. Es una adición compatible.
- El compilador emite una acción `checkbox` y, si hay zonas de clic, la acción `click` que
  actúa como botón de confirmación.

## Editor

- Herramienta **Casilla** en el lienzo, atajo de teclado y bloque por defecto para uso sin
  mouse.
- Panel de propiedades con pestaña **Casillas**: lista, etiqueta, estado esperado y
  coordenadas.
- Reutilizar geometría, selección, manijas, historial y accesibilidad existentes.
- Si el paso mezcla casillas y texto, la compilación bloquea con un mensaje claro.

## Reproductor

- Capa de casillas superpuestas: `<input type="checkbox">` transparente + marca visual.
- Estado local; cambiar no avanza.
- Al pulsar una zona de clic (o el botón de validación de respaldo) se comparan todos los
  estados esperados; si falla, mensaje y foco en la primera casilla incorrecta.
- Si acierta, se reutiliza el flujo de avance y la pantalla de finalización.
- La marca no se guarda en IndexedDB ni se reporta al LMS.

## Pruebas

- Unitarias: esquema, reducer, compilación y contrato.
- E2E: creación y configuración desde el editor, marcado/desmarcado con mouse y teclado,
  error por selección incorrecta, éxito, vista previa y exportación.
- Regresión completa y build.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mezcla con formularios | Error de compilación explícito y copy en el panel |
| Casillas pequeñas en capturas | Marca visual con halo y foco visible; permitir zoom del lienzo |
| Confusión con zonas de clic | Herramienta y color propios, estado esperado en el editor |
| Persistencia indebida | Solo estado local; sin guardar en documento del alumno |
