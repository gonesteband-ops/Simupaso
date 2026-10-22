# Especificación de feature: Editor núcleo

**Branch**: `003-editor-nucleo`
**Creada**: 2026-10-20
**Estado**: Implementada y verificada en Chromium; pendiente de validación manual en otros navegadores y en LMS
**Entrada**: Feature 003 de la sección 22 de `idea_editor_simuldor.md`: carga de imágenes, lista de pasos, lienzo con zoom, dibujar y editar zonas de clic y texto, panel de propiedades, deshacer/rehacer y vista previa. Las capturas y la edición visual fueron diferidas expresamente por la feature 002.

## Clarifications

### Session 2026-10-20

- Q: ¿Dónde se deben cargar las capturas en la feature 003? → A: En el editor, al abrir un borrador; el asistente Crear nuevo conserva los datos básicos de la 002.
- Q: ¿Qué validaciones debe permitir configurar una zona de texto en la feature 003? → A: Básicas más RUT: no vacío, valor exacto, lista de valores y RUT chileno; regex, normalizaciones y variable de eco quedan fuera.
- Q: ¿Cómo debe funcionar la vista previa de la feature 003? → A: Modo guiado únicamente, con el mismo reproductor exportable, iniciando desde el primer paso o desde el paso seleccionado; sin puntaje ni panel de LMS.
- Q: ¿La feature 003 debe permitir pasos informativos sin zonas? → A: Sí; un paso puede marcarse como informativo y muestra un botón Siguiente o Finalizar, sin exigir zonas.
- Q: ¿Qué límite inicial por imagen debe aplicar el editor? → A: 10 MB por imagen, con mensaje claro y ajuste configurable en una feature posterior.

### Session 2026-10-21

- Q: ¿Cómo hacer que el ingreso de RUT y contraseña se sienta como el CRM real? → A: En un paso que tenga zonas de texto y una zona de clic, mostrar todos los campos de texto superpuestos sobre la captura y validarlos juntos al pulsar la zona de acción; el botón visible es el de la propia captura y la zona de clic no se resalta. Se agrega el indicador opcional `formMode` al contrato del reproductor; los pasos sin esa combinación conservan el flujo secuencial.
- Q: ¿Se puede descargar el paquete SCORM 1.2 desde la app? → A: Se agrega una descarga básica desde el editor como avance provisional de la feature 007, usando el exportador existente; el historial de exportaciones, snapshots y la validación previa completa siguen en la 007.
- Q: ¿Se puede ajustar el tamaño del texto que se escribe sobre la captura? → A: Sí; cada zona de texto puede definir un tamaño entre 10 % y 100 % del alto de la zona, con 28 % como valor inicial. El ajuste se aplica a los campos superpuestos y se conserva en el proyecto.
- Q: ¿Se puede ver la simulación más grande, como la web real? → A: Sí; se usa todo el ancho disponible sin reservar una columna lateral vacía, se amplía el lienzo, se agrega un botón de pantalla completa y el aviso de 1024×600 se presenta como recomendación. El 100 % con scroll no forma parte de esta mejora.
- Q: ¿Cómo se anonimizan capturas con datos de clientes? → A: Con una herramienta de difuminado por imagen: rectángulos con estilo ocultar, difuminar o pixelar, editables y no destructivos; se queman en la vista previa y el SCORM, el original queda local y se exige una confirmación de privacidad antes de exportar.
- Q: ¿Cómo se lee la ayuda de un campo superpuesto? → A: Al pasar el mouse o enfocar el campo se muestra un globo con su placeholder o etiqueta; también queda asociado por `aria-describedby`.\n- Q: ¿Cómo se anonimizan capturas con datos de clientes? → A: Con una herramienta de difuminado por imagen: rectángulos con estilo ocultar, difuminar o pixelar, editables y no destructivos; se queman en la vista previa y el SCORM, el original queda local y se exige una confirmación de privacidad antes de exportar.\n- Q: ¿Cómo se lee la ayuda de un campo superpuesto? → A: Al pasar el mouse o enfocar el campo se muestra un globo con su placeholder o etiqueta; también queda asociado por `aria-describedby`.

## Historias de usuario y pruebas

### Historia 1 — Cargar capturas y armar la secuencia de pasos (Prioridad: P1)

Como trainer, quiero subir una o varias capturas y ordenarlas como pasos, para construir rápido la secuencia del procedimiento sin conocimientos técnicos.

