# Especificación de feature: Estructura de la aplicación y diseño

**Branch**: `002-app-structure-design`
**Creada**: 2026-10-19
**Estado**: Clarify completada; pendiente de aprobación
**Entrada**: Feature 002 de la sección 22 de `idea_editor_simuldor.md`: estructura de la app, navegación lateral, Inicio, Mis proyectos, Crear nuevo, Historial de SCORM vacío, sistema de diseño, almacenamiento IndexedDB y autoguardado.

## Clarifications

### Session 2026-10-19

- Q: ¿Qué debe incluir “Crear nuevo” en la feature 002, considerando que la sección 22 reserva la carga de capturas y el editor para la feature 003? → A: Solo datos básicos; guardar un borrador y dejar captura y selección de modos para las siguientes features.

## Historias de usuario y pruebas

### Historia 1 — Navegar por SimuPaso Studio (Prioridad: P1)

Como trainer, quiero reconocer las secciones principales y moverme entre ellas, para comenzar y encontrar mi trabajo sin ayuda técnica.

**Por qué es prioridad**: Esta es la estructura base necesaria para que las funciones posteriores tengan un lugar coherente dentro de la aplicación.

**Prueba independiente**: Abrir la app, recorrer Inicio, Mis proyectos, Crear nuevo e Historial de SCORM con mouse y teclado, y confirmar la sección activa y su contenido.

**Escenarios de aceptación**:

1. **Dado** que abro la aplicación, **cuando** se muestra la pantalla inicial, **entonces** veo la navegación lateral y la sección Inicio activa.
2. **Dado** que estoy en cualquier sección disponible, **cuando** selecciono otra sección, **entonces** se muestra su contenido y la navegación identifica cuál está activa.
3. **Dado** que uso un navegador de escritorio con un ancho de al menos 1024 px, **cuando** recorro las secciones, **entonces** los controles y contenidos principales son visibles, utilizables y no quedan cortados horizontalmente.
4. **Dado** que navego solo con teclado, **cuando** cambio de sección, **entonces** puedo identificar el foco y el contenido actualizado se comunica de forma accesible.

### Historia 2 — Crear y conservar un borrador (Prioridad: P1)

Como trainer, quiero iniciar un proyecto con sus datos básicos y que se guarde localmente, para volver a encontrarlo sin depender de un servidor.

**Por qué es prioridad**: Un proyecto local persistente es la primera unidad de trabajo y demuestra el valor de la app sin introducir cuentas ni backend.

**Prueba independiente**: Completar los datos básicos, guardar el borrador, recargar la aplicación y comprobar que sigue disponible en Inicio y Mis proyectos.

**Escenarios de aceptación**:

1. **Dado** que abro Crear nuevo, **cuando** ingreso un nombre válido y guardo, **entonces** se crea un proyecto identificado como borrador y aparece en Mis proyectos.
2. **Dado** que estoy creando un proyecto, **cuando** completo y guardo sus datos básicos, **entonces** se crea un borrador sin capturas ni modos configurados; la carga de imágenes y la selección de modos quedan para sus features posteriores.
3. **Dado** que el nombre está vacío o contiene solo espacios, **cuando** intento guardar, **entonces** recibo un mensaje claro y no se crea un proyecto.
4. **Dado** que existe un borrador, **cuando** se actualizan sus datos básicos, **entonces** el guardado automático refleja los últimos cambios e informa si están guardados o si hubo un error.
5. **Dado** que el borrador fue guardado, **cuando** cierro y vuelvo a abrir o recargo la app en el mismo navegador, **entonces** el proyecto y sus datos básicos siguen disponibles.
6. **Dado** que el almacenamiento persistente del navegador no está disponible, **cuando** intento trabajar, **entonces** la app informa que los cambios solo durarán en la sesión actual y no los presenta como guardados de forma permanente.

### Historia 3 — Encontrar y gestionar borradores (Prioridad: P2)

Como trainer, quiero revisar mis proyectos en una lista y encontrarlos por nombre o cliente, para volver al trabajo correcto.

**Por qué es prioridad**: Una lista real de proyectos hace visible el almacenamiento local y evita que la app se limite a un formulario aislado.

**Prueba independiente**: Crear varios borradores, buscarlos por nombre y cliente, ordenarlos por nombre o actualización y eliminar uno con confirmación.

**Escenarios de aceptación**:

