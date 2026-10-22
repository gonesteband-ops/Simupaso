# idea_editor_simuldor.md — SimuPaso Studio: aplicación web para crear simuladores de sistemas (CRM) y exportarlos como SCORM

> Documento de idea para Spec Kit (`/constitution`, `/specify`, `/clarify`, `/plan`, `/tasks`).
> **Empieza desde cero.** Reemplaza cualquier idea, constitución o especificación anterior del proyecto.
> Describe el mundo ideal. Las secciones **[Sugerencia técnica]** son orientativas y se deciden en `/plan`.
> Las **[Preguntas abiertas]** de la sección 27 deben resolverse en `/clarify`.

---

## 1. Resumen

Somos un call center que atiende a empresas de distintos rubros. Los **trainers** capacitan a personal nuevo, pero no pueden entregarles claves de los CRM o sistemas de los clientes, y los nuevos ingresos temen equivocarse en un sistema real.

**SimuPaso Studio** es una **aplicación web sin backend** (solo frontend, publicada como sitio estático por una URL) donde un trainer, sin conocimientos técnicos:

1. Sube **capturas de pantalla** reales del sistema.
2. Marca sobre cada captura dónde se hace clic, dónde se escribe, dónde se hace scroll, y agrega anotaciones y difuminado de datos sensibles.
3. Define instrucciones, pistas, validaciones y modos de práctica o evaluación.
4. **Exporta un paquete SCORM 1.2** que sube a su LMS, donde los alumnos practican el procedimiento sin riesgo.

Todo ocurre **dentro del navegador del trainer**: las capturas nunca viajan a un servidor. La aplicación guarda proyectos, un historial de SCORM creados y configuraciones en el almacenamiento del propio navegador, con respaldos en archivos.

Ejemplo de uso (solo ilustrativo, el producto es genérico): procedimiento "Notificar cliente" con login, búsqueda por RUT, ficha con scroll hasta notificaciones, elección de mail o teléfono y confirmación.

---

## 2. Alcance de la versión 1 (decisiones ya tomadas)

| Decisión | Valor |
|---|---|
| Arquitectura | Solo frontend, **sin backend, sin base de datos de servidor, sin cuentas de usuario** |
| Stack | **React + TypeScript + Vite** |
| Alcance funcional | **Completo**: editor con zonas, anotaciones, difuminado, scroll, vista previa, modos guiado / práctica / evaluación y puntaje |
| Distribución | **URL publicada** (TI o un hosting), sitio estático |
| SCORM | **1.2** |
| Tabla de SCORM creados | **Registro (nombre, fecha, versión, pasos) + proyecto editable guardado en el navegador** |
| Originales de capturas difuminadas | **Se guardan en el proyecto editable** para poder modificar el difuminado después; nunca van dentro del SCORM |
| Diseño | Minimalista, moderno, paleta pastel, navegación lateral izquierda (sección 17) |
| Idioma de la interfaz | Español (Chile) |

### 2.1 Fuera de alcance de la v1

- Backend, cuentas, roles administrables, login propio (el acceso lo restringe TI en el hosting, ver sección 6).
- Colaboración en tiempo real o biblioteca compartida entre trainers.
- Conexión directa al LMS (se descarga el ZIP y se sube a mano).
- SCORM 2004, xAPI.
- Ramificaciones condicionales complejas (solo saltos simples entre pasos).
- Video, audio, narración.
- Generación automática de pasos con IA o detección automática de elementos.
- Captura de pantalla desde la propia app.
- Modo oscuro (se deja preparado en los tokens de diseño, no se entrega en la v1).

---

## 3. Problema que resuelve

| Problema | Consecuencia |
|---|---|
| No se entregan credenciales de sistemas de clientes durante la capacitación | Los nuevos no pueden practicar |
| Miedo a borrar o alterar algo real | Menos confianza y más tiempo de adaptación |
| Material actual: presentaciones estáticas | Poca retención, sin práctica activa |
| Crear simuladores requiere programación | Dependencia técnica por cada procedimiento nuevo |
| Los CRM cambian de interfaz | Material obsoleto y caro de actualizar |

## 4. Objetivos medibles

1. Un trainer sin experiencia técnica crea y exporta un simulador de 5 pasos en **≤ 15 minutos**, tras una inducción breve.
2. El paquete importa y funciona en el **LMS real** de la empresa y reporta completitud y puntaje.
3. El paquete es **autocontenido** (sin red externa) y liviano (típico < 20 MB).
4. Actualizar un simulador cuando el cliente cambia su sistema (reemplazar una captura conservando zonas) toma **minutos**, no horas.
5. Ningún dato de capturas sale del equipo del trainer; los datos sensibles difuminados **no son recuperables** desde el SCORM.

---

## 5. Usuarios

| Persona | Rol en la solución |
|---|---|
| **Trainer** | Único usuario de la aplicación. Crea, edita, exporta. Nivel técnico básico. |
| **Alumno** | No usa la aplicación: usa el simulador exportado desde el LMS. |
| **TI** | Publica el sitio estático y controla quién puede acceder a la URL. |
| **Administrador del LMS** | Sube y configura los paquetes SCORM. |
| **Supervisor** | Revisa resultados en el LMS. |

---

## 6. Accesos, roles y seguridad (sin cuentas)

La aplicación **no tiene usuarios ni contraseñas ni roles internos**. Cualquier persona que llegue a la URL puede usarla, y sus datos viven solo en su navegador.

- **Control de acceso:** lo resuelve TI **fuera de la aplicación**: publicarla solo en la red interna o VPN, o protegerla con el inicio de sesión corporativo (Microsoft/Google) configurado en el servidor web. La app no debe requerir cambios para eso.
- **Aislamiento natural:** cada trainer solo ve lo que hay en su propio navegador. No existe vista de administrador.
- **Equipos compartidos:** como los originales sin difuminar quedan en el navegador, la app ofrece **"Borrar todos los datos locales"** y recomienda usar perfiles de navegador personales.
- **Sin telemetría, sin cookies de terceros, sin CDN, sin recursos remotos** (ni en la app ni en el SCORM). Fuentes e iconos van empaquetados localmente.
- **Texto seguro:** todo texto escrito por el trainer se renderiza como texto, nunca como HTML ejecutable, tanto en el editor como en el reproductor.
- **Importaciones validadas:** todo archivo `.simpaso` o SCORM importado se valida contra el esquema antes de cargarse.

---

## 7. Arquitectura conceptual

