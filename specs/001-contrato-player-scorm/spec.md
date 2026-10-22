# Feature Specification: Contrato, reproductor mínimo y exportación SCORM 1.2

**Feature Branch**: `001-contrato-player-scorm`
**Created**: 2026-10-18
**Status**: Draft
**Input**: Feature 001 de la sección 22 de `idea_editor_simuldor.md`: contrato versionado, reproductor desacoplado con acciones de clic, texto e informativas en modo guiado, y paquete SCORM 1.2 mínimo de dos pasos para validación en una plataforma de prueba real.

## Clarifications

### Session 2026-10-18

- Q: ¿Qué LMS y versión se usarán? → A: Aún no definido; la persona usuaria ha utilizado SCORM 1.2 en su LMS.
- Q: ¿Qué entorno real estará disponible para validar el paquete? → A: Usar una plataforma web gratuita de prueba SCORM 1.2 con datos ficticios y reportar compatibilidad solo con esa plataforma.

## User Scenarios & Testing

### User Story 1 - Generar un paquete mínimo de simulación (Priority: P1)

Como responsable de capacitación, quiero generar mediante un comando o prueba un paquete SCORM 1.2 con un simulador ficticio de dos pasos, para validar la ruta básica de distribución en una plataforma SCORM antes de construir el editor completo.

**Why this priority**: La integración con el LMS es el principal riesgo técnico del proyecto y debe probarse antes de ampliar el editor.

**Independent Test**: Dado un proyecto de ejemplo válido de dos pasos, invocar el módulo generador mediante su interfaz de ejecución por comando o prueba, comprobar la estructura determinista del paquete y abrirlo directamente para iniciar y completar ambos pasos.

**Acceptance Scenarios**:

1. **Given** un proyecto de ejemplo válido con dos pasos y acciones de clic, texto e informativas, **When** se invoca el módulo generador desde un comando o una prueba, **Then** se obtiene un archivo SCORM 1.2 con manifiesto y recursos locales necesarios.
2. **Given** el paquete generado, **When** se abre sin un LMS, **Then** el reproductor inicia en modo autónomo, permite completar los dos pasos en modo guiado y presenta el estado final sin errores técnicos visibles.
3. **Given** el paquete generado, **When** se inspecciona su contenido y sus solicitudes de red durante la ejecución, **Then** los recursos necesarios son locales y no se realizan peticiones externas.
4. **Given** los mismos datos de entrada, **When** se genera el paquete más de una vez, **Then** cada ZIP tiene el mismo contenido y orden de archivos.

### User Story 2 - Completar acciones básicas en el reproductor (Priority: P1)

Como alumno, quiero seguir instrucciones y completar interacciones de clic, texto e informativas, para recorrer un procedimiento simulado de principio a fin.

**Why this priority**: Estas interacciones constituyen el alcance mínimo de ejecución fijado para la primera entrega.

**Independent Test**: Ejecutar un simulador ficticio de dos pasos en español de Chile, probar acciones correctas, una respuesta de texto inválida y clics fuera de zona, y confirmar las reglas de avance y retroalimentación.

**Acceptance Scenarios**:

1. **Given** un paso con una acción de clic y zonas de objetivo definidas por coordenadas normalizadas de 0 a 1 respecto de la imagen original, **When** el alumno selecciona una zona válida, **Then** la acción se completa y el reproductor permite continuar.
2. **Given** un paso con una acción de clic, **When** el alumno hace clic fuera de toda zona válida, **Then** el reproductor presenta un mensaje no bloqueante y no avanza.
3. **Given** un paso con una acción de texto, **When** el alumno ingresa un valor que no cumple la validación definida, **Then** se muestra un mensaje claro, se conserva el texto ingresado y el paso no avanza.
4. **Given** un paso informativo, **When** el alumno confirma que terminó de leer, **Then** la acción se completa y puede continuar según la secuencia definida.
5. **Given** una captura de proporción cualquiera que haya cargado correctamente, **When** se presenta en el reproductor, **Then** se escala proporcionalmente sin deformarla y mantiene las zonas alineadas.
6. **Given** una imagen que no se puede cargar, **When** se intenta mostrar el paso, **Then** el reproductor comunica el problema de forma clara, no presenta una imagen rota como si fuera válida y no permite completar interacciones dependientes de esa imagen.
7. **Given** un navegador con resolución inferior a 1024×600, **When** el alumno abre el simulador, **Then** el reproductor informa que la resolución es insuficiente y no oculta el motivo.
8. **Given** cualquier acción disponible, **When** el alumno navega con teclado, **Then** puede identificar el foco y completar la interacción sin depender exclusivamente del mouse.

### User Story 3 - Validar el registro de finalización en una plataforma SCORM (Priority: P1)

Como responsable de capacitación, quiero que el paquete comunique el progreso a una plataforma web gratuita que ejecute SCORM 1.2, para comprobar el flujo básico antes de afirmar compatibilidad con esa plataforma específica.