1. **Dado** que hay proyectos guardados, **cuando** abro Mis proyectos, **entonces** veo su nombre, cliente cuando corresponda, cantidad de pasos y fecha de actualización.
2. **Dado** que hay varios proyectos, **cuando** busco por texto o selecciono un cliente, **entonces** la lista muestra solo las coincidencias; al limpiar los filtros vuelven a mostrarse todos.
3. **Dado** que hay proyectos guardados, **cuando** cambio el orden entre nombre y fecha de actualización, **entonces** la lista refleja el criterio seleccionado.
4. **Dado** que quiero eliminar un borrador, **cuando** confirmo la acción, **entonces** desaparece de la lista y del almacenamiento local; cancelar conserva el proyecto.
5. **Dado** que no existen proyectos, **cuando** abro Inicio o Mis proyectos, **entonces** veo un estado vacío claro y una acción para crear uno, sin ejemplos que puedan confundirse con datos del trainer.

### Historia 4 — Consultar el historial SCORM vacío (Prioridad: P2)

Como trainer, quiero encontrar el Historial de SCORM aunque aún no haya exportaciones desde la app, para saber dónde aparecerán más adelante.

**Por qué es prioridad**: La sección forma parte de la navegación del producto, pero las exportaciones desde la interfaz pertenecen a etapas posteriores.

**Prueba independiente**: Abrir Historial de SCORM con el almacenamiento sin exportaciones y verificar el mensaje vacío y que no se muestren registros inventados.

**Escenarios de aceptación**:

1. **Dado** que todavía no hay exportaciones registradas por la app, **cuando** abro Historial de SCORM, **entonces** veo un estado vacío que explica que aparecerán después de exportar.
2. **Dado** que la persona usuaria vio una demo SCORM externa, **cuando** abre el historial local, **entonces** esa demo no aparece como exportación de la app.

## Casos límite

- El almacenamiento local no está disponible, falla una lectura o falla un guardado: informar el problema sin anunciar éxito ni borrar datos silenciosamente.
- El navegador deniega el permiso para solicitar almacenamiento persistente: mostrar el estado real y mantener la advertencia sobre riesgo de pérdida.
- La lista de proyectos no tiene coincidencias con la búsqueda o filtros: ofrecer una forma clara de limpiar los filtros.
- Se intenta eliminar un proyecto mientras su registro aún se muestra en Inicio: actualizar ambas secciones de forma coherente.
- El trainer recarga o navega durante un guardado pendiente: conservar los cambios ya confirmados y no indicar “Guardado” antes de terminar la escritura.
- Un nombre contiene caracteres especiales o marcado HTML: mostrarlo como texto literal y no ejecutarlo.
- El trainer intenta abrir una sección aún no entregada, como el editor visual: no presentarla como funcional ni permitir una acción que prometa guardar/exportar capacidades futuras.

## Requisitos

### Requisitos funcionales