```
┌─────────────────────────── Navegador del trainer ───────────────────────────┐
│                                                                              │
│  [ Aplicación (React) ]  ──lee/escribe──►  [ Almacenamiento local ]          │
│   Home · Mis proyectos         (IndexedDB: proyectos, imágenes, historial)   │
│   Crear · Editor · Historial                                                 │
│        │                                                                     │
│        ├── Contrato de datos (project.json, con esquema versionado)          │
│        ├── Reproductor (bundle independiente, se incrusta en el SCORM)       │
│        └── Exportador SCORM 1.2 (arma el ZIP en el navegador)                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
        ▲ entrega estática (HTML/JS/CSS) desde la URL publicada por TI
```

Componentes:

1. **Aplicación (Studio):** pantallas de gestión y editor.
2. **Contrato de datos:** el JSON que describe un simulador; fuente de verdad compartida entre editor, reproductor y exportador.
3. **Reproductor:** runtime genérico que lee el contrato. Se compila **como bundle independiente** (sin dependencias del editor) para incrustarse en el SCORM.
4. **Exportador SCORM:** genera el ZIP con manifiesto, reproductor, datos e imágenes procesadas.
5. **Capa de almacenamiento local:** abstracción sobre IndexedDB (proyectos, imágenes, historial, ajustes).

---

## 8. "Base de datos" local (IndexedDB)

No hay base de datos de servidor. Los datos viven en **IndexedDB** del navegador, con una capa de acceso tipada y un esquema versionado con migraciones.

### 8.1 Almacenes (stores)

**`projects`** — un registro por simulador editable
| Campo | Descripción |
|---|---|
| `id` | UUID |
| `title`, `client`, `description`, `language` | Metadatos |
| `data` | El `project.json` completo (pasos, acciones, anotaciones, redacciones, ajustes) |
| `schemaVersion` | Versión del contrato |
| `thumbnailBlob` | Miniatura del primer paso |
| `createdAt`, `updatedAt` | Fechas |
| `stepCount`, `sizeBytes` | Datos derivados para listados |
| `lastExportedAt` | Última exportación SCORM |

**`assets`** — imágenes del proyecto
| Campo | Descripción |
|---|---|
| `id` | UUID |
| `projectId` | Proyecto dueño |
| `originalBlob` | Captura original **sin difuminar** (se conserva) |
| `width`, `height` | Dimensiones naturales |
| `mime`, `sizeBytes`, `sha256` | Datos técnicos |

> El difuminado se guarda como **datos** (rectángulos y estilo) dentro de `projects.data`. Solo se **"quema"** en la imagen al exportar el SCORM (y en la vista previa). El original nunca se modifica.

**`exports`** — historial de SCORM creados (la tabla que ve el trainer)
| Campo | Descripción |
|---|---|
| `id` | UUID |
| `projectId` | Proyecto de origen (puede haberse eliminado: en ese caso queda el registro sin enlace) |
| `projectTitle` | Nombre al momento de exportar |
| `projectVersion` | Versión del simulador (ej. 1.2.0) |
| `scormVersion` | `1.2` |
| `createdAt` | Fecha y hora |
| `stepCount` | Cantidad de pasos |
| `modes` | Modos habilitados (guiado/práctica/evaluación) |
| `passingScore` | Umbral configurado |
| `zipSizeBytes`, `fileName`, `packageSha256` | Datos del paquete |
| `projectSnapshotId` | Referencia a una copia del proyecto tal como estaba al exportar |

**`snapshots`** — copias del proyecto al exportar y versiones recientes
| Campo | Descripción |
|---|---|
| `id`, `projectId`, `createdAt`, `reason` (`export` / `manual` / `autosave`) | Control |
| `data` | `project.json` de ese momento (las imágenes se referencian por `assetId`/`sha256`, sin duplicarlas) |

Se conservan las **últimas N versiones** por proyecto (configurable, por defecto 10) y siempre la de cada exportación.

**`settings`** — ajustes del trainer (clave/valor): nombre de autor por defecto, valores por defecto de puntaje, colores de anotación recientes, preferencia de borrado de originales, etc.

### 8.2 Reglas de almacenamiento

- **Autoguardado** continuo del proyecto abierto, con indicador "Guardado".
- Solicitar **almacenamiento persistente** al navegador (`navigator.storage.persist()`) y mostrar el estado.
- Mostrar un **medidor de espacio usado** y una advertencia al acercarse al límite.
- Una **imagen no se duplica** si ya existe por hash dentro del mismo proyecto.
- Eliminar un proyecto elimina sus imágenes y snapshots, pero **conserva el registro en `exports`** (marcado como "proyecto eliminado") salvo que el trainer elija borrarlo también.
- **Control de múltiples pestañas:** si el mismo proyecto está abierto en dos pestañas, la segunda queda en solo lectura con aviso (bloqueo mediante `BroadcastChannel` o Web Locks).
- Si IndexedDB no está disponible (navegación privada, políticas de TI), la app debe avisar claramente y funcionar en **modo sin persistencia**: trabajar y exportar `.simpaso` al instante.

### 8.3 Riesgos propios del almacenamiento local

| Riesgo | Mitigación |
|---|---|
| El trainer limpia datos del navegador o cambia de PC y pierde proyectos | Respaldo manual (`.simpaso` y respaldo completo), recordatorios, aviso permanente de dónde viven los datos |
| Safari y otros navegadores pueden eliminar datos tras días sin uso | Pedir almacenamiento persistente; avisar; recomendar Chrome/Edge |
| Cuota de espacio superada | Medidor, compresión de imágenes en importación, aviso previo |
| Datos sensibles (originales) en equipos compartidos | Botón de borrado total, advertencias, recomendación de perfil personal |

### 8.4 Respaldos y portabilidad (sin servidor)

- **Archivo de proyecto `.simpaso`** (ZIP con `project.json` + imágenes): exporta e importa un simulador individual. Al exportar, se pregunta si **incluir originales sin difuminar** (por defecto sí, con advertencia visible).
- **Respaldo completo de la biblioteca** (`.simpaso-backup`): todos los proyectos, el historial y los ajustes en un solo archivo; con función de restaurar (reemplazar o fusionar).
- **Importar SCORM**: reconstruye un proyecto a partir de un SCORM exportado por la app (lee el `project.json` incluido). Los datos difuminados quedan quemados en las imágenes; la app lo informa.
- **Regenerar SCORM** desde el historial: reconstruye el ZIP a partir del snapshot guardado (el ZIP exportado debe ser **determinista**: mismo proyecto, mismo contenido, fechas fijas) en lugar de guardar el ZIP completo.