**Por qué es prioridad**: Sin capturas no existe simulador; esta historia convierte un borrador descriptivo en un proyecto editable y es la base de todas las demás funciones del editor.

**Prueba independiente**: Abrir un borrador, cargar varias imágenes ficticias de una vez, comprobar que se crea un paso por imagen ordenado por nombre, reordenar pasos y recargar la app para confirmar que la secuencia se conserva.

**Escenarios de aceptación**:

1. **Dado** un proyecto abierto en el editor, **cuando** cargo una o varias imágenes compatibles, **entonces** se crea un paso por imagen, en el orden de sus nombres de archivo, y cada paso muestra su miniatura y su posición.
2. **Dado** que cargo imágenes con nombres que producen un orden distinto al deseado, **cuando** arrastro un paso a otra posición, **entonces** la secuencia y la numeración se actualizan y el cambio se guarda.
3. **Dado** que selecciono una imagen para cargar, **cuando** el archivo no es PNG, JPG o WebP, está dañado o supera el límite informado, **entonces** recibo un mensaje claro, esa imagen no se incorpora y las demás sí pueden cargarse.
4. **Dado** que voy a cargar capturas, **cuando** la zona de carga está visible, **entonces** veo un aviso inmediato de que las capturas se procesan y quedan solo en este navegador y de que debo difuminar datos sensibles antes de exportar.
5. **Dado** un proyecto editado con pasos e imágenes, **cuando** recargo la app o vuelvo a abrirlo desde Mis proyectos, **entonces** los pasos, sus imágenes y su orden siguen disponibles en el mismo navegador.
6. **Dado** que no se puede guardar en el navegador, **cuando** intento trabajar en el editor, **entonces** se me avisa que el trabajo es temporal y no se me presenta como guardado permanente.

### Historia 2 — Dibujar y editar zonas de clic (Prioridad: P1)

Como trainer, quiero marcar sobre la captura dónde debe hacer clic el alumno, para definir la interacción de cada pantalla.

**Prueba independiente**: Sobre una captura ficticia, dibujar una zona de clic, moverla, redimensionarla, ajustar sus coordenadas y verificar que se conserva al cambiar el zoom y al recargar.

**Escenarios de aceptación**:

1. **Dado** un paso con imagen, **cuando** activo la herramienta de zona de clic y arrastro sobre el lienzo, **entonces** se crea una zona de clic visible y seleccionada dentro de los límites de la imagen.
2. **Dado** que un paso tiene zonas de clic, **cuando** elijo si basta una zona o se requieren todas, **entonces** el paso refleja esa regla de interacción.
3. **Dado** que dibujo un clic muy pequeño o fuera de la imagen, **cuando** termino el trazo, **entonces** la zona se rechaza o se ajusta a los límites, con una explicación clara.
4. **Dado** que necesito más de un lugar válido, **cuando** agrego otra zona de clic al mismo paso, **entonces** ambas conviven y se distinguen en el lienzo y en la lista de zonas.
5. **Dado** que cometo un error al dibujar, **cuando** uso deshacer, **entonces** la última zona o cambio desaparece; al rehacer, vuelve.
6. **Dado** un paso cuya pantalla solo se debe leer, **cuando** lo marco como informativo y defino el texto del botón Siguiente o Finalizar, **entonces** el paso no exige zonas y la vista previa permite avanzar con ese botón.

### Historia 3 — Dibujar y configurar zonas de texto (Prioridad: P1)

Como trainer, quiero marcar dónde escribe el alumno y qué valor se considera correcto, para que el simulador valide la práctica sin un sistema real.

**Prueba independiente**: Crear una zona de texto ficticia, definir su etiqueta, una validación de valor exacto y su mensaje de error, y comprobar que la configuración se conserva y se refleja en la vista previa.

**Escenarios de aceptación**:

1. **Dado** un paso con imagen, **cuando** activo la herramienta de zona de texto y arrastro, **entonces** se crea una zona de texto seleccionada dentro de los límites de la imagen.
2. **Dado** que una zona de texto está seleccionada, **cuando** edito su etiqueta, texto de ayuda, enmascarado, tipo de validación, valores esperados y mensajes, **entonces** los cambios se reflejan en el panel y se guardan con el proyecto.
3. **Dado** que la zona es enmascarada, **cuando** la reviso en el editor o en la vista previa, **entonces** el contenido escrito se oculta y el proyecto no lo conserva para reportarlo al LMS.
4. **Dado** que elijo una validación que exige uno o más valores esperados y los dejo vacíos, **cuando** intento completar la configuración, **entonces** recibo un mensaje claro y la zona no queda como válida para previsualizar.
5. **Dado** que uso la validación de RUT, **cuando** la vista previa recibe valores con puntos, sin puntos, con o sin guion o con dígito verificador inválido, **entonces** aplica la misma validación ya definida para el reproductor en la feature 001.

