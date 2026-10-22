# Adiciones compatibles al contrato del proyecto (1.0)

**Feature**: `003-editor-nucleo` | **Estado**: Implementado

La feature 003 necesita representar pistas, mensajes configurados y el texto del botón de
un paso informativo. También necesita previsualizar proyectos de un solo paso. Estos
cambios son **aditivos y compatibles** con los paquetes ya generados; no cambian
`schemaVersion` ni la forma de los proyectos existentes.

## 1. Cambios en el esquema

### 1.1 `stepSchema`

Se agregan campos opcionales:

```ts
hint?: string;
messages?: {
  error?: string;
  success?: string;
};
```

- `hint` es la pista escrita por el trainer. En esta feature se guarda y se muestra en el
  panel; el botón "Ver pista" del reproductor pertenece a la feature 006.
- `messages.error` y `messages.success` se usan como retroalimentación del paso cuando
  existen. Si faltan, el reproductor conserva sus mensajes actuales.
- El objeto `messages` es estricto: solo admite `error` y `success`; las claves
  desconocidas se rechazan.

### 1.2 `informativeActionSchema`

Se agrega un campo opcional:

```ts
buttonLabel?: string;
```

- El editor lo usa para "Siguiente" o "Finalizar".
- Si falta, el reproductor conserva "Continuar".
- El texto se renderiza como texto seguro y no puede quedar vacío si se envía.

### 1.3 `inputActionSchema`

Se agrega un campo opcional:

```ts
messages?: {
  error?: string;
  success?: string;
};
fontSize?: number;
```

- `fontSize` es el tamaño de letra del input como porcentaje del alto de su rectángulo;
  admite 10–100 y usa 28 por defecto. El reproductor lo aplica en los campos superpuestos.
- Permite que una zona de texto tenga mensajes propios, como exige la especificación.
- Si faltan, se usan los del paso y luego los mensajes actuales del reproductor.
- El objeto es estricto, igual que el de paso.

### 1.4 Mínimo de pasos

`steps` pasa de `min(2)` a `min(1)`.

- Un proyecto de un paso es válido para la vista previa y no rompe ningún proyecto que ya
  era válido.
- El exportador y el fixture de dos pasos siguen funcionando sin cambios.
- Un proyecto sin pasos sigue siendo inválido para el reproductor; el editor lo permite
  como borrador y bloquea la vista previa.

### 1.5 `stepSchema.formMode`

Se agrega un campo opcional:

```ts
formMode?: boolean;
```

- Cuando es `true` y el paso tiene una secuencia de acciones `input` seguida de un `click`,
  el reproductor muestra todos los campos de texto simultáneamente, posicionados sobre sus
  rectángulos de la captura, y valida todos al activar la zona de clic.
- La zona de clic del formulario se renderiza sin borde ni fondo de guía; sigue siendo un
  botón accesible y conserva el foco visible.
- El editor lo activa automáticamente al compilar un paso que tiene al menos una zona de
  texto y una zona de clic. Los proyectos existentes sin el campo conservan el flujo
  secuencial de una acción a la vez.
- No se persisten los valores escritos por el alumno; los campos enmascarados se descartan.

### 1.7 Acción `checkbox`

Se agrega una acción compatible:

```ts
type CheckboxAction = {
  id: string;
  type: "checkbox";
  items: Array<{ id: string; rect: Rect; label?: string; expected: boolean }>;
  rule?: "exact";
};
```

- Se usa para pasos con casillas de selección; `expected` indica si cada casilla debe quedar marcada.
- El reproductor valida el conjunto exacto al pulsar la acción `click` del paso; si no hay clic, ofrece un botón de validación.
- Los paquetes que no usan el tipo siguen siendo válidos.

## 2. Comportamiento del reproductor

- Para una acción `input`, el mensaje de error usa, en orden: `action.messages.error`,
  mensaje específico del motivo (vacío, formato o RUT inválido), `step.messages.error` y
  mensaje genérico. Así el error de RUT no queda oculto por un mensaje genérico del paso.
- Para un acierto de texto, usa `action.messages.success`, luego `step.messages.success`,
  luego "¡Correcto!".
- Para una acción `click`, el acierto usa `step.messages.success` y el clic fuera de zona
  usa `step.messages.error`, con los textos actuales como respaldo.
- Para una acción `informative`, el botón usa `action.buttonLabel` o "Continuar".
- Con `formMode`, los campos se validan juntos; el primer error enfoca el campo
  correspondiente y los campos inválidos quedan marcados. Enter en cualquier campo envía el
  formulario, igual que la zona de clic.
- `hint` no se muestra en esta feature; no se inventa una interfaz de pista antes de la
  006.

## 3. Compatibilidad

| Elemento | Estado |
|---|---|
| Paquetes SCORM existentes | Válidos; no se regeneran |
| Fixture de dos pasos | Válido; no se modifica |
| JSON Schema exportado | Se regenera con los campos opcionales y `steps.minItems = 1` |
| Reproductor independiente | Compatible; los campos nuevos son opcionales |
| Exportador | Sin cambios de formato; el contrato se sigue validando |
| Vista previa | Compila al contrato extendido y lo valida antes de montar |
| Proyectos sin `formMode` | Conservan el flujo secuencial y el resaltado de zonas |

## 4. Pruebas exigidas

- El esquema acepta un proyecto de un paso con una acción válida.
- El esquema sigue rechazando cero pasos, acciones sin rectángulos y rectángulos fuera de
  la imagen.
- Los campos nuevos son opcionales y no alteran los proyectos existentes.
- El reproductor usa los mensajes configurados y cae en los valores por defecto cuando
  faltan.
- El botón informativo usa `buttonLabel` y mantiene "Continuar" si no existe.
- Un paso con `formMode` y acciones `input` + `click` monta los campos superpuestos, valida
  el conjunto y no persiste lo escrito.
- Un paso sin `formMode` conserva el flujo secuencial y el resaltado de zonas.
- Las pruebas del exportador y del fixture siguen pasando.
- El JSON Schema contiene las propiedades nuevas.

## 5. Lo que no cambia

- `schemaVersion` sigue siendo `"1.0"`.
- No se agregan anotaciones, redacciones, destinos entre pasos, distractores, scroll,
  selección, modos adicionales ni campos de puntaje.
- No se permite contenido remoto ni rutas absolutas.
- La política de versiones se mantiene: dentro de `1.x` solo se agregan campos opcionales;
  cualquier cambio incompatible exigirá `2.0` y migración.