---

## 9. Navegación y pantallas

Menú lateral izquierdo (ver diseño en sección 17):

1. **Inicio (Home)**
2. **Mis proyectos**
3. **Crear nuevo**
4. **Historial de SCORM**
5. **Ayuda / guía rápida**
6. **Ajustes** (datos locales, respaldo, preferencias)

### 9.1 Inicio

- Saludo breve y descripción de la app en una frase.
- **Acciones rápidas:** Crear nuevo simulador, Importar proyecto (`.simpaso`), Importar SCORM.
- **Proyectos recientes** (hasta 6, con miniatura y fecha).
- **Últimos SCORM creados**.
- **Estado de datos locales:** espacio usado, almacenamiento persistente sí/no, fecha del último respaldo, con botón "Hacer respaldo ahora".
- Consejos cortos ("Difumina los datos de clientes antes de exportar").

### 9.2 Mis proyectos

- Vista de tarjetas y de tabla (alternable), con miniatura, nombre, cliente, pasos, última edición, estado de exportación.
- Búsqueda por nombre/cliente, orden por fecha o nombre, filtro por cliente.
- Acciones por proyecto: abrir, duplicar, renombrar, exportar `.simpaso`, exportar SCORM, eliminar (con confirmación y opción de deshacer breve).
- Selección múltiple para eliminar o exportar respaldo.
- Estado vacío amable con botón "Crear tu primer simulador".

### 9.3 Crear nuevo

Asistente breve (3 pasos), pensado para completarse en menos de un minuto:
1. **Datos:** nombre del procedimiento, cliente/rubro, descripción corta, autor.
2. **Cargar capturas:** arrastrar y soltar varias imágenes a la vez (o pegar con Ctrl+V); se ordenan por nombre y se pueden reordenar con miniaturas. Aviso de privacidad inmediato.
3. **Modo y ajustes iniciales:** modos permitidos, umbral de aprobación (valores sugeridos).
Termina abriendo el **editor** con un paso creado por cada imagen.
- También: "Empezar desde un proyecto existente" (duplicar) y "Desde plantilla" (login → búsqueda → resultado → fin).

### 9.4 Editor (pantalla principal de trabajo)

Ver sección 10.

### 9.5 Historial de SCORM

Tabla con una fila por SCORM exportado:

| Nombre | Versión | Fecha | Pasos | Modos | Umbral | Tamaño | Estado del proyecto | Acciones |
|---|---|---|---|---|---|---|---|---|

- Acciones: **Descargar de nuevo** (regenera el ZIP desde el snapshot), **Abrir proyecto** (si existe; si no, "Restaurar desde snapshot"), **Duplicar como proyecto nuevo**, **Eliminar registro**.
- Búsqueda, filtro por rango de fechas y por proyecto, ordenamiento.
- **Exportar el historial** a CSV (para reportar o documentar qué paquetes se subieron al LMS).
- Aviso permanente: "Este historial vive en este navegador".

### 9.6 Ayuda

Guía rápida ilustrada: crear un simulador en 5 minutos, buenas prácticas (instrucciones claras, difuminado), cómo subir el SCORM al LMS, qué hacer si cambió el sistema del cliente, preguntas frecuentes sobre respaldos.

### 9.7 Ajustes

- Datos locales: espacio usado, almacenamiento persistente, respaldo completo, restaurar, **borrar todo**.
- Preferencias: autor por defecto, puntajes por defecto, número de versiones guardadas, tamaño máximo de imagen, idioma de la interfaz (español por ahora).

---

## 10. Editor: especificación detallada

### 10.1 Distribución

- **Barra superior:** nombre del proyecto (editable), indicador de guardado, deshacer/rehacer, **Vista previa**, **Validar**, **Exportar** (menú: SCORM, `.simpaso`).
- **Columna izquierda:** lista de pasos con miniaturas (arrastrar para reordenar, duplicar, eliminar, insertar imagen entre pasos, agregar paso nuevo desde imagen).
- **Centro:** lienzo con la imagen del paso, zoom y desplazamiento, herramientas flotantes.
- **Columna derecha:** panel de propiedades del elemento seleccionado (paso, zona, anotación o difuminado) con pestañas **Paso · Zonas · Anotaciones · Difuminado**.
- **Barra inferior del lienzo:** zoom, ajustar a pantalla, cuadrícula, estado de la selección.

### 10.2 Herramientas del lienzo

| Herramienta | Atajo | Comportamiento |
|---|---|---|
| Seleccionar / mover | `V` | Selecciona, mueve y redimensiona elementos con manijas |
| **Zona de clic** | `C` | Dibuja un rectángulo donde el alumno debe hacer clic |
| **Zona de texto** | `T` | Dibuja un campo donde el alumno escribe, con validación |
| **Zona de scroll** | `S` | Define el marco y la región objetivo a la que hay que llegar |
| **Cuadro de texto** | `X` | Inserta una nota de texto sobre la imagen |
| **Subrayado** | `U` | Línea bajo un texto de la imagen |
| **Resaltado** | `H` | Rectángulo semitransparente |
| **Rectángulo / contorno** | `R` | Recuadro de énfasis |
| **Flecha** | `A` | Flecha apuntando a un elemento |
| **Difuminado** | `B` | Difumina, pixela u oculta (negro) una región |
| Mano / desplazar | `Espacio` | Mover el lienzo |
| Zoom | `Ctrl + rueda` | Acercar y alejar |

Comportamientos generales:
- Dibujar con arrastre; **mover con las flechas** (1 px, Shift = 10 px); **duplicar** con `Ctrl+D`; **eliminar** con `Supr`.
- **Deshacer / rehacer** ilimitado durante la sesión.
- **Ajuste a bordes** de otras zonas y cuadrícula opcional; coordenadas editables en el panel.
- **Capas:** traer al frente / enviar atrás; bloquear y ocultar elementos.
- **Colores por tipo** de zona en el editor, con leyenda.
- Selector de **color** para anotaciones con paleta pastel + últimos usados + color personalizado; grosor y opacidad.
- Copiar y pegar elementos entre pasos.

### 10.3 Tipos de zona (acciones del alumno)

| Tipo | Qué hace el alumno | Configuración |
|---|---|---|
| **Clic** | Hace clic en una o varias zonas válidas | Zonas (modo `any` = basta una, `all` = todas), mensaje por clic erróneo, **destino opcional** (ir a otro paso) |
| **Texto** | Escribe en un campo simulado | Zona, etiqueta, enmascarado (contraseñas), validación, placeholder, mensajes, variable de eco |
| **Scroll** | Desplaza una imagen larga hasta que una región objetivo sea visible | Marco de visualización, región objetivo, % visible requerido |
| **Selección** | Elige una opción de una lista desplegable simulada | Zona, opciones, opciones válidas |
| **Informativo** | Lee y pulsa "Siguiente/Finalizar" | Texto del botón |