### Historia 4 — Trabajar con zoom, teclado e historial de cambios (Prioridad: P2)

Como trainer, quiero un lienzo cómodo de manipular y poder corregir mis acciones, para marcar zonas con precisión incluso en capturas grandes.

**Prueba independiente**: Abrir una captura ficticia de gran tamaño, usar zoom y ajuste a pantalla, mover y redimensionar una zona con mouse y teclado, duplicarla, eliminarla y recorrer el historial de deshacer/rehacer.

**Escenarios de aceptación**:

1. **Dado** un paso con una captura grande, **cuando** uso zoom, ajustar a pantalla o restablecer el zoom, **entonces** la imagen se ve sin deformarse y las zonas permanecen alineadas con la captura.
2. **Dado** que una zona está seleccionada, **cuando** la muevo con las flechas, **entonces** avanza un píxel; con Shift avanza diez; sus coordenadas visibles se actualizan.
3. **Dado** que una zona está seleccionada, **cuando** la duplico o la elimino con los atajos indicados, **entonces** la copia o eliminación ocurre sin afectar a otras zonas y puedo deshacerlo.
4. **Dado** que realicé varios cambios en la sesión, **cuando** uso deshacer o rehacer repetidamente, **entonces** el proyecto recorre esos estados en orden; al recargar la app, el historial de la sesión se reinicia y el proyecto queda en su último estado guardado.
5. **Dado** que trabajo solo con teclado, **cuando** recorro las herramientas, la lista de pasos, el lienzo y el panel de propiedades, **entonces** veo el foco, puedo seleccionar y editar sin mouse y los cambios se anuncian de forma accesible.

### Historia 5 — Revisar el simulador en vista previa (Prioridad: P2)

Como trainer, quiero previsualizar el procedimiento desde el paso que estoy editando, para comprobar que las zonas y los textos funcionan antes de continuar.

**Prueba independiente**: Con un proyecto de al menos dos pasos y zonas válidas, abrir la vista previa desde el paso actual, completar la interacción y confirmar que usa el mismo comportamiento del reproductor exportado.

**Escenarios de aceptación**:

1. **Dado** un proyecto con interacciones configuradas (zonas o pasos informativos), **cuando** abro la vista previa, **entonces** se ejecuta en modo guiado con el mismo reproductor que se incluirá en el paquete SCORM.
2. **Dado** que estoy editando un paso intermedio, **cuando** inicio la vista previa desde ese paso, **entonces** la simulación comienza allí y permite continuar la secuencia.
3. **Dado** que un paso no tiene zonas o una zona de texto tiene una validación incompleta, **cuando** intento previsualizar, **entonces** recibo un aviso claro y puedo volver al editor para corregirlo.
4. **Dado** que estoy en la vista previa, **cuando** la cierro, **entonces** vuelvo al editor con el mismo paso seleccionado y sin perder cambios.

## Casos límite

- Se cargan varias imágenes y algunas fallan: las válidas se incorporan y se informa cuáles fallaron sin interrumpir la carga completa.
- Se carga una imagen extremadamente grande o muy alargada: se informa el límite o la advertencia correspondiente y no se bloquea la app.
- Se elimina un paso con zonas: se pide confirmación y, si se confirma, las zonas de ese paso dejan de existir.
- Se elimina el último paso: el proyecto queda sin pasos, con un estado vacío que invita a cargar capturas; no se presenta como listo para previsualizar.
- Se duplica un paso: la copia conserva imagen y zonas, pero se identifica como paso distinto y se puede editar sin alterar el original.
- Se redimensiona la ventana o se cambia el zoom: las zonas siguen alineadas con la imagen y no se deforman.
- Una zona queda total o parcialmente fuera de la imagen: se impide o se ajusta a los bordes, informando el ajuste.
- El nombre o los textos del paso contienen marcado HTML o caracteres especiales: se muestran como texto literal, nunca como contenido ejecutable.
- El almacenamiento local falla durante el autoguardado: se avisa del error y no se indica que el proyecto está guardado.
- Se abre la vista previa con el proyecto vacío o con validaciones incompletas: se explica qué falta antes de simular.
- El navegador no puede leer una imagen ya guardada: se informa el problema en ese paso sin borrar el resto del proyecto.

