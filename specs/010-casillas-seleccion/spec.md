# Especificación: Casillas de selección (feature 010)

**Fecha**: 2026-10-21 | **Estado**: Implementación aprobada

## Historia de usuario

Como trainer, quiero simular casillas de verificación de un CRM para que el alumno marque
una o varias casillas y luego confirme con el botón de la pantalla, como en el sistema real.

**Prueba independiente**: Crear un paso con dos casillas, marcar la correcta, dejar la otra
sin marcar, pulsar el botón y completar; repetir con una selección incorrecta y comprobar
que no avanza y se explica el error.

## Requisitos funcionales

- **FR-001**: El editor MUST ofrecer una herramienta **Casilla** para dibujar zonas sobre
  checkboxes de la captura.
- **FR-002**: Cada casilla MUST tener un estado esperado (marcada o desmarcada), editable en
  el panel de propiedades.
- **FR-003**: El editor MUST permitir mover, redimensionar, duplicar y eliminar casillas,
  con deshacer/rehacer.
- **FR-004**: El reproductor MUST mostrar las casillas superpuestas sobre la captura y
  permitir marcarlas y desmarcarlas, con una marca visual clara.
- **FR-005**: La validación MUST comprobar que todas las casillas dibujadas coinciden con su
  estado esperado; si alguna no coincide, MUST mostrar un error y MUST NOT avanzar.
- **FR-006**: La validación SHOULD ejecutarse al pulsar una zona de clic del paso (por
  ejemplo, el botón Aplicar). Si el paso no tiene zona de clic, MUST ofrecer un botón
  **Validar selección**.
- **FR-007**: Las casillas MUST ser accesibles por teclado y anunciar su estado; el foco
  visible MUST ser claro.
- **FR-008**: Las casillas MUST NOT modificar la captura original ni persistir la selección
  del alumno; la marca es una capa de la simulación.
- **FR-009**: La modalidad MUST funcionar en la vista previa y en el reproductor del SCORM.
- **FR-010**: Un paso no MUST mezclar casillas y campos de texto en esta entrega; el editor
  MUST explicar esa limitación al compilar.
- **FR-011**: El manual y la guía MUST explicar cómo usar la modalidad de casillas.

## Criterios de éxito

- **SC-001**: Un paso ficticio con dos casillas se puede crear, previsualizar y completar en
  menos de 3 minutos.
- **SC-002**: Una selección incorrecta no avanza y muestra un mensaje; corregirla permite
  avanzar.
- **SC-003**: La marca visual se ve al instante y el estado se puede cambiar con teclado.
- **SC-004**: El paquete SCORM reproduce la misma interacción sin backend ni red externa.
- **SC-005**: Las pruebas existentes de contrato, RUT, exportación y privacidad siguen
  pasando.

## Supuestos

- Regla de selección: **coincidencia exacta** de todas las casillas dibujadas en el paso.
- Las casillas se dibujan individualmente; las casillas no dibujadas no son interactivas.
- El botón que confirma suele ser una zona de clic; si no existe, se agrega un botón de
  validación debajo de la imagen.
- No se persiste ni reporta qué casillas marcó el alumno; solo la finalización del SCORM.