Un paso puede tener **varias acciones en orden** (ej. usuario → contraseña → clic en Entrar). Se completa cuando todas están completas en el orden definido.

**Zonas distractoras:** rectángulos que, si el alumno pulsa, muestran un mensaje específico ("Ese botón elimina el cliente, no lo uses aquí") y cuentan como error.

**Vínculos a otro paso ("hipervínculos"):** una zona de clic puede apuntar a un paso concreto (por defecto, al siguiente). Sirve para menús y pantallas que se revisan en distinto orden. No hay condiciones ni ramificación compleja en la v1; el editor muestra los saltos con flechas en la lista de pasos y alerta si hay ciclos que impidan terminar.

### 10.4 Validaciones del campo de texto

- `non_empty`: cualquier valor no vacío (usuario y contraseña de práctica).
- `equals`: valor exacto esperado.
- `one_of`: lista de valores válidos.
- `rut`: formato chileno y **dígito verificador** (acepta con o sin puntos y con o sin guion).
- `regex`: modo avanzado, oculto por defecto.
- **Normalizaciones configurables** previas a comparar: recortar espacios, minúsculas, quitar puntos, quitar espacios, normalizar RUT.
- Mensajes distintos para vacío, formato inválido y valor incorrecto.
- **Variable de eco:** un valor escrito (ej. el correo del login) puede mostrarse luego sobre la imagen de pasos posteriores (cuadro de texto con marcador `{{usuario}}`). Vive solo en memoria durante la ejecución.

### 10.5 Scroll realista

- Se usa una captura **larga** (full-page) o varias capturas **unidas verticalmente** con una herramienta del editor.
- En el reproductor aparece un **marco** con barra de desplazamiento.
- La acción se cumple cuando la región objetivo queda visible según el umbral (ej. 80 %).
- Opcionalmente, un clic posterior dentro de la imagen larga. Las coordenadas son relativas a la **imagen completa**.
- Soporte de rueda, barra y gesto táctil.
- Solo scroll vertical en la v1.

### 10.6 Anotaciones

- Tipos: **cuadro de texto, subrayado, resaltado, rectángulo, flecha**.
- Propiedades: color, grosor/opacidad, tamaño y estilo de fuente (en texto), alineación.
- **Visibilidad por modo:** cada anotación puede mostrarse solo en modo guiado, en guiado y práctica, o siempre (por defecto: solo guiado, para que no revele la respuesta en práctica/evaluación).
- Las anotaciones **no son parte de la imagen**: se renderizan como capa en el reproductor.

### 10.7 Difuminado de datos sensibles

- Estilos: **difuminar (blur), pixelar, ocultar (bloque sólido)**; intensidad configurable.
- Se define como datos (rectángulos) y es **editable en el proyecto**.
- **Se quema en la imagen exportada**: el SCORM contiene únicamente la imagen ya procesada; los píxeles originales no son recuperables.
- Opción "**Aplicar a todas las imágenes**" para zonas repetidas (cabecera con nombre del agente).
- Detección sugerida (deseable): avisar si el trainer exporta sin ninguna redacción.
- **Casilla obligatoria antes de exportar:** "Revisé que las capturas no contienen datos personales reales".
- Los originales sin difuminar se guardan en el navegador (decisión de la v1) y, al exportar `.simpaso`, solo se incluyen con consentimiento explícito.

### 10.8 Gestión de imágenes

- Formatos: PNG, JPG, WebP. Se normalizan al importar conservando la legibilidad del texto.
- Límite de tamaño por imagen con aviso; opción de reducir resolución.
- Aviso si las capturas consecutivas tienen **tamaños o proporciones muy distintos**.
- **Reemplazar imagen de un paso** conservando zonas y textos. Si el tamaño cambia, se proponen las zonas reescaladas y se marcan "revisar".
- **Unir capturas verticalmente** (para scroll).
- Recorte básico.
- Todo el procesamiento ocurre en el navegador.

### 10.9 Panel de paso

Por cada paso: título, **instrucción** (lo que verá el alumno), **pista**, mensaje de error genérico, mensaje de éxito, imagen asociada, ¿es paso final?, permitir retroceder.

### 10.10 Vista previa

- Reproductor **idéntico al exportado** (mismo código) dentro del editor.
- Iniciar desde el paso 1 o desde el paso seleccionado; elegir modo.
- **Panel "Simulador de LMS":** muestra en vivo qué enviaría el SCORM (estado, puntaje, ubicación, `suspend_data`, tiempo) para depurar sin subir al LMS.

### 10.11 Validación antes de exportar

**Errores (bloquean):** paso sin imagen; paso sin acciones (salvo informativo); acción sin zona; texto con `equals` sin valor; zona fuera de límites; proyecto sin pasos o sin paso final; título vacío; salto a un paso inexistente; ciclo sin salida.
**Avisos (no bloquean):** paso sin instrucción o sin pista; zonas muy pequeñas o solapadas; imágenes de tamaños muy distintos; paquete > 50 MB; zonas marcadas "revisar"; ninguna redacción definida.

El resultado se muestra como **lista navegable**: al hacer clic en un problema, el editor salta al paso y elemento afectado.

---

## 11. Modos de ejecución y puntaje

Un mismo simulador soporta tres modos (el trainer decide cuáles permitir y cuál es el predeterminado):

| Modo | Comportamiento | Reporte al LMS |
|---|---|---|
| **Guiado** | Resalta siempre la zona objetivo, muestra anotaciones y flecha. Errores no penalizan. | Solo completitud |
| **Práctica** | Sin resaltado; botón "Ver pista"; errores se cuentan sin reprobar; anotaciones según configuración. | Completitud y datos de errores |
| **Evaluación** | Sin pistas ni resaltado ni anotaciones reveladoras. Se miden errores, pistas y tiempo. | Completitud, puntaje y aprobado/reprobado |

### 11.1 Puntaje (modo evaluación), valores por defecto configurables