- **FR-001**: La app MUST presentar navegación lateral en español (Chile) con Inicio, Mis proyectos, Crear nuevo e Historial de SCORM, indicando la sección activa.
- **FR-002**: La app MUST permitir navegar entre las secciones disponibles usando mouse y teclado, con foco visible y nombres accesibles.
- **FR-003**: Inicio MUST mostrar una bienvenida, una acción principal para crear un simulador, hasta seis proyectos recientes y el estado real del almacenamiento local. Si no hay datos, MUST mostrar estados vacíos en vez de registros ficticios.
- **FR-004**: Mis proyectos MUST permitir ver los borradores guardados, buscar por nombre o cliente, filtrar por cliente y ordenar por nombre o fecha de actualización.
- **FR-005**: Crear nuevo MUST permitir ingresar únicamente los datos básicos del proyecto: nombre obligatorio y datos opcionales de cliente/rubro, descripción y autor. El nombre vacío o compuesto solo por espacios MUST rechazarse con un mensaje claro.
- **FR-006**: Un proyecto recién creado MUST identificarse como borrador, sin afirmar que ya tiene pasos o que está listo para exportar. En esta feature no se cargan capturas ni se configuran modos; esas capacidades se entregan en features posteriores.
- **FR-007**: La app MUST guardar los borradores y sus datos básicos en el navegador, conservarlos al recargar y mantener Inicio y Mis proyectos sincronizados.
- **FR-008**: Los cambios del borrador MUST guardarse automáticamente. La interfaz MUST distinguir al menos guardando, guardado y error; solo puede mostrar guardado después de confirmar la escritura.
- **FR-009**: La app MUST solicitar al navegador almacenamiento persistente cuando esté disponible y mostrar si fue concedido, denegado o no está disponible, sin prometer que el navegador nunca eliminará datos.
- **FR-010**: Cuando no se pueda persistir, la app MUST avisar claramente que el trabajo es temporal y no MUST presentarlo como guardado para futuras sesiones.
- **FR-011**: La app MUST permitir eliminar un borrador con confirmación, sincronizando la lista de proyectos y la vista de Inicio.
- **FR-012**: Historial de SCORM MUST mostrar un estado vacío mientras no existan exportaciones locales; no MUST atribuir a la app paquetes creados o importados fuera de ella.
- **FR-013**: La interfaz MUST usar el sistema visual de SimuPaso Studio: fondos claros, superficies blancas, acentos pastel serenos, tarjetas redondeadas y texto oscuro con contraste WCAG AA mínimo de 4,5:1 para texto normal.
- **FR-014**: La interfaz MUST funcionar en español (Chile), exponer estados y errores de forma accesible y renderizar los nombres y descripciones de proyectos como texto seguro.
- **FR-015**: La app MUST permanecer sin backend, cuentas, telemetría, peticiones de red externas ni recursos remotos.
- **FR-016**: La navegación y el contenido de las cuatro secciones MUST permanecer utilizables con un ancho de ventana de al menos 1024 px.
- **FR-017**: La app MUST representar de forma honesta las capacidades: editor visual, carga y edición de capturas, exportación desde la interfaz, historial con acciones, ayuda y ajustes completos no forman parte de esta feature.

### Entidades clave

- **Borrador de proyecto**: proyecto local recién creado con nombre y datos descriptivos; puede no tener capturas ni pasos y no está listo para exportar.
- **Estado de almacenamiento local**: estado que informa si los datos se pueden conservar entre sesiones y si la solicitud de persistencia del navegador fue concedida.
- **Registro de exportación**: elemento futuro del historial; esta feature no crea ni importa registros.

## Criterios de éxito

- **SC-001**: Una persona puede llegar a cualquiera de las cuatro secciones principales desde la navegación y volver a Inicio sin perderse ni necesitar instrucciones técnicas.
- **SC-002**: Una persona puede crear un borrador válido en menos de un minuto; su nombre aparece en Inicio y Mis proyectos después de guardarse.
- **SC-003**: Tras guardar un borrador y recargar la app en el mismo navegador, el 100 % de sus datos básicos confirmados siguen disponibles.
- **SC-004**: La interfaz comunica el estado de autoguardado y nunca indica éxito cuando el almacenamiento informa un fallo.
- **SC-005**: Inicio y Mis proyectos muestran estados vacíos correctos con cero proyectos; Historial de SCORM muestra cero exportaciones sin registros de demostración.
- **SC-006**: Con almacenamiento persistente no disponible, la advertencia es visible y la interfaz no indica que el borrador sobrevivirá al cierre.
- **SC-007**: El flujo de creación, búsqueda, filtrado y navegación puede completarse con teclado; el texto normal cumple contraste mínimo 4,5:1.
- **SC-008**: En uso normal de estas secciones, el navegador no solicita recursos a servidores externos.

## Supuestos y límites

- La app sigue siendo estática y sin backend; cada navegador mantiene su propia biblioteca local.
- Los proyectos creados en esta feature son borradores descriptivos con solo datos básicos. La carga de capturas, creación de pasos y edición visual se especifican en la feature 003; la selección de modos se especifica en la feature 006.
- La selección de modos, ajustes de puntaje, exportación SCORM desde la interfaz, `.simpaso`, respaldos completos y reconstrucción de historial quedan para las features correspondientes de la sección 22.
- El historial se presenta vacío porque la app aún no registra exportaciones locales; no se importan resultados de SCORM Cloud.
- La solicitud de almacenamiento persistente y su indicador no eliminan el riesgo de que el usuario borre los datos del navegador; respaldos y medidor de espacio se tratarán en la feature 007.
- El objetivo de pantalla es escritorio con ancho mínimo de 1024 px, según la guía visual del proyecto.
- Las referencias visuales de Inicio y Editor orientan el estilo; el Editor de la referencia no se implementa en esta feature.