## Requisitos

### Requisitos funcionales

- **FR-001**: La app MUST permitir abrir un borrador existente en el editor desde Mis proyectos y MUST mostrar en el editor el nombre del proyecto y el estado de guardado. La carga de capturas MUST ocurrir en el editor; Crear nuevo MUST conservar su alcance de datos básicos.
- **FR-002**: El editor MUST permitir cargar una o varias capturas PNG, JPG o WebP mediante selección de archivos y arrastrar y soltar, y MUST crear un paso por cada imagen válida.
- **FR-003**: Las capturas cargadas en una misma operación MUST ordenarse por nombre de archivo antes de crear los pasos, y el trainer MUST poder reordenar los pasos después.
- **FR-004**: El editor MUST advertir que las capturas se procesan y permanecen solo en el navegador, y MUST recordar difuminar datos sensibles antes de exportar.
- **FR-005**: El editor MUST rechazar archivos no compatibles, dañados o que excedan el límite de tamaño con un mensaje claro, sin incorporarlos y sin impedir la carga de los demás.
- **FR-006**: Cada paso MUST mostrar una miniatura, un identificador de posición y acceso a sus datos; el trainer MUST poder duplicarlo, eliminarlo con confirmación e insertar una captura entre pasos.
- **FR-007**: El editor MUST conservar localmente los pasos, el orden, las imágenes, las zonas y sus propiedades, y MUST volver a mostrarlos al reabrir el proyecto en el mismo navegador.
- **FR-008**: El editor MUST guardar los cambios automáticamente y MUST distinguir guardando, guardado y error; MUST NOT indicar guardado antes de confirmar la escritura.
- **FR-009**: El editor MUST ofrecer un lienzo con la captura del paso seleccionado, zoom de acercar y alejar, ajuste a pantalla y restablecimiento de la vista, sin deformar la imagen ni desalinear las zonas.
- **FR-010**: El editor MUST permitir activar al menos estas herramientas: seleccionar y mover, zona de clic y zona de texto, con atajos de teclado visibles.
- **FR-011**: El trainer MUST poder dibujar zonas de clic y de texto arrastrando sobre la imagen; cada zona MUST quedar dentro de los límites de la imagen o ajustarse a ellos con aviso.
- **FR-012**: El trainer MUST poder seleccionar una zona, moverla y redimensionarla con mouse o teclado, y MUST poder editar sus coordenadas de forma numérica.
- **FR-013**: Las zonas MUST mantener su posición relativa a la imagen al cambiar el zoom, el tamaño de la ventana o el tamaño de presentación del lienzo.
- **FR-014**: Una zona de clic MUST permitir configurar si se requiere una de varias zonas o todas, y MUST permitir más de una zona válida por paso.
- **FR-015**: Una zona de texto MUST permitir configurar etiqueta, texto de ayuda, enmascarado, tipo de validación entre no vacío, valor exacto, lista de valores y RUT chileno, valores esperados y mensajes de error.
- **FR-016**: Las validaciones de texto del editor MUST coincidir con las del reproductor ya definido en la feature 001, incluido el dígito verificador del RUT.
- **FR-017**: El proyecto MUST NOT guardar ni reportar el contenido escrito en una zona enmascarada; el editor MUST tratar esos campos como sensibles.
- **FR-018**: El editor MUST impedir que una zona de texto quede lista para previsualizar cuando su validación requiera valores esperados y estos estén vacíos, informando el motivo.
- **FR-019**: El trainer MUST poder duplicar y eliminar zonas seleccionadas y MUST poder moverlas con las flechas, un píxel por defecto y diez con Shift.
- **FR-020**: El editor MUST ofrecer deshacer y rehacer durante la sesión para los cambios de pasos, orden, zonas y propiedades, y MUST reiniciar el historial al recargar la app conservando el último estado guardado.
- **FR-021**: La lista de pasos MUST permitir seleccionar un paso y MUST reflejar visualmente el paso activo y su relación con la secuencia.
- **FR-022**: El panel de propiedades MUST adaptarse al elemento seleccionado: datos del paso o propiedades de la zona, incluidas las coordenadas y el tipo de interacción.
- **FR-023**: Los datos del paso MUST incluir al menos título, instrucción, pista y mensajes de error y éxito; el texto se MUST renderizar como texto seguro.
- **FR-024**: El editor MUST ofrecer una vista previa en modo guiado que use el mismo reproductor que se incluirá en el paquete SCORM, iniciando desde el primer paso o desde el paso seleccionado.
- **FR-025**: La vista previa MUST rechazarse con un aviso claro cuando el proyecto no tenga pasos o cuando una zona necesaria tenga configuración incompleta.
- **FR-026**: La vista previa MUST NOT incluir el panel de simulador de LMS, los modos de práctica y evaluación, el puntaje ni la exportación desde la interfaz; esas capacidades pertenecen a features posteriores.
- **FR-027**: El editor MUST permitir operar las herramientas, la lista de pasos, el lienzo y el panel de propiedades con teclado, con foco visible y nombres accesibles, y MUST anunciar los cambios de estado relevantes.
- **FR-028**: La interfaz del editor MUST usar español (Chile), el sistema visual existente de SimuPaso Studio y contraste mínimo AA de 4,5:1 para texto normal.
- **FR-029**: El editor MUST permanecer sin backend, cuentas, telemetría, peticiones de red externas ni recursos remotos; todo el procesamiento de capturas MUST ocurrir en el navegador.
- **FR-030**: Cuando el almacenamiento local no esté disponible o falle, el editor MUST informar que el trabajo es temporal o que no se pudo guardar, sin perder silenciosamente los cambios de la sesión.
- **FR-031**: El editor MUST representar de forma honesta las capacidades: anotaciones, difuminado, scroll, selección, vínculos, distractores, modos múltiples, historial de exportaciones y validación previa completa no forman parte de esta feature. La descarga SCORM básica sí forma parte como avance provisional de la 007.
- **FR-032**: Un paso MUST poder marcarse como informativo, sin zonas obligatorias, con el texto de su botón Siguiente o Finalizar; la vista previa MUST permitir avanzar con ese botón.
- **FR-033**: Cuando un paso interactivo tenga al menos una zona de texto y una zona de clic, el reproductor MUST mostrar todos los campos de texto simultáneamente superpuestos sobre la captura, con la misma posición y escala que sus zonas, y MUST validarlos juntos al activar la zona de clic; la zona de clic del formulario MUST NOT mostrar el recuadro de guía. Los pasos sin esta combinación MUST conservar el flujo secuencial.
- **FR-034**: El editor MUST permitir descargar un paquete SCORM 1.2 del proyecto actual con sus capturas y el reproductor, compilando y validando antes de descargar; si hay problemas, MUST explicarlos y MUST NOT descargar un paquete inválido. Esta descarga no incluye historial de exportaciones ni las validaciones previas completas de la 007.
- **FR-035**: Cada zona de texto MUST permitir configurar un tamaño de letra entre 10 % y 100 % del alto de la zona, con 28 % por defecto; el reproductor MUST aplicar ese tamaño a los campos superpuestos y MUST conservar el ajuste al guardar y reabrir el proyecto.
- **FR-036**: El reproductor MUST usar todo el ancho disponible para la captura, sin reservar una columna lateral cuando no haya acciones que mostrar, MUST ampliar el lienzo para aprovechar la ventana y MUST ofrecer un botón de pantalla completa cuando el navegador o el LMS lo permitan. Si la pantalla completa se bloquea, MUST informarlo sin interrumpir la simulación. El aviso de 1024×600 MUST ser una recomendación, no un bloqueo.
- **FR-037**: El editor MUST permitir marcar rectángulos de difuminado sobre una captura, con estilos ocultar, difuminar y pixelar, intensidad ajustable y edición no destructiva. La redacción MUST aplicarse a la imagen de la vista previa y del SCORM, de modo que los píxeles originales no sean recuperables desde el paquete; el original MUST permanecer solo en el navegador. Antes de exportar, MUST exigirse una confirmación de que se revisaron los datos personales.
- **FR-038**: En los campos de texto superpuestos, al pasar el mouse o enfocar el campo MUST mostrarse un globo con su placeholder o etiqueta; el texto MUST quedar asociado mediante `aria-describedby` para lectores de pantalla.

