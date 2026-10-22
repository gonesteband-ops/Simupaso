# Implementation Plan: Contrato, reproductor mínimo y exportación SCORM 1.2

**Branch**: `001-contrato-player-scorm` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-contrato-player-scorm/spec.md`

## Summary

Entregar desde cero la base React + TypeScript + Vite y los artefactos de feature 001:
contrato versionado validable, reproductor vanilla TypeScript independiente, integración
SCORM 1.2, y módulo puro generador de ZIP reutilizable desde comando Node, pruebas y una
integración futura en navegador. Un fixture de dos pasos con imágenes ficticias verificará
las acciones mínimas y la distribución; no se construirá el editor visual ni se afirmará
compatibilidad con el LMS corporativo.

## Technical Context

**Language/Version**: TypeScript estricto, React y Node.js LTS (versión exacta fijada al crear el proyecto).
**Primary Dependencies**: Vite + React para la aplicación anfitriona; Zod para contrato y validación; `fflate` para empaquetado ZIP autocontenido.
**Storage**: Ninguno en esta feature; las respuestas del alumno solo viven temporalmente en el control activo.
**Testing**: Vitest (contrato, validadores, ZIP, manifiesto y umbral de peso), Playwright (red, interacciones y geometría de imagen/zona en cuatro resoluciones), API SCORM simulada; prueba manual en SCORM Cloud o plataforma gratuita alternativa confirmada.
**Target Platform**: Sitio estático de navegador; paquete SCORM 1.2 ejecutado en el navegador del LMS; generador invocable desde Node.
**Project Type**: Aplicación web estática con módulos TypeScript compartidos, reproductor independiente y adaptador CLI de desarrollo.
**Performance Goals**: Inicio del reproductor < 2 s con el fixture; suma de bytes comprimidos de las entradas de runtime del reproductor en el ZIP < 250 KiB, excluyendo imágenes y el contrato JSON.
**Constraints**: Sin backend, persistencia, cuentas, telemetría ni recursos remotos; ZIP determinista; rutas SCORM relativas con `/`; paquete de prueba solo con datos ficticios.
**Scale/Scope**: Fixture demostrativo de dos pasos; acciones de clic, texto e informativa; modo guiado. Sin editor, puntaje ni reanudación.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Antes de investigación | Después del diseño |
|---|---|---|
| Frontend-only; capturas y datos locales, sin peticiones externas | PASS — este alcance usa fixture sintético; sin almacenamiento o servidor | PASS — el módulo de empaquetado no accede a red; la prueba alojada recibe solo el ZIP ficticio |
| Contrato versionado como fuente de verdad; SCORM autocontenido | PASS — contrato compartido por reproductor y exportador | PASS — esquema común, player compilado aparte y recursos locales incluidos |
| Privacidad: no reportar lo escrito; contraseñas no persistidas; redacciones cuando correspondan | PASS — entradas descartadas al completar/abandonar; no hay redacciones en fixture | PASS — adaptador limita reporte a estado/ubicación/tiempo; no se empaquetan datos de entrada |
| Pruebas de contrato, texto/RUT, puntaje, almacenamiento y exportador | PASS — plan cubre contrato, cuatro validaciones, RUT y empaquetador | PARCIAL POR ALCANCE — las pruebas exigidas para contrato/texto/exportador se implementan ahora; puntaje (feature 006) y almacenamiento local (feature 002/007) no existen en 001 y se cubren en sus features |
| Español (Chile), accesibilidad y datos ficticios | PASS — fixture en español, sintético; teclado, foco y contraste son requisitos | PASS — pruebas del player y fixture verifican los criterios aplicables |
| Compatibilidad LMS solo tras prueba real | PASS — compatibilidad corporativa no se presume | PASS — candidato SCORM Cloud (prueba gratuita, sujeto a confirmar cuenta/condiciones); esta validación no cierra la integración, pues la prueba en el LMS corporativo real sigue siendo requisito antes de cerrar la integración |

No se requieren excepciones constitucionales. La falta de pruebas de puntuación y
almacenamiento en feature 001 se debe a que esos comportamientos no pertenecen a este
alcance; el plan los reserva explícitamente para las features que los introducen.

## Project Structure

### Documentation (this feature)

```text
specs/001-contrato-player-scorm/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── project-contract.md
│   ├── generator-api.md
│   └── scorm-runtime.md
└── tasks.md                 # generado después por /speckit.tasks
```

### Source Code (repository root)

```text
index.html
vite.config.ts
src/
├── app/                     # anfitrión React/Vite mínimo; sin editor en 001
├── contract/                # tipos, esquemas Zod y versión de contrato
├── player/                  # entrada HTML + runtime vanilla TypeScript aislado
├── scorm/                   # adaptador SCORM 1.2 y modo autónomo
├── exporter/                # generador puro ZIP y manifiesto
├── cli/                     # envoltorio Node para exportar fixture
└── fixtures/                # proyecto e imágenes totalmente sintéticos
tests/
├── contract/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: Un único proyecto Vite/React/TypeScript, sin backend. El runtime
del reproductor se mantiene como entrada HTML/TS independiente, sin importar React ni el
editor. Una compilación Vite dedicada con `base: './'` genera `dist/player/` y una lista
de artefactos con rutas relativas. Un paso de build empaqueta esa lista y sus bytes en
`src/exporter/player-bundle.json`; tanto el adaptador Node como la futura UI importarán
ese mismo contenido para invocar el core generador, que recibe proyecto, assets, bundle
del player y metadatos de presentación, y devuelve ZIP. Ambos entornos usan los mismos
bytes de los artefactos compilados y la misma transformación determinista de rutas del
HTML raíz; no resuelven rutas de filesystem en el core ni acceden a red. El fixture
tendrá SVGs y al menos un PNG ficticios locales, ambos con dimensiones naturales
verificables. La interfaz de creación y el uso del generador desde UI quedan para
feature 002.