**Why this priority**: El valor de esta primera entrega depende de verificar el paquete en una plataforma real, sin atribuir compatibilidad con el LMS corporativo no identificado ni con otros LMS.

**Independent Test**: Importar el paquete de dos pasos, con datos ficticios únicamente, en una plataforma web gratuita de prueba seleccionada durante la planificación; verificar estado, ubicación y tiempo sin reportar valores escritos por el alumno.

**Acceptance Scenarios**:

1. **Given** una plataforma de prueba web gratuita seleccionada y accesible, **When** comienza el simulador, **Then** el paquete reporta `incomplete` y la ubicación inicial mediante `cmi.core.lesson_location`.
2. **Given** esa plataforma de prueba, **When** el alumno completa los dos pasos, **Then** recibe `completed`, la ubicación del paso y el tiempo de sesión en `cmi.core.session_time`.
3. **Given** el paquete abierto fuera de un LMS, **When** el alumno completa el simulador, **Then** el modo autónomo no muestra errores de integración SCORM.
4. **Given** que el paquete todavía no se ha probado en un LMS específico, **When** se informa el estado de la feature, **Then** no se declara compatibilidad con ese LMS.
5. **Given** que el alumno escribe en uno o más campos, **When** el reproductor comunica el progreso al LMS, **Then** no se reporta ninguno de los valores escritos.
6. **Given** un campo de contraseña simulado, **When** el alumno escribe o abandona el paso, **Then** el valor permanece enmascarado y nunca se guarda.

### Edge Cases

- Un proyecto con versión de contrato superior a la que entiende el reproductor se rechaza con un mensaje comprensible.
- Un contrato inválido, con acciones incompletas o referencias a pasos inexistentes, no produce un paquete que parezca válido.
- Si la API SCORM no está disponible al abrir el paquete directamente, el reproductor funciona de forma autónoma.
- Una interacción enviada varias veces durante una transición no debe completar pasos adicionales ni duplicar resultados.
- El proveedor y la disponibilidad de la plataforma gratuita de prueba quedan por verificar en planificación; no se suben a ella capturas reales ni datos personales.
- Si una zona cae fuera de los límites normalizados de la imagen o tiene dimensiones inválidas, el contrato se rechaza antes de reproducir o generar el paquete.
- La imagen conserva su proporción al escalarse en distintos tamaños de ventana; el modo de baja resolución informa el requisito de 1024×600.

## Requirements

### Functional Requirements

- **FR-001**: El sistema MUST definir un contrato versionado que represente metadatos, ajustes, recursos, pasos y acciones del alcance mínimo. Cada zona de interacción MUST expresarse con coordenadas normalizadas entre 0 y 1 respecto de las dimensiones naturales de la imagen. El contrato reservará un campo opcional para anotaciones; en esta feature el reproductor MUST ignorarlo.
- **FR-002**: El sistema MUST validar un proyecto antes de reproducirlo o empaquetarlo, y MUST rechazar contratos inválidos o versiones incompatibles con un mensaje comprensible.
- **FR-003**: El sistema MUST permitir reproducir al menos dos pasos que contengan acciones de clic, texto e informativas, y MUST impedir avanzar hasta completar cada acción requerida.
- **FR-004**: Las validaciones de texto mínimas MUST incluir `non_empty` (valor no vacío), `equals` (coincidencia exacta), `one_of` (coincidencia con uno de los valores permitidos) y `rut` (formato chileno y dígito verificador válido). Con la normalización de RUT activada, `rut` MUST aceptar entradas con o sin puntos y con o sin guion, normalizándolas antes de validar.
- **FR-005**: Los campos de contraseña MUST presentar los caracteres enmascarados durante la entrada y MUST descartarlos al abandonar el campo o paso; el valor nunca se guarda en el contrato, almacenamiento persistente, paquete o reporte LMS.
- **FR-006**: El reproductor MUST ofrecer el modo guiado, usar interfaz en español (Chile), tratar todo texto del proyecto como texto literal seguro (no como HTML ejecutable), mostrar foco visible y anuncios accesibles, cumplir contraste WCAG AA (mínimo 4,5:1 para texto normal) y escalar las imágenes sin deformarlas.
- **FR-007**: La resolución mínima admitida por el reproductor MUST ser 1024×600. Una imagen que no carga MUST producir un mensaje claro y bloquear interacciones que dependan de ella, sin dar por válido el paso.
- **FR-008**: El módulo generador MUST ser reutilizable y tener una interfaz invocable mediante comando o prueba automatizada. MUST poder usarse desde navegador en una etapa posterior, sin exigir que esta feature entregue una interfaz de creación visual.
- **FR-009**: El generador MUST producir paquetes SCORM 1.2 con manifiesto válido, un único SCO, rutas relativas con `/` y todos los recursos necesarios incluidos. Para entradas idénticas, MUST generar ZIP determinista byte por byte, con orden de archivos y metadatos temporales fijos.
- **FR-010**: El reproductor distribuido MUST estar desacoplado del editor y el paquete MUST funcionar sin recursos remotos ni peticiones externas de red. La comunicación con la API SCORM local del LMS es el único intercambio previsto durante la ejecución.
- **FR-011**: Con LMS disponible, el paquete MUST inicializar `cmi.core.lesson_status` como `incomplete`, informar `cmi.core.lesson_location` y reportar `cmi.core.session_time`; al terminar, MUST actualizar el estado a `completed`. Al abrir fuera del LMS, MUST continuar en modo autónomo.
- **FR-012**: El reproductor MUST no reportar nunca los valores escritos por el alumno al LMS, incluso si la escritura fue correcta. Los campos de contraseña simulada MUST nunca reportarse.
- **FR-013**: El sistema MUST usar solo datos y recursos ficticios en fixtures, demostraciones y pruebas.
- **FR-014**: La compatibilidad con un LMS específico MUST declararse solo después de ejecutar y documentar la prueba en ese LMS. Para esta feature, se usará una plataforma web gratuita de prueba SCORM 1.2 con datos ficticios y solo se declarará compatibilidad con el nombre y versión efectivamente probados. El LMS corporativo y su versión no están identificados; la experiencia previa de la persona usuaria con SCORM 1.2 no constituye una validación de este paquete.