### Entidades clave

- **Proyecto editable**: simulador local con datos básicos, una secuencia ordenada de pasos y sus capturas; se guarda en el navegador y puede abrirse o cerrarse sin backend.
- **Paso**: unidad de la secuencia asociada a una captura, con posición, datos descriptivos y zonas; puede ser informativo (solo lectura y botón Siguiente o Finalizar) y puede duplicarse o eliminarse.
- **Captura**: imagen PNG, JPG o WebP cargada por el trainer, con sus dimensiones y su referencia a un paso; se conserva localmente.
- **Zona de clic**: región rectangular de la captura donde el alumno debe hacer clic; puede haber varias por paso y una regla de una o todas.
- **Zona de texto**: región rectangular donde el alumno escribe, con etiqueta, enmascarado, validación, valores esperados y mensajes.
- **Historial de edición de la sesión**: secuencia de estados del proyecto que permite deshacer y rehacer; no sobrevive a la recarga.
- **Vista previa**: ejecución del reproductor existente en modo guiado desde un paso elegido, sin funciones de evaluación ni reporte al LMS.

## Criterios de éxito

- **SC-001**: Un trainer puede cargar cinco capturas ficticias y obtener cinco pasos ordenados en menos de dos minutos, sin instrucciones técnicas.
- **SC-002**: El 100 % de los pasos, imágenes, zonas y propiedades editadas siguen disponibles después de recargar la app en el mismo navegador.
- **SC-003**: Una zona dibujada sobre una captura permanece alineada con la misma región de la imagen al menos en zoom mínimo, 100 % y ajuste a pantalla, con una tolerancia máxima de un píxel de presentación.
- **SC-004**: Al menos el 90 % de las acciones de creación, movimiento, redimensión y edición de zonas se pueden deshacer y rehacer durante la sesión sin alterar otras zonas.
- **SC-005**: Las validaciones de RUT de la vista previa aceptan las variantes válidas y rechazan un dígito verificador incorrecto, igual que el reproductor de la feature 001.
- **SC-006**: La vista previa inicia desde el paso seleccionado y permite completar un proyecto ficticio de dos pasos en modo guiado.
- **SC-007**: Los flujos principales de carga, selección de paso, dibujo y edición de zonas pueden completarse con teclado; los estados de guardado y error se comunican de forma accesible.
- **SC-008**: En uso normal del editor, el navegador no solicita recursos a servidores externos y las capturas no abandonan el equipo.
- **SC-009**: Un archivo no compatible o dañado se rechaza con un mensaje claro; las imágenes válidas de la misma carga se incorporan sin romper la app.

