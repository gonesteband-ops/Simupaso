# Contrato del proyecto SimuPaso (v1.0)

## Formato

El archivo `data/project.json` contiene un objeto JSON validado por el esquema versionado
del proyecto. La definición de Zod es la fuente de tipos/validación; JSON Schema se
deriva de ella y se comprueba para evitar drift.

## Forma mínima

```json
{
  "schemaVersion": "1.0",
  "id": "demo-procedimiento",
  "meta": {
    "title": "Procedimiento de demostración",
    "language": "es-CL",
    "version": "1.0.0"
  },
  "settings": {
    "allowedModes": ["guided"],
    "defaultMode": "guided"
  },
  "assets": [
    {
      "id": "captura-1",
      "file": "assets/crm-demo-1.svg",
      "mime": "image/svg+xml",
      "width": 800,
      "height": 600
    }
  ],
  "steps": [
    {
      "id": "paso-1",
      "title": "Abrir la sección",
      "instruction": "Selecciona la sección indicada.",
      "assetId": "captura-1",
      "actions": [
        {
          "id": "accion-1",
          "type": "click",
          "rects": [{ "x": 0.1, "y": 0.2, "w": 0.2, "h": 0.1 }]
        },
        {
          "id": "accion-2",
          "type": "input",
          "rect": { "x": 0.1, "y": 0.4, "w": 0.3, "h": 0.08 },
          "label": "Identificador ficticio",
          "validation": { "kind": "non_empty" }
        },
        {
          "id": "accion-3",
          "type": "informative",
          "text": "Revisa el resultado de demostración."
        }
      ],
      "annotations": []
    }
  ],
  "completion": {
    "title": "Simulación completada",
    "message": "Terminaste la demostración."
  }
}
```

El fixture real puede usar campos opcionales omitidos en este ejemplo. `annotations` se
reserva como datos JSON opcionales; esta versión del reproductor no lo interpreta ni lo
renderiza. El fixture no contiene datos de personas ni capturas de CRM.

## Validación

- `schemaVersion` debe ser `"1.0"`; una versión futura incompatible se rechaza con
  mensaje legible.
- Todos los ids y referencias deben ser válidos y únicos dentro de su colección.
- Las zonas usan números normalizados: `x`, `y` entre 0 y 1; `w`, `h` positivos;
  `x + w <= 1` y `y + h <= 1`.
- Validaciones de texto soportadas en 001: `non_empty`, `equals`, `one_of`, `rut`.
- `rut` valida dígito verificador; al habilitar normalización admite puntos y guion
  presentes o ausentes.
- Un input `masked: true` nunca tiene un valor prellenado o serializado.
- El texto se trata como texto, no como HTML.