### Key Entities

- **Proyecto de simulación**: definición versionada del simulador, sus ajustes, pasos y referencias a recursos.
- **Paso**: unidad secuencial con título, instrucción, recurso visual y acciones requeridas.
- **Acción**: interacción de clic, entrada de texto o lectura/confirmación que debe completar el alumno.
- **Paquete SCORM**: distribución autocontenida del reproductor y el proyecto para su importación en un LMS.
- **Sesión del alumno**: ejecución temporal del simulador con progreso y estado de finalización comunicados al LMS cuando esté disponible.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un proyecto de ejemplo válido de dos pasos produce mediante el módulo invocado desde comando o prueba un paquete SCORM 1.2 que contiene manifiesto, reproductor desacoplado, contrato y recursos necesarios.
- **SC-002**: En ejecución autónoma, una persona puede completar los dos pasos de ejemplo usando las acciones de clic, texto e informativas, y el reproductor muestra un resultado final.
- **SC-003**: Las pruebas automatizadas verifican todas las validaciones `non_empty`, `equals`, `one_of` y `rut`, incluido el dígito verificador y las variantes de puntos/guion, y prueban que los valores de campos de contraseña no persisten.
- **SC-004**: Una acción de clic en una zona válida avanza según la secuencia y un clic fuera de zona muestra mensaje no bloqueante sin avanzar.
- **SC-005**: La ejecución del paquete no realiza solicitudes de recursos externos y la generación repetida desde la misma entrada produce ZIPs idénticos byte por byte.
- **SC-006**: En la plataforma web gratuita seleccionada se verifica el estado `incomplete` inicial, `completed` al finalizar, `lesson_location` y `session_time`; ningún valor escrito por el alumno aparece en los reportes. El nombre, versión y resultado quedan documentados antes de declarar compatibilidad con esa plataforma.
- **SC-007**: Las zonas permanecen alineadas a imágenes escaladas sin deformación, el reproductor informa requisitos por debajo de 1024×600 y presenta un error claro si una imagen no carga.
- **SC-008**: Las interacciones se pueden completar por teclado, con foco visible, contenido de interfaz en español (Chile), contraste de texto normal de al menos 4,5:1 y textos del proyecto renderizados como texto no ejecutable.

## Assumptions

- El editor visual completo y la carga de capturas por trainers se entregan en features posteriores; esta feature valida el flujo base con un proyecto de ejemplo ficticio.
- El alcance de interacciones es clic, texto e informativo, en modo guiado; los modos práctica y evaluación, puntaje, scroll, selección, anotaciones editables y difuminado pertenecen a features posteriores.
- Se reservan anotaciones opcionales en el contrato para compatibilidad evolutiva, pero no se crean ni muestran en esta feature.
- El generador es un módulo reusable comprobable por comando o prueba y apto para integrarse más adelante al navegador; la interfaz visual de generación queda fuera de esta feature.
- El LMS corporativo y su versión no están identificados; la validación real de esta feature se hará en una plataforma web gratuita de prueba.
- El proveedor, versión y disponibilidad de la plataforma gratuita deben verificarse durante planificación antes de subir el paquete ficticio.
- El sistema comunica finalización como el alcance mínimo de integración; puntaje, reanudación e interacciones LMS avanzadas no se consideran criterios de esta feature.
- Las rutas dentro del paquete usan `/` y son relativas para permitir distribución como archivo autocontenido. El ZIP debe ser reproducible para el mismo proyecto, con entradas ordenadas y metadatos temporales fijos.
