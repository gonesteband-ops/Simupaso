# Reglas del agente

## Proyecto
SimuPaso Studio: aplicación web **sin backend** (React + TypeScript + Vite) para que trainers de un call center creen simuladores a partir de capturas de pantalla de CRM y los exporten como paquetes **SCORM 1.2**. La descripción completa está en `idea_editor_simuldor.md`; esa es la fuente de la idea.

## Idioma y estilo
- Responde siempre en español.
- Los textos de la interfaz van en español (Chile).
- Cambios pequeños y verificables. Ejecuta las pruebas antes de dar una tarea por terminada.

## Flujo de trabajo
- Antes de actuar, lee en este orden: `PROGRESS.md`, `idea_editor_simuldor.md` y `.specify/memory/constitution.md`.
- Sigue el flujo de Spec Kit en orden: constitution → specify → clarify → plan → tasks → implement. No saltes etapas.
- Trabaja una feature a la vez, según la partición de la sección 22 de `idea_editor_simuldor.md`.
- Si algo es ambiguo, pregunta; no inventes requisitos.
- No agregues dependencias externas (CDN, fuentes remotas, servicios, telemetría) sin avisar y justificar. El paquete SCORM debe ser autocontenido.
- No agregues backend, base de datos de servidor ni cuentas de usuario: están fuera del alcance de la v1.
- No borres ni sobrescribas `idea_editor_simuldor.md` ni `PROGRESS.md`.
- No uses datos personales reales ni capturas reales de clientes en ejemplos, pruebas ni demos.

## Diseño
- Antes de crear o modificar pantallas, revisa las imágenes de `docs/referencia-visual/` (si existen) y la sección 17 de `idea_editor_simuldor.md`.
- Estilo: minimalista y moderno, paleta pastel (azul sereno, lavanda, menta), fondo blanco o gris muy claro, menú lateral izquierdo, tarjetas redondeadas.
- El texto sobre colores pastel debe ser oscuro y cumplir contraste AA.
- Las capturas de CRM de la referencia visual son ficticias y solo sirven de ejemplo de estilo.

## Registro de avance (obligatorio)
El archivo `PROGRESS.md` en la raíz del proyecto es la memoria compartida entre agentes. Otro agente debe poder continuar solo leyéndolo.

- **Si `PROGRESS.md` no existe, créalo de inmediato** con esta estructura:

```markdown
# Bitácora de avance

> Los agentes leen este archivo al iniciar y lo actualizan al terminar cada tarea. Solo se agrega, nunca se borra el historial.

## Estado actual
- Proyecto:
- Feature en curso:
- Etapa Spec Kit: (constitution / specify / clarify / plan / tasks / implement)
- Última tarea completada:
- Próxima tarea:
- Bloqueos o dudas pendientes:

## Decisiones tomadas
- (fecha) Decisión y motivo

## Historial
- (fecha, agente) Qué se hizo, qué archivos se crearon o cambiaron, resultado de las pruebas
```

- **Al iniciar cualquier sesión:** lee `PROGRESS.md` completo antes de hacer nada y retoma desde "Próxima tarea".
- **Al terminar cada tarea, comando de Spec Kit o decisión importante:** actualiza "Estado actual", agrega la decisión (si hubo) y añade una línea al "Historial" con fecha y nombre del agente o modelo.
- **Registra siempre** las respuestas dadas en `/clarify`, los comandos de instalación ejecutados, los errores encontrados y cómo se resolvieron.
- **Si estás por quedarte sin contexto o tokens:** antes de detenerte, deja escritos con claridad el estado actual, lo que quedó a medias y la próxima tarea.
- **Nunca borres el historial;** solo agrega. Si una decisión cambia, anota el cambio y el motivo, sin eliminar la anterior.
- Si `PROGRESS.md` y el código no coinciden, avisa y reconcilia revisando `git status` y `specs/` antes de continuar.

## Calidad
- Pruebas obligatorias para: esquema del contrato, validaciones de texto (incluido RUT), puntaje, almacenamiento local y exportador SCORM.
- No afirmes compatibilidad con un LMS hasta probar el paquete en el LMS real.
- Verifica que el reproductor y el SCORM no hagan peticiones de red externas.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