## Phase 0: Outline & Research

- Confirmar una librería ZIP que funcione tanto en navegador como en Node y permita una
  salida repetible con metadatos controlados.
- Definir el esquema versionado y validación como fuente única, con tipos TypeScript y
  JSON Schema exportable para documentación/interoperabilidad.
- Medir el player construido con Zod; el test debe fallar sobre 250 KiB de entradas
  comprimidas de runtime. Si excede, sustituir la validación de runtime por Valibot
  modular y volver a medir antes de aceptar la compilación.
- Confirmar el contrato mínimo de comunicación SCORM 1.2 que ya acota la especificación.
- Identificar un LMS web de prueba gratuito, verificar disponibilidad antes de usarlo y
  definir que solo se subirá el paquete sintético. Aunque esta prueba pase, validar
  también en el LMS corporativo antes de cerrar la integración.

Las decisiones y las fuentes consultadas se registran en `research.md`.

## Phase 1: Design & Contracts

- Modelar los datos, validaciones, zonas, acciones, sesión y paquete en `data-model.md`.
- Especificar los contratos del proyecto, API del generador y adaptador SCORM en
  `contracts/`.
- Definir instalación, pruebas, ejecución del reproductor y exportación del fixture en
  `quickstart.md`.
- Añadir prueba Playwright de dimensiones naturales, imagen sin deformación y alineación
  de zonas con PNG y SVG en 1024×600, 1366×768, 1920×1080 y 2560×1440; tolerancia
  máxima de 1 CSS px entre el rectángulo visible esperado y la zona renderizada.
- Añadir prueba automática del presupuesto de 250 KiB y pruebas de manifiesto XML
  bien formado y de paths `/` en cada archivo del ZIP.
- Mantener `QWEN.md` apuntando únicamente a `AGENTS.md` y `PROGRESS.md`.
- Mantener la validación del LMS corporativo como requisito antes de cerrar la
  integración; la prueba de SCORM Cloud solo acredita ese servicio y no la sustituye.
- Volver a evaluar todos los gates constitucionales tras el diseño.

## Phase 2: Planning Handoff

Este comando no crea `tasks.md` ni implementa código. Tras aprobación del plan, la etapa
`/speckit.tasks` dividirá setup, pruebas e implementación por historias de usuario.

## Complexity Tracking

No hay violaciones constitucionales ni se justifican capas de backend, almacenamiento o
UI de edición. La separación entre player, contrato, exportador y CLI existe para
mantener el reproductor desacoplado y permitir que el mismo generador se use en Node y
en el navegador.
