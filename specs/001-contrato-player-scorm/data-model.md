# Modelo de datos: Feature 001

El contrato JSON versionado es la fuente única de verdad para validación, runtime y
exportación. Los objetos no contienen el estado persistente del trainer ni datos de
entrada del alumno.

## Entidades

### Proyecto de simulación (`Project`)

- `schemaVersion`: versión de contrato soportada (inicial: `"1.0"`).
- `id`: identificador estable del proyecto.
- `meta`: `title`, idioma `es-CL`, descripción opcional y versión visible del simulador.
- `settings`: modo permitido/predeterminado; en esta entrega solo `guided`.
- `assets`: recursos locales identificados por `id`, path relativo, MIME y dimensiones
  naturales `width` y `height`.
- `steps`: dos o más pasos en orden de recorrido lineal, con id, título, instrucción,
  id de recurso y acciones requeridas.
- `completion`: texto de finalización no ejecutable.
- `annotations` por paso: propiedad opcional de extensión serializable como JSON; el
  runtime de esta entrega la ignora. No se dibuja ni se valida semánticamente aquí.

### Recurso (`Asset`)

- `id`: identificador único dentro del proyecto.
- `file`: ruta relativa al paquete (por ejemplo `assets/crm-demo-1.svg`).
- `mime`: tipo de imagen permitido para el fixture; no se usa URL de red.
- `width`, `height`: enteros positivos de la imagen natural.
- Contenido binario de la imagen se entrega al empaquetador por separado del objeto
  JSON del proyecto.
- El fixture sintético debe incluir al menos una imagen PNG y una SVG; ambas tienen
  dimensiones naturales documentadas y deben conservarlas para pruebas de escalado.

### Paso (`Step`)

- `id`: identificador único.
- `title`, `instruction`: texto literal en español de Chile.
- `assetId`: referencia obligatoria a un `Asset`.
- `actions`: lista ordenada de acciones; todas deben completarse para avanzar.
- `annotations?`: extensión opcional reservada.

### Zona (`Rect`)

- `x`, `y`, `w`, `h`: números normalizados respecto de la imagen natural.
- Invariantes: `0 <= x,y`; `w,h > 0`; `x + w <= 1`; `y + h <= 1`.
- Renderización: transformar coordenadas al rectángulo realmente visible de la imagen
  escalada proporcionalmente; los márgenes de letterbox no cuentan como parte de ella.

### Acción (`Action`)

- `ClickAction`: uno o más rectángulos válidos; clic fuera de zona produce mensaje
  accesible no bloqueante y no completa la acción.
- `InputAction`: rectángulo, etiqueta y discriminante de validación:
  - `non_empty`: cadena de longitud mayor que cero; no se aplica normalización no
    especificada por el contrato.
  - `equals`: coincidencia con el valor esperado.
  - `one_of`: coincidencia con uno de los valores permitidos.
  - `rut`: validar formato y dígito verificador chileno; con normalización habilitada,
    aceptar RUT con o sin puntos y con o sin guion.
- `masked`: marca un input de contraseña simulado; el valor solo existe durante la
  entrada activa, se enmascara, se descarta al abandonar la acción y no forma parte del
  contrato, almacenamiento persistente, paquete ni datos LMS.
- `InfoAction`: texto literal y control accesible para confirmar lectura y continuar.

### Sesión de ejecución (`RuntimeSession`)

Datos volátiles solamente: índice/id del paso actual, id/índice de acción, estado de
inicialización y reloj monotónico de inicio. No contiene los valores escritos. El
adaptador SCORM reporta `incomplete` al iniciar y `completed` al finalizar, guarda
`lesson_location` como identificador/posición del paso y formatea `session_time` para
SCORM 1.2. No se define recuperación después de cerrar, que corresponde a otra feature.

### Paquete SCORM

- Un `imsmanifest.xml` con un solo SCO y referencias relativas completas.
- HTML/CSS/JS autónomos del player, `data/project.json` y bytes de assets procesados.
- Ninguna dependencia de red remota; no incluye entrada del alumno ni datos originales
  distintos del fixture ficticio.
- Las rutas se ordenan establemente y las fechas/metadatos ZIP se fijan para reproducir
  los mismos bytes con la misma entrada y versión de dependencias.

### Bundle compilado del reproductor (`PlayerBundle`)

- Es una colección ordenada de `{ path, bytes }` producida desde el build Vite
  independiente del player.
- Incluye `index.html`, JS, CSS y todos los recursos locales referenciados por ellos.
- Cada `path` es relativo y usa `/`; no contiene origen de servidor ni URL remota.
- Node CLI y futura integración de navegador consumen la misma representación local
  generada, y la pasan al módulo puro de exportación junto con el proyecto y sus assets.

## Relaciones e invariantes

- Cada paso referencia un único recurso existente; un recurso puede ser referido por más
  de un paso.
- Los ids de proyectos, recursos, pasos y acciones son únicos dentro del ámbito
  correspondiente.
- El fixture debe incluir al menos una acción de clic, una de texto y una informativa en
  dos pasos, además de recursos PNG y SVG ficticios.
- El esquema rechaza referencias rotas, versiones de contrato desconocidas y rectángulos
  fuera de límites antes de reproducir o exportar.
- Todo texto del proyecto se inserta como texto DOM, nunca como HTML.
- La salida SCORM no contiene valores de campos, incluidos los campos enmascarados.
