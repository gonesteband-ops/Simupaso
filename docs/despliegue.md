# Entrega a TI: SimuPaso Studio

## Qué es

Aplicación web **estática** para crear simuladores a partir de capturas y exportarlos como
paquetes **SCORM 1.2**. No tiene backend, base de datos, cuentas de usuario ni telemetría.

- Repositorio: `https://github.com/gonesteband-ops/Simupaso`
- Rama: `main`
- Commit de referencia: `5d4374e`
- Node requerido para construir: **24.13.1** (solo en build; no en producción)

## Cómo publicarla

### Opción A: servidor estático interno (recomendada para uso corporativo)

1. Construir una vez:
   ```text
   npm ci --include=dev
   npm run build
   ```
2. Publicar el contenido de `dist/` en IIS, Nginx, Apache u otro servidor estático con HTTPS.
3. No se necesita Start Command, proceso Node, proxy inverso ni base de datos.

La app usa rutas relativas (`base: "./"`), por lo que funciona en la raíz o en una subruta
interna. No hay router de cliente; no se necesita una regla de rewrite para SPA. Sí deben
existir `index.html`, `preview.html`, `assets/` y `player/` dentro de `dist/`.

### Opción B: hosting estático externo

Render (u otro hosting estático) con:

- Build Command: `npm ci --include=dev && npm run build`
- Publish Directory: `dist`
- Variable: `NODE_VERSION=24.13.1`
- Sin Start Command, secretos ni variables de aplicación.

Para datos de clientes, usar la opción interna o restringir el acceso por red/SSO.

## Datos y privacidad

- La lista de borradores se guarda en `localStorage`.
- El documento, las capturas y los difuminados se guardan en **IndexedDB** del navegador.
- Cada navegador/perfil/origen tiene su propia biblioteca. No hay sincronización ni
  biblioteca compartida.
- Limpiar los datos del sitio elimina los proyectos locales. Todavía no hay exportación,
  importación ni respaldo del proyecto editable.
- La app no hace peticiones de red externas ni carga CDN, fuentes o telemetría.
- Las capturas originales no salen del navegador. Los difuminados se aplican a la copia que
  va en la vista previa y en el SCORM.
- La app no tiene login propio. El control de acceso debe hacerse en la red, el SSO o el
  proxy corporativo.

## SCORM

- El trainer descarga el paquete desde el botón **Descargar SCORM 1.2**.
- El ZIP es autocontenido, usa SCORM 1.2 y no realiza llamadas externas.
- El paquete se sube manualmente al LMS.
- **Pendiente**: validar apertura, finalización y reporte en el LMS corporativo real. No se
  declara compatibilidad hasta completar esa prueba.
- El paquete contiene las imágenes ya redactadas y `project.json`; no contiene los
  originales sin difuminar.

## Requisitos de uso

- Navegador Chromium actual (Chrome/Edge). Firefox reciente es deseable; Safari no se ha
  probado.
- Escritorio, ventana mínima recomendada de 1024×600.
- Las capturas admitidas son PNG, JPG o WebP de hasta 10 MB.

## Pendientes conocidos

- Exportar/importar proyecto editable (`.simpaso`) y respaldos locales.
- Validación en el LMS corporativo.
- Anotaciones de la feature 004 (el difuminado ya está implementado).
- Prueba en Safari.
- Modo de visualización 100 % con scroll (hoy la captura se ajusta al espacio disponible).