## Supuestos y límites

- La feature continúa la aplicación estática y sin backend de la feature 002; cada navegador mantiene su propia biblioteca y no se agregan cuentas ni sincronización.
- El editor se abre desde un borrador existente. La carga de capturas se realiza en el editor; el asistente de creación conserva solo los datos básicos ya entregados, y la apertura del editor se ofrece al terminar o desde Mis proyectos.
- Un paso se crea por imagen. Unir capturas verticalmente, recortar y reemplazar una captura conservando zonas quedan para la feature 008, salvo la inserción de una captura entre pasos, que sí forma parte de esta feature.
- Se adopta un límite inicial de 10 MB por imagen, con mensaje claro, sujeto a los ajustes de la feature 007/008. Formatos admitidos: PNG, JPG y WebP.
- La edición de zonas se limita a clic y texto. Además, un paso puede marcarse como informativo con un botón Siguiente o Finalizar, reutilizando la acción ya soportada por el reproductor. Scroll, selección y zonas distractoras pertenecen a la feature 005; anotaciones y difuminado, a la 004.
- Las validaciones de texto se limitan a no vacío, valor exacto, lista de valores y RUT chileno. Expresiones regulares, normalizaciones configurables, variable de eco y ayuda automática quedan para features posteriores.
- La vista previa usa el reproductor existente en modo guiado y no incluye el panel de simulador de LMS, modos de práctica o evaluación, puntaje, reanudación ni exportación desde la interfaz; esas capacidades pertenecen a las features 006 y 007.
- Deshacer y rehacer cubren la sesión de edición y no se conservan entre recargas; el autoguardado conserva el último estado.
- La edición no está optimizada para móvil; el objetivo es escritorio con ancho mínimo de 1024 px, según la guía visual del proyecto.
- Todas las capturas de ejemplo y pruebas son ficticias; no se incorporan imágenes ni datos de clientes reales.