- Cada paso vale lo mismo.
- Penalización por error (ej. 5 puntos, con tope por paso) y por pista (ej. 3 puntos; en evaluación no hay pistas salvo que el trainer las permita).
- Puntaje = 100 − penalizaciones, mínimo 0.
- Aprobado si puntaje ≥ umbral (por defecto 80).
- El tiempo se **registra y reporta** pero no resta puntaje (configurable a futuro).
- Intentos: se reporta el último intento completo; el LMS conserva sus propias reglas de intentos.

### 11.2 Experiencia del reproductor

- **Barra superior:** título, paso X de N, barra de progreso, modo, reinicio.
- **Zona central:** captura escalada sin deformarse, con zonas y anotaciones superpuestas.
- **Panel de instrucción** del paso, botón "Pista" (según modo), contador de errores (si el trainer lo habilita).
- **Retroalimentación:** confirmación sutil al acertar; mensaje breve no bloqueante al fallar; ayuda automática tras N errores (salvo evaluación).
- **Campo de texto:** valida con Enter y al perder el foco; si falla, **conserva lo escrito** y muestra el error; si acierta, avanza.
- **Reanudar:** si el alumno cierra y vuelve, ofrece continuar donde quedó.
- **Pantalla final:** mensaje configurable y resumen (errores, pistas, tiempo, puntaje).
- **Accesibilidad:** navegación por teclado, foco visible, mensajes con `aria-live`, texto alternativo por imagen, contraste AA.
- **Resolución mínima:** 1024×600; por debajo, aviso claro.
- **Doble clic o clics muy rápidos** no deben saltarse pasos ni contar errores duplicados.

---

## 12. Contrato de datos (borrador de referencia)

JSON versionado con esquema formal. Coordenadas **normalizadas (0 a 1)** respecto al tamaño natural de la imagen.

```json
{
  "schemaVersion": "1.0",
  "id": "uuid",
  "meta": {
    "title": "Procedimiento de ejemplo",
    "client": "Empresa X",
    "description": "…",
    "author": "Nombre del trainer",
    "language": "es-CL",
    "version": "1.0.0",
    "createdAt": "2026-10-18T12:00:00Z",
    "updatedAt": "2026-10-18T12:00:00Z"
  },
  "settings": {
    "allowedModes": ["guided", "practice", "evaluation"],
    "defaultMode": "guided",
    "scoring": { "passingScorePercent": 80, "errorPenalty": 5, "errorPenaltyCapPerStep": 15, "hintPenalty": 3 },
    "maxErrorsBeforeAutoHelp": 2,
    "allowBack": { "guided": true, "practice": true, "evaluation": false },
    "storeUserInputInLms": false
  },
  "assets": [
    {
      "id": "img-001",
      "file": "assets/img-001.png",
      "width": 1920,
      "height": 1080,
      "redactions": [{ "rect": { "x": 0.1, "y": 0.2, "w": 0.15, "h": 0.04 }, "style": "blur", "strength": 0.8 }]
    }
  ],
  "steps": [
    {
      "id": "step-01",
      "title": "Ingreso",
      "instruction": "Ingresa tus datos y presiona Entrar.",
      "hint": "El botón está bajo los campos.",
      "assetId": "img-001",
      "viewport": null,
      "annotations": [
        { "id": "n1", "type": "text", "rect": { "x": 0.2, "y": 0.1, "w": 0.3, "h": 0.05 }, "text": "Usa tus datos de práctica", "color": "#B9A7EA", "visibleIn": ["guided"] }
      ],
      "actions": [
        { "id": "a1", "type": "input", "rect": { "x": 0.18, "y": 0.5, "w": 0.15, "h": 0.04 }, "label": "Usuario", "validation": { "kind": "non_empty" }, "echoAs": "usuario" },
        { "id": "a2", "type": "input", "rect": { "x": 0.18, "y": 0.58, "w": 0.15, "h": 0.04 }, "label": "Contraseña", "masked": true, "validation": { "kind": "non_empty" } },
        { "id": "a3", "type": "click", "rects": [{ "x": 0.18, "y": 0.66, "w": 0.15, "h": 0.05 }], "match": "any", "goTo": null }
      ],
      "distractors": [{ "rect": { "x": 0.6, "y": 0.1, "w": 0.1, "h": 0.05 }, "message": "Esa opción no corresponde aquí." }]
    }
  ],
  "completion": { "title": "¡Procedimiento completado!", "message": "…" }
}
```

Reglas:
- Una imagen puede reutilizarse en varios pasos.
- El contrato **no incluye** datos de uso del navegador (miniaturas, historial): eso es de la app.
- El SCORM incluye el `project.json` (con las redacciones ya **aplicadas** a las imágenes, y **sin** los originales) para permitir "Importar SCORM".
- **Política de versiones:** dentro de `1.x` solo se agregan campos opcionales; cualquier cambio incompatible exige versión mayor y migración. El reproductor rechaza versiones mayores que no conoce con un mensaje claro.

---

## 13. Exportación SCORM 1.2

### 13.1 Estructura del ZIP

```
imsmanifest.xml
index.html
player/…            (reproductor compilado, local)
data/project.json
assets/…            (imágenes ya procesadas: difuminado aplicado)
```

### 13.2 Reglas obligatorias

