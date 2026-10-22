# Quickstart: Editor núcleo (feature 003)

**Feature**: `003-editor-nucleo` | **Fecha**: 2026-10-20

Esta guía permite ejecutar y verificar la feature 003 después de implementarla. No
reemplaza las pruebas automatizadas ni afirma compatibilidad con ningún LMS.

## 1. Requisitos

- Node.js 24.13.1 (ver `.nvmrc` y `engines` de `package.json`).
- npm.
- Navegador Chromium para las pruebas E2E y Chrome/Edge/Firefox actuales para uso manual.

## 2. Instalación

```powershell
npm ci
```

`fake-indexeddb@6.2.6` ya está fijado en `package.json` como **dependencia de desarrollo**
y se usa en Vitest; no se incluye en el bundle de la aplicación ni en el paquete SCORM. No
se agregaron dependencias de ejecución.

## 3. Comandos de verificación

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run build` debe generar la aplicación con `index.html` y `preview.html`, además del
reproductor independiente en `dist/player/` y el bundle usado por el exportador. La vista
previa usa el mismo runtime del reproductor, pero no forma parte del ZIP SCORM.

## 4. Recorrido manual

Usar únicamente capturas ficticias. La imagen `src/fixtures/assets/search-demo.png` es
sintética y sirve para las pruebas; no usar capturas de clientes reales.

1. Ejecutar `npm run dev` y abrir la URL local.
2. Crear un borrador en **Crear nuevo** con un nombre ficticio, por ejemplo
   "Consulta de demostración".
3. Abrir el borrador desde **Mis proyectos**.
4. En el editor, cargar una o dos copias de `search-demo.png` con nombres
   `captura-1.png` y `captura-2.png`. Verificar que se crean dos pasos en ese orden y que
   aparece el aviso de privacidad.
5. Reordenar los pasos arrastrando una miniatura y comprobar que la numeración cambia.
6. Seleccionar el primer paso, elegir la herramienta de zona de clic y dibujar un
   rectángulo sobre la imagen. Moverlo, redimensionarlo y editar sus coordenadas en el
   panel.
7. Agregar una segunda zona de clic y cambiar la regla entre "basta una" y "todas".
8. Agregar una zona de texto, definir etiqueta "Código ficticio", validación "valor
   exacto", un valor de prueba y un mensaje de error. Repetir con validación RUT y
   comprobar que el editor permite el modo con o sin puntos y guion.
9. Usar deshacer y rehacer varias veces; confirmar que las zonas y los datos del paso
   vuelven al estado esperado.
10. Cambiar el zoom, ajustar a pantalla y redimensionar la ventana; confirmar que las zonas
    siguen alineadas con la imagen.
11. Recargar la página y abrir el proyecto de nuevo; confirmar que pasos, imágenes, orden,
    zonas y propiedades se conservan.
12. Abrir **Vista previa** desde el paso seleccionado; completar las interacciones en modo
    guiado y cerrar con Escape o el botón correspondiente. Confirmar que se vuelve al mismo
    paso del editor.
13. Marcar un paso como informativo, definir el texto del botón y comprobar que la vista
    previa avanza sin exigir zonas.
14. Elegir la herramienta **Difuminar (B)**, dibujar sobre un dato ficticio sensible y
    comprobar en la vista previa que la zona aparece oculta en la imagen. Probar también
    pixelar y difuminar.
15. Pulsar **Descargar SCORM 1.2**, marcar la confirmación de privacidad y confirmar que se
    descarga un ZIP con `imsmanifest.xml`, `index.html`, `data/project.json` y el
    reproductor en `player/`.
16. Abrir las herramientas de desarrollo del navegador, filtrar por red y confirmar que no
    hay peticiones a dominios externos durante la carga, la edición, la vista previa ni la
    exportación.

## 5. Qué debe verificar cada prueba

| Nivel | Cobertura esperada |
|---|---|
| Unitaria | Reglas de imagen (MIME, 10 MB, orden por nombre), geometría y recorte a bordes, reducer e historial, compilación al contrato, validaciones de texto y RUT |
| Unitaria de almacenamiento | Guardar/cargar documento y assets con `fake-indexeddb`, error de cuota, borrado en cascada y documento inexistente |
| Integración | Ciclo borrador → documento → recarga → documento; lista de borradores sincronizada; eliminación sin huérfanos |
| E2E | Carga múltiple, orden, reordenamiento, dibujo y edición de zonas, teclado, deshacer/rehacer, persistencia tras recarga, alineación a varios zooms, vista previa en iframe, formulario superpuesto, descarga SCORM y ausencia de red |
| Regresión | Contrato, RUT, exportador SCORM, player y límite de 250 KiB siguen pasando |

## 6. Comprobaciones específicas de la feature

### Alineación

Dibujar una zona, cambiar el zoom a 50 %, 100 % y ajuste a pantalla, y medir la diferencia
entre la zona renderizada y la región correspondiente de la imagen. La tolerancia máxima es
1 CSS px.

### Persistencia

Después de recargar, el documento debe leerse desde IndexedDB y la lista de borradores debe
mostrar el mismo `stepCount` y `updatedAt` que antes. Si IndexedDB no está disponible, el
editor debe avisar que el trabajo es temporal; no debe mostrar "Guardado" de forma
permanente.

### Vista previa

La vista previa debe ejecutarse en un iframe con el mismo CSS y runtime del reproductor, en
modo guiado, sin adaptador SCORM. No debe haber llamadas a `LMSInitialize` ni a
`LMSCommit`. Cerrar la vista previa no debe alterar el documento.

### Tamaño de la simulación

La captura ocupa todo el ancho disponible del reproductor y el lienzo aprovecha la altura de
la ventana; no se reserva una columna lateral vacía. El botón **Pantalla completa** amplía
la simulación si el navegador y el LMS lo permiten; si se bloquea, se muestra un aviso sin
detener la actividad. El aviso de 1024×600 es una recomendación. Una captura de 1919 px
siempre se reduce en una ventana de 1024 px; para verla cerca de su tamaño real hay que usar
una ventana más grande o pantalla completa.

### Formulario realista

Si un paso tiene al menos una zona de texto y una zona de clic, los campos de texto se
muestran simultáneamente sobre la captura, en el rectángulo de cada zona. Al pulsar la zona
de clic se validan todos; Enter en cualquier campo también envía. La zona de clic del
formulario no muestra el recuadro azul de guía. Los campos enmascarados se ven como
contraseña y no se guardan ni reportan. El tamaño de la letra se ajusta por zona en el panel
de propiedades, como porcentaje del alto de la zona (10–100 %, 28 % por defecto); un valor
menor reduce la letra. Al pasar el mouse o enfocar un campo se muestra un globo con su
placeholder o etiqueta. Este modo se activa automáticamente al compilar el paso; los
proyectos sin `formMode` conservan el flujo secuencial.

### Difuminado de datos sensibles

La herramienta **Difuminar (B)** crea rectángulos de redacción sobre la captura. En el panel
**Difuminado** se elige **Ocultar (bloque sólido)**, **Difuminar** o **Pixelar**, y se ajusta
la intensidad. La redacción es no destructiva en el editor; al previsualizar o exportar se
aplica de verdad a la imagen, de modo que el SCORM no contiene los píxeles originales. El
original permanece solo en IndexedDB. Antes de descargar se exige confirmar que se revisaron
los datos personales. Para datos muy sensibles, usar **Ocultar**; el desenfoque y el
pixelado pueden ser menos seguros.

### Respaldo editable

El botón **Descargar respaldo** genera un archivo `.simpaso` con el proyecto editable, las
capturas originales y los rectángulos de difuminado. Incluye imágenes sin difuminar, por lo
que se exige confirmación y no debe subirse al LMS ni compartirse sin control. La importación
del respaldo todavía no está implementada.

### Exportación

El botón **Descargar SCORM 1.2** compila el documento al contrato, valida el proyecto y las
capturas, arma el ZIP con el reproductor y lo descarga. Si falta una zona, una validación o
una captura, muestra la lista de problemas y no descarga nada. El paquete no incluye el
editor ni `preview.html`. El historial y las validaciones previas completas pertenecen a la
feature 007; esta descarga es un avance provisional.

### Privacidad

- Las capturas no salen del navegador.
- Los campos enmascarados no guardan valores.
- El editor no usa `innerHTML` con contenido del trainer.
- No se cargan fuentes, íconos, scripts ni estilos remotos.

## 7. Limitaciones conocidas de esta entrega

- No se incluyen anotaciones, difuminado, scroll, selección, vínculos entre pasos ni zonas
  distractoras (features 004 y 005).
- No se incluyen modos práctica/evaluación, puntaje, pistas en el reproductor, reanudación
  ni panel de simulador de LMS (feature 006).
- La descarga SCORM 1.2 ya está disponible como avance provisional de la 007. El historial de exportaciones, los snapshots y la validación previa completa siguen pendientes de la feature 007.
- No se reemplaza una captura conservando zonas, no se unen capturas y no se recortan
  (feature 008).
- No se edita el nombre del proyecto en el editor; se conserva el de la feature 002.
- La vista previa es una instantánea y no refleja ediciones hechas mientras está abierta.
- El formulario superpuesto usa un fondo blanco neutro para cubrir el campo de la captura; si el CRM usa otro color, el recuadro puede notarse. La personalización visual del campo queda para una mejora posterior.
- El modo formulario se activa automáticamente cuando un paso tiene texto y clic; todavía no hay un interruptor manual en el panel.
- El difuminado se configura por imagen; todavía no existe “aplicar a todas las imágenes”. Si el mismo asset se usa en varios pasos, comparte las redacciones.
- El globo de ayuda aparece en los campos superpuestos del formulario; en el flujo secuencial las etiquetas ya están visibles.
- El historial de deshacer/rehacer es de la sesión y se pierde al recargar; el último
  estado guardado se conserva.
- No se afirma compatibilidad con ningún LMS en esta feature; el gate corporativo de la
  feature 001 sigue pendiente.

## 8. Solución de problemas

| Síntoma | Revisión |
|---|---|
| "No se pudo guardar" | Confirmar que el navegador permite IndexedDB y que hay cuota disponible; revisar que no se esté en una ventana privada con almacenamiento bloqueado |
| La imagen no se agrega | Verificar que sea PNG, JPG o WebP y que no supere 10 MB |
| La vista previa no abre | Revisar que el proyecto tenga al menos un paso, que cada paso interactivo tenga zonas y que las validaciones estén completas |
| Las zonas se desalinean | Confirmar que no se modificó el tamaño natural de la imagen; reportar con el zoom y el tamaño de ventana usados |
| Error al cargar `preview.html` | Verificar que la compilación incluya la entrada de vista previa y que la app se sirva con `base: "./"` |
