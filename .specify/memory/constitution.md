<!--
Sync Impact Report
- Version change: plantilla sin ratificar -> 1.0.0 (adopción inicial).
- Principios reemplazados: marcadores de plantilla -> I-X, basados en la sección 23 de idea_editor_simuldor.md.
- Secciones agregadas: Restricciones adicionales; Flujo de desarrollo.
- Secciones eliminadas: ninguna; se completaron las secciones 2 y 3 de la plantilla.
- Plantillas sincronizadas: plan-template.md ✅; tasks-template.md ✅.
- Comandos sincronizados: .qwen/commands/speckit.tasks.md ✅.
- Revisados sin cambios: spec-template.md; AGENTS.md (ya consistente).
- Pendientes: ninguno.
-->

# Constitución de SimuPaso Studio

## Core Principles

### I. Sin backend y procesamiento local
La versión 1 MUST operar sin backend, cuentas ni base de datos de servidor. Las capturas
de CRM y los datos de los proyectos MUST procesarse en el navegador y no enviarse a
servicios externos. Esta regla protege la información de los clientes y permite publicar
la aplicación como sitio estático.

### II. Contrato versionado como fuente de verdad
El contrato de datos MUST ser la fuente de verdad compartida por el editor, el reproductor
y el exportador. MUST estar versionado, validarse antes de usarse y contar con migraciones
cuando corresponda. Un cambio incompatible exige una versión mayor y una migración
explícita.

### III. SCORM autocontenido
Todo paquete SCORM MUST incluir localmente el reproductor, los datos y los recursos que
necesita. MUST usar rutas relativas con `/` y no depender de CDN, fuentes remotas,
telemetría ni otros recursos externos. El reproductor distribuido MUST permanecer
desacoplado del editor.

### IV. Privacidad por defecto
El reproductor MUST no reportar al LMS lo que escribe el alumno, salvo habilitación
explícita del trainer y advertencia previa. Las contraseñas simuladas MUST nunca
reportarse. Las imágenes del SCORM MUST contener las redacciones aplicadas y no incluir
los originales; ocultar información en el paquete debe impedir recuperar sus píxeles
originales.

### V. Uso simple para trainers
Las funciones MUST poder completarse por trainers sin conocimientos técnicos. La interfaz
debe comunicar acciones, validaciones, errores y riesgos con lenguaje claro, sin exigir
configuración técnica ni pasos ocultos.

### VI. Compatibilidad con LMS demostrada
El proyecto MUST distinguir entre cumplimiento técnico de SCORM y compatibilidad probada
con un LMS específico. No se afirmará compatibilidad con un LMS hasta importar y probar el
paquete en ese LMS real, verificando apertura, estado, puntaje y reanudación según el
alcance de la feature.

### VII. Pruebas obligatorias
Las pruebas automatizadas MUST cubrir el esquema del contrato, las validaciones de texto
(incluido RUT chileno), el puntaje, el almacenamiento local y el exportador SCORM. Cada
feature MUST añadir pruebas para sus comportamientos críticos y ejecutar las pruebas
pertinentes antes de considerarse terminada. Las pruebas no reemplazan la validación
manual con un LMS real cuando esta sea requerida.

### VIII. Accesibilidad y español de Chile
La interfaz de trainer y el reproductor MUST usar español (Chile), soportar operación
por teclado y conservar foco visible, anuncios accesibles y contraste mínimo AA. La
accesibilidad forma parte de los criterios de aceptación, no es trabajo opcional de
pulido.

### IX. Datos ficticios en ejemplos
Ejemplos, pruebas y demos MUST usar únicamente datos y capturas ficticios. Está prohibido
incluir datos personales reales o capturas de clientes en el repositorio, las pruebas o
los materiales de demostración.

### X. Entregas pequeñas y verificables
El trabajo MUST seguir la partición de features definida en la sección 22 de
`idea_editor_simuldor.md`, en orden y de a una feature. Cada entrega debe tener un
resultado demostrable y criterios verificables; no se debe anticipar trabajo de features
posteriores salvo una dependencia imprescindible y justificada.

## Additional Constraints

- La versión 1 usa React, TypeScript y Vite y se distribuye como sitio estático.
- No se incorporarán backend, base de datos de servidor, cuentas de usuario, telemetría
  ni dependencias de recursos remotos.
- La aplicación y los paquetes SCORM deben funcionar sin realizar peticiones de red
  externas; la comunicación propia del LMS mediante su API SCORM local es la excepción
  funcional prevista para el paquete.
- El idioma de la interfaz es español (Chile). No se agregarán idiomas adicionales a la
  interfaz en la versión 1 sin aprobar un cambio de alcance.
- No se declarará probado un comportamiento que dependa de un LMS real hasta ejecutar y
  documentar esa prueba en dicho LMS.

## Development Workflow

- El ciclo de Spec Kit se ejecuta en orden: constitution, specify, clarify, plan, tasks e
  implement. Cada etapa debe quedar registrada antes de pasar a la siguiente.
- Las ambigüedades de producto que afecten el comportamiento se resuelven en clarify con
  la persona usuaria; no se convierten en supuestos silenciosos.
- El plan debe incluir un control explícito de conformidad con esta constitución antes
  de investigación e implementación, y repetirlo después del diseño.
- Las tareas deben incluir las pruebas exigidas por la constitución o por la
  especificación. Las pruebas que no sean exigidas por esos criterios pueden tratarse
  según el riesgo y alcance de la feature.
- Antes de cerrar una etapa se revisan los archivos afectados, se ejecutan las
  verificaciones pertinentes y se actualiza `PROGRESS.md` con cambios, decisiones,
  errores, resultados y próximo paso.

## Governance

Esta constitución es la referencia normativa para especificaciones, planes, tareas,
implementación y revisión del proyecto. Si otro artefacto entra en conflicto con ella,
debe corregirse o proponerse una enmienda antes de continuar.

Toda enmienda debe actualizar este documento, registrar su motivo y fecha en
`PROGRESS.md`, sincronizar las plantillas y comandos de Spec Kit afectados, y revisar la
conformidad de las features activas. El número de versión sigue semver: MAJOR para
cambios incompatibles, MINOR para principios o requisitos nuevos, PATCH para
aclaraciones que no alteren obligaciones.

Las revisiones de planes e implementaciones deben comprobar los principios aplicables,
la privacidad local, la ausencia de dependencias de red externas y las pruebas
obligatorias. No se aceptarán excepciones implícitas; cualquier desviación debe
documentarse, justificarse y aprobarse antes de implementarla.

**Version**: 1.0.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-18