- Rutas dentro del ZIP con **`/`** (nunca `\`).
- `imsmanifest.xml` en la raíz, bien formado, con `identifier` único por proyecto.
- Todas las rutas **relativas**; **cero** recursos remotos (sin CDN, fuentes, analytics).
- Lista completa de archivos en `<resources>`.
- **Un solo SCO** en la v1.
- Compatible con apertura en iframe, ventana emergente o pantalla completa.
- Nombre: `simulador-<slug>-v<version>.zip`.
- **Determinista:** misma entrada produce el mismo ZIP (fechas y orden fijos), para poder regenerar desde el historial.
- Tamaño: aviso sobre 50 MB.

### 13.3 Qué se reporta al LMS (SCORM 1.2)

| Elemento | Contenido |
|---|---|
| `cmi.core.lesson_status` | `incomplete` → `completed`; en evaluación `passed` o `failed` |
| `cmi.core.score.raw/min/max` | Puntaje 0 a 100 (solo evaluación) |
| `cmi.core.lesson_location` | Paso actual |
| `cmi.core.session_time` | Duración de la sesión |
| `cmi.suspend_data` | Estado compacto para reanudar (paso, acción, errores, pistas, modo). **Máximo 4096 caracteres**, con control de tamaño |
| `cmi.interactions.n.*` | Resultado por paso, si el LMS lo soporta (opcional) |

- **No se envía** al LMS lo que el alumno escribe, salvo que el trainer lo habilite explícitamente (con advertencia). Los campos enmascarados nunca se reportan.
- Sin LMS (apertura directa), el reproductor funciona en **modo independiente** sin errores visibles.
- Capa de comunicación tras una interfaz (`LmsAdapter`) para añadir SCORM 2004 o xAPI en el futuro.
- Manejo de errores de la API (`LMSGetLastError`), `LMSFinish` al cerrar, commit por paso completado.

### 13.4 Prueba obligatoria

Antes de dar por buena la integración: importar un paquete de ejemplo en el **LMS real** y verificar estado, puntaje, reanudación y apertura; además, validar con una herramienta externa (por ejemplo SCORM Cloud).

---

## 14. Requisitos no funcionales

| Área | Requisito |
|---|---|
| Navegadores | Chrome y Edge (últimas 2 versiones), Firefox (última). Safari deseable, con avisos de almacenamiento |
| Rendimiento | Proyecto de 30 pasos con capturas 1920×1080 se edita con fluidez; primer paso del reproductor < 2 s |
| Tamaño del reproductor | Objetivo < 250 KB comprimido (sin contar imágenes) |
| Offline | La app es usable sin internet después de la primera carga (PWA deseable); el reproductor 100 % offline |
| Accesibilidad | Teclado completo, foco visible, `aria-live`, contraste AA, en app y reproductor |
| i18n | Español (Chile) por defecto; textos externalizados en diccionario |
| Fiabilidad | Autoguardado; ningún cierre inesperado pierde más de unos segundos |
| Mantenibilidad | Contrato versionado con migraciones; reproductor desacoplado del editor |
| Seguridad | Texto seguro, importaciones validadas, sin recursos remotos |
| Pruebas | Unitarias (esquema, validaciones, RUT, puntaje, serialización), integración (almacenamiento, exportador), E2E (flujo del editor y reproductor), prueba con API SCORM simulada, prueba manual en LMS real |

---

## 15. Historias de usuario (para `/specify`)

- **HU-01** Como trainer, quiero **cargar varias capturas a la vez** y ordenarlas, para armar rápido la secuencia de un procedimiento.
- **HU-02** Como trainer, quiero **marcar con el mouse dónde se hace clic o se escribe**, para definir qué debe hacer el alumno en cada pantalla.
- **HU-03** Como trainer, quiero **definir qué valor debe escribir el alumno** (por ejemplo un RUT) y que solo avance si es correcto.
- **HU-04** Como trainer, quiero **simular un scroll** hasta una sección de la pantalla.
- **HU-05** Como trainer, quiero **agregar texto, subrayados, resaltados, flechas y colores** para guiar al alumno.
- **HU-06** Como trainer, quiero **difuminar datos sensibles** y poder cambiarlo después, sin que el SCORM contenga los datos originales.
- **HU-07** Como trainer, quiero **vincular un clic a otro paso** para simular menús y navegación.
- **HU-08** Como trainer, quiero **previsualizar** el simulador desde cualquier paso y ver qué reportaría al LMS.
- **HU-09** Como trainer, quiero **configurar modos guiado, práctica y evaluación** con puntaje y umbral de aprobación.
- **HU-10** Como trainer, quiero **exportar un SCORM 1.2** que funcione en nuestro LMS sin ayuda técnica.
- **HU-11** Como trainer, quiero ver una **tabla de los SCORM que ya creé** y poder volver a descargarlos.
- **HU-12** Como trainer, quiero **volver a abrir y editar un simulador** (agregar un paso, cambiar una captura) y descargar un SCORM actualizado.
- **HU-13** Como trainer, quiero **respaldar y restaurar mi trabajo** en archivos, para no perderlo si limpio el navegador o cambio de PC.
- **HU-14** Como trainer, quiero **importar un SCORM** exportado por la app para recuperar un proyecto.
- **HU-15** Como alumno, quiero **practicar el procedimiento con indicaciones claras** y errores amables, para perder el miedo.
- **HU-16** Como alumno, quiero **ser evaluado** y que el LMS registre mi resultado.
- **HU-17** Como alumno, quiero **retomar donde quedé** si se cierra la ventana.
- **HU-18** Como TI, quiero **publicar la app como carpeta estática** y restringir el acceso sin tocar el código.

---

## 16. Criterios de aceptación globales

1. Un trainer sin experiencia crea y exporta un simulador de 5 pasos en ≤ 15 minutos.
2. El SCORM se importa en el LMS real y reporta correctamente completitud y puntaje en los tres modos aplicables.
3. Al cerrar y reabrir el simulador a mitad, se ofrece continuar.
4. El reproductor y el SCORM **no realizan ninguna petición de red externa** (verificable en herramientas de desarrollador).
5. Las zonas quedan alineadas en 1024×600, 1366×768, 1920×1080 y 2560×1440; las imágenes no se deforman.
6. Un RUT con puntos, sin puntos, con o sin guion es aceptado cuando la normalización está activa; un dígito verificador inválido se rechaza.
7. Los datos difuminados **no son recuperables** desde las imágenes del SCORM.
8. Limpiar caché y cookies del navegador **no** impide recuperar el trabajo si el trainer tiene su `.simpaso`, el respaldo completo o el SCORM exportado.
9. El historial de SCORM muestra todos los exportados y permite regenerar cada uno con el mismo contenido.
10. Un archivo importado inválido o dañado se rechaza con un mensaje claro, sin romper la app.
11. La app funciona publicada en una subruta o dominio interno sin configuración especial de rutas del servidor.
12. Todas las pruebas automatizadas pasan y la prueba en el LMS real queda documentada.

---

## 17. Diseño de la interfaz (UI/UX 2026)

**Concepto:** limpio, aireado, minimalista y sofisticado. Superficies blancas sobre fondo gris casi blanco, acentos pastel suaves, tipografía clara y mucho espacio. Sensación de herramienta creativa moderna, no de panel corporativo.

### 17.1 Paleta (tokens, valores orientativos)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#F7F8FC` | Fondo general (gris muy claro con un toque azulado) |
| `--surface` | `#FFFFFF` | Tarjetas, paneles, lienzo |
| `--surface-2` | `#F0F2F9` | Superficies secundarias, campos |
| `--border` | `#E4E7F1` | Bordes sutiles |
| `--text` | `#23283B` | Texto principal |
| `--text-muted` | `#5E6682` | Texto secundario |
| `--blue` (azul sereno) | `#A9C7F2` / fuerte `#6F95D6` | Acción principal, selección, enlaces |
| `--lavender` (lavanda pastel) | `#CDBFF2` / fuerte `#9A86E0` | Acentos, anotaciones, elementos de apoyo |
| `--mint` (menta desvaído) | `#C4EAD9` / fuerte `#7CC3A5` | Éxito, estados completados |
| `--rose` (rosa pálido) | `#F6C9D0` / fuerte `#D9818F` | Errores y advertencias suaves |
| `--sand` (arena) | `#F6E7BF` / fuerte `#C9A24A` | Avisos informativos |

Reglas:
- Los pasteles se usan como **fondos y rellenos**; el texto sobre ellos es siempre `--text` (contraste mínimo AA, 4.5:1). Los tonos "fuertes" se usan para íconos, bordes activos y estados.
- Degradados muy suaves permitidos en cabeceras y estados vacíos (azul → lavanda), sin saturar.
- Preparar los tokens para un **modo oscuro futuro** (no entregarlo en la v1).

### 17.2 Tipografía, forma y movimiento

- Tipografía sans moderna y legible (por ejemplo Inter o Plus Jakarta Sans), **empaquetada localmente** (sin Google Fonts remoto). Escala clara: títulos 24–32 px, cuerpo 14–16 px.
- Esquinas redondeadas generosas (12–16 px), sombras muy suaves, bordes finos.
- Íconos de línea consistentes (set local, por ejemplo Lucide).
- Microinteracciones discretas (150–200 ms); respetar `prefers-reduced-motion`.
- Estados vacíos con ilustración sencilla y texto amable.

### 17.3 Estructura

- **Barra lateral izquierda** fija (≈ 248 px, colapsable a íconos): logo y nombre arriba; **Inicio, Mis proyectos, Crear nuevo, Historial de SCORM, Ayuda**; abajo **Ajustes** y el indicador de espacio usado. El ítem activo se resalta con relleno azul pastel y barra lateral fina.
- **Cabecera ligera** de página con título, búsqueda y acción principal.
- **Contenido** con ancho máximo cómodo y tarjetas con espaciado amplio.
- **Editor** a pantalla completa de contenido (la barra lateral se colapsa automáticamente a íconos).
- Diseño **responsivo** hasta 1024 px de ancho mínimo; el editor no se optimiza para móvil (aviso claro).

### 17.4 Componentes clave

Tarjeta de proyecto con miniatura, tabla con acciones en línea, botones primario (azul pastel con texto oscuro) / secundario / fantasma, chips de estado (menta = exportado, arena = pendiente, rosa = con errores), toasts discretos, diálogos de confirmación claros, tooltips con atajos, paneles plegables en el editor, zona de arrastrar y soltar generosa.

---

## 18. Seguridad y privacidad (resumen)

- Nada sale del equipo del trainer: sin backend, sin telemetría, sin recursos remotos.
- El SCORM nunca contiene originales sin difuminar ni lo que escribió un alumno.
- Contraseñas simuladas nunca se guardan ni se reportan.
- Advertencias y confirmación antes de exportar; botón de borrado total de datos locales.
- Textos sanitizados; importaciones validadas.
- **[Pregunta abierta]** Confirmar con Legal si los contratos con clientes permiten usar capturas de sus sistemas para capacitación y si requieren aprobación previa.

---

## 19. Casos límite

- Cuota de almacenamiento agotada durante el autoguardado.
- Navegador sin IndexedDB o con almacenamiento bloqueado.
- Dos pestañas con el mismo proyecto.
- Importar un `.simpaso` de una versión de contrato futura o dañado.
- Imágenes muy grandes (4K), muy largas (varias pantallas) o de proporciones distintas.
- Reemplazar una captura por otra de distinto tamaño.
- Zonas solapadas; zonas fuera de la imagen tras recortar.
- Saltos entre pasos que forman ciclos sin salida.
- `suspend_data` cerca del límite de 4096 caracteres.
- LMS que no devuelve estado previo o devuelve datos corruptos.
- Doble clic y clics rápidos durante transiciones.
- Ventana redimensionada o dispositivo rotado a mitad de una simulación.
- Proyecto con 0, 1 o más de 50 pasos.
- Textos con caracteres especiales o intentos de inyección de HTML.
- Proyecto eliminado pero con registros en el historial.
- Cierre inesperado del navegador durante la edición o exportación.

---

## 20. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos por limpieza del navegador o cambio de PC | Respaldos en archivo, `.simpaso`, importar SCORM, almacenamiento persistente, avisos |
| Incompatibilidad con el LMS | Probar un paquete mínimo (2 pasos) **antes** de construir el editor completo |
| Datos personales en capturas | Difuminado quemado, advertencias, confirmación previa, política interna |
| Originales sin difuminar en el navegador | Botón de borrado, recomendación de perfil personal, `.simpaso` con consentimiento |
| Alcance muy grande para la v1 | Partición en features (sección 22) con entregas demostrables |
| Complejidad del lienzo (zoom, capas, undo) | Modelo de documento único e inmutable con historial; pruebas unitarias del modelo |
| Navegador de TI con restricciones | Modo sin persistencia, aviso claro |
| `suspend_data` limitado | Formato compacto con pruebas de límite |
| Interfaces de clientes cambian | Reemplazo de imagen conservando zonas |

---

## 21. [Sugerencia técnica] — orientativa, a decidir en `/plan`

- **Lenguaje y build:** TypeScript estricto, React, Vite; Node LTS para desarrollo. Compilación con `base: './'` (rutas relativas) y **HashRouter** para que TI no tenga que configurar redirecciones del servidor.
- **Estado:** Zustand (o equivalente ligero), con el documento del editor como modelo inmutable con historial de deshacer/rehacer.
- **Almacenamiento:** IndexedDB mediante una capa tipada (por ejemplo Dexie o idb), con migraciones.
- **Lienzo:** capa SVG/HTML sobre la imagen para zonas y anotaciones (accesible y precisa); Canvas (preferible `OffscreenCanvas`) para difuminado, recorte y unión de imágenes.
- **Esquema y validación:** Zod (con generación de JSON Schema) o JSON Schema + Ajv; una única fuente para tipos y validación.
- **ZIP:** fflate o JSZip, con salida determinista.
- **Reproductor:** entrada de compilación **independiente** (Vite multi-entrada o paquete aparte), mínima y sin dependencias del editor (JS/TS sin framework o Preact), que el exportador incrusta en el ZIP.
- **Estilos:** CSS variables para los tokens + Tailwind o CSS Modules; fuentes e íconos locales.
- **Pruebas:** Vitest + Testing Library; Playwright para E2E y para verificar que no hay peticiones externas; API SCORM simulada para el adaptador.
- **Calidad:** ESLint, Prettier, CI con tests y build.
- **PWA (opcional):** service worker para uso sin conexión y almacenamiento persistente.
- **Publicación:** carpeta `dist/` estática servida por HTTPS (servidor interno o hosting).

---

## 22. [Sugerencia] — partición en features para Spec Kit

No especificar todo junto. Cada ciclo `specify → clarify → plan → tasks → implement` entrega algo demostrable:

1. **001 — Contrato y reproductor mínimo + exportador SCORM 1.2 mínimo.** Esquema, acciones clic/texto/informativo, modo guiado, ZIP SCORM de 2 pasos **probado en el LMS real**. *(Hito de mayor riesgo; se hace primero.)*
2. **002 — Estructura de la app y diseño.** Barra lateral, Home, Mis proyectos, Crear nuevo, Historial (vacío), sistema de diseño (tokens, componentes), capa de almacenamiento IndexedDB y autoguardado.
3. **003 — Editor núcleo.** Carga de imágenes, lista de pasos, lienzo con zoom, dibujar y editar zonas de clic y texto, panel de propiedades, deshacer/rehacer, vista previa.
4. **004 — Anotaciones y difuminado.** Texto, subrayado, resaltado, flecha, colores; difuminado no destructivo y quemado al exportar; confirmaciones de privacidad.
5. **005 — Scroll, selección, vínculos entre pasos y zonas distractoras.**
6. **006 — Modos práctica y evaluación, puntaje, pistas, reanudación, simulador de LMS en la vista previa.**
7. **007 — Historial de SCORM, `.simpaso`, respaldo completo, importar SCORM, regenerar desde snapshot, medidor de espacio.**
8. **008 — Validaciones del editor, reemplazo de imagen, unir capturas, plantillas, accesibilidad completa, pulido y ayuda.**
9. **Futuro:** SCORM 2004/xAPI, ramificaciones condicionales, biblioteca compartida (requeriría backend).

---

## 23. [Sugerencia] — principios para `/constitution`

1. **Sin backend en la v1:** todo corre en el navegador; las capturas nunca salen del equipo.
2. **El contrato de datos es la fuente de verdad** y está versionado, con migraciones.
3. **El paquete SCORM es autocontenido:** cero recursos remotos y rutas con `/`.
4. **Privacidad por defecto:** no se reporta al LMS lo que escribe el alumno; el difuminado es irreversible en lo distribuido.
5. **Simplicidad para el trainer:** toda función debe poder usarse sin conocimientos técnicos.
6. **Probar con el LMS real** antes de afirmar compatibilidad.
7. **Pruebas obligatorias** para esquema, validaciones, puntaje, almacenamiento y exportador.
8. **Accesibilidad y español (Chile)** como base, no como extra.
9. **Nada de datos reales** en ejemplos, pruebas ni capturas de demostración.
10. **Entregas pequeñas y verificables** por feature.

---

## 24. Flujo de uso de referencia (extremo a extremo)

1. TI publica la app en `https://…`; el trainer la abre.
2. En **Crear nuevo** escribe nombre y cliente, arrastra 5 capturas y elige modos.
3. En el **editor** marca zonas, escribe instrucciones, difumina datos, agrega una flecha y un subrayado, y define el RUT esperado en la búsqueda.
4. Hace **Vista previa** en modo guiado y luego en evaluación; revisa en el panel qué reportaría al LMS.
5. **Validar** → sin errores; confirma la casilla de privacidad.
6. **Exportar SCORM** → se descarga el ZIP y aparece una fila en el **Historial**.
7. Sube el ZIP al LMS. Los alumnos lo ejecutan y el LMS registra el resultado.
8. Semanas después el cliente cambia su pantalla: el trainer abre el proyecto en **Mis proyectos**, reemplaza una captura, ajusta una zona, sube la versión a 1.1.0 y exporta de nuevo.
9. Por seguridad, el trainer hace un **respaldo completo** y lo guarda en la carpeta compartida.

---

## 25. Glosario

- **Simulador / Proyecto:** un procedimiento completo, editable.
- **Paso:** una pantalla (imagen) con una o más acciones.
- **Acción:** interacción esperada (clic, texto, scroll, selección, lectura).
- **Zona / hotspot:** rectángulo sobre la imagen donde ocurre una acción.
- **Zona distractora:** rectángulo que genera un error específico.
- **Anotación:** texto, subrayado, resaltado, rectángulo o flecha que guía.
- **Redacción / difuminado:** ocultamiento de una región con datos sensibles.
- **`.simpaso`:** archivo de proyecto editable (ZIP con `project.json` e imágenes).
- **Snapshot:** copia del proyecto en un momento dado (por ejemplo al exportar).
- **SCORM:** paquete estándar para LMS.
- **LMS:** plataforma de capacitación de la empresa.

---

## 26. Dónde está lo que hay que construir primero (resumen para el agente)

- Empezar por la **feature 001** (contrato + reproductor + SCORM mínimo probado en el LMS real); no construir el editor completo antes de validar el paquete.
- Mantener el **reproductor desacoplado** del editor desde el primer día.
- Diseñar el **modelo de documento del editor** (zonas, anotaciones, redacciones, pasos) como estructura inmutable con historial, porque casi todas las demás funciones dependen de él.
- Aplicar el **sistema de diseño** (sección 17) desde la feature 002 para no rehacer pantallas.

---

## 27. [Preguntas abiertas] — para `/clarify`

1. ¿Cuál es el LMS y su versión? ¿Qué tamaño máximo de paquete acepta y cómo reporta puntaje y estado?
2. ¿Legal/Cumplimiento permite capturas de sistemas de clientes? ¿Algún cliente lo prohíbe?
3. ¿Dónde se publicará la app (servidor interno, hosting) y cómo restringirá TI el acceso?
4. ¿Cuántos trainers la usarán y con qué navegadores y equipos (¿compartidos o personales?)?
5. ¿Hay lineamientos de marca (logo, colores) para la app o para el reproductor que ve el alumno?
6. ¿Se necesita más de un idioma en los simuladores o en la interfaz?
7. ¿El puntaje debe poder configurarse por simulador (supuesto actual) o fijarse a nivel global?
8. ¿Cuántos intentos permitirá el LMS y cuál cuenta? ¿Se permite retroceder en evaluación?
9. ¿Los respaldos se guardarán en una carpeta compartida? ¿Hay una convención de nombres para los `.simpaso` y los SCORM?
10. ¿El nombre definitivo del producto (SimuPaso Studio es provisional)?
