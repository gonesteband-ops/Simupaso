import "./help.css";

type AboutPageProps = {
  onStart: () => void;
  onOpenGuide: () => void;
};

const SECTIONS = [
  ["que-es", "Qué es SimuPaso Studio"],
  ["primeros-pasos", "Crear y cargar capturas"],
  ["pasos", "La lista de pasos"],
  ["zonas", "Zonas de clic y de texto"],
  ["formulario", "Formulario sobre la captura"],
  ["propiedades", "Panel de propiedades"],
  ["difuminado", "Difuminar datos sensibles"],
  ["vista-previa", "Vista previa"],
  ["scorm", "Descargar el SCORM"],
  ["respaldo", "Respaldo e importación"],
  ["datos", "Dónde viven los proyectos"],
  ["faq", "Preguntas frecuentes"],
  ["limites", "Límites actuales"],
];

export function AboutPage({ onStart, onOpenGuide }: AboutPageProps) {
  return (
    <section className="help-page about-page" aria-label="Acerca de SimuPaso Studio">
      <header className="help-hero">
        <div>
          <p className="eyebrow">Acerca de</p>
          <h1>Manual de SimuPaso Studio</h1>
          <p className="help-lede">
            Una guía escrita, en lenguaje simple, para crear simuladores a partir de capturas
            y exportarlos como SCORM 1.2. Si prefieres aprender viendo, abre la guía paso a paso.
          </p>
        </div>
        <div className="help-actions">
          <button type="button" className="secondary-button" onClick={onOpenGuide}>
            Ver guía paso a paso
          </button>
          <button type="button" className="primary-button" onClick={onStart}>
            Empezar a crear
          </button>
        </div>
      </header>

      <div className="about-layout">
        <nav className="about-toc" aria-label="Índice del manual">
          <strong>En esta página</strong>
          <ol>
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="about-content">
          <section id="que-es" className="about-card">
            <h2>Qué es SimuPaso Studio</h2>
            <p>
              SimuPaso Studio es una herramienta web para que un trainer convierta capturas de
              un sistema (por ejemplo, un CRM) en un simulador interactivo. El alumno practica
              sobre las mismas pantallas, haciendo clics y completando campos, sin tocar el
              sistema real.
            </p>
            <p>
              Todo ocurre en el navegador. No hay servidor, cuentas ni base de datos central. Los
              proyectos se guardan en el equipo donde se crean y el resultado final se descarga
              como un paquete SCORM 1.2 para subirlo al LMS.
            </p>
            <div className="about-flow" aria-label="Flujo de trabajo">
              {[
                ["1", "Crea el proyecto", "Datos básicos y capturas."],
                ["2", "Marca interacciones", "Clics, textos y validaciones."],
                ["3", "Protege los datos", "Difumina lo sensible."],
                ["4", "Exporta", "SCORM para el LMS y respaldo editable."],
              ].map(([number, title, copy]) => (
                <div key={number} className="about-flow-step">
                  <span>{number}</span>
                  <strong>{title}</strong>
                  <small>{copy}</small>
                </div>
              ))}
            </div>
          </section>

          <section id="primeros-pasos" className="about-card">
            <h2>Crear un proyecto y cargar capturas</h2>
            <ol className="about-list">
              <li>
                En <strong>Crear nuevo</strong>, escribe el nombre del proyecto y, si quieres,
                el cliente, la descripción y el autor.
              </li>
              <li>
                Abre el proyecto desde <strong>Mis proyectos → Abrir editor</strong>.
              </li>
              <li>
                Arrastra las capturas al área de carga, pégalas con <kbd>Ctrl</kbd> +{" "}
                <kbd>V</kbd> o pulsa <strong>Seleccionar archivos</strong>. Se aceptan PNG, JPG
                y WebP de hasta 10 MB por imagen.
              </li>
              <li>
                Cada imagen se convierte en un paso, en orden de nombre de archivo. Después
                puedes reordenar, duplicar o eliminar.
              </li>
            </ol>
            <p className="about-note">
              Las capturas se procesan y quedan solo en el navegador. No viajan a un servidor.
            </p>
          </section>

          <section id="pasos" className="about-card">
            <h2>La lista de pasos</h2>
            <p>
              La columna izquierda del editor muestra la secuencia. El número indica el orden en
              que el alumno verá cada pantalla. Con los botones de cada paso puedes moverlo,
              duplicarlo, insertar una captura después o eliminarlo.
            </p>
            <ul className="about-list">
              <li>La miniatura ayuda a identificar la pantalla.</li>
              <li>El paso activo se resalta; todo lo que edites se aplica a ese paso.</li>
              <li>Puedes deshacer y rehacer los cambios de la sesión.</li>
              <li>Al eliminar un paso se eliminan también sus zonas, previa confirmación.</li>
            </ul>
          </section>

          <section id="zonas" className="about-card">
            <h2>Zonas de clic y de texto</h2>
            <h3>Zonas de clic</h3>
            <p>
              Elige la herramienta <strong>Zona de clic</strong> y arrastra sobre el botón,
              enlace o celda donde el alumno debe hacer clic. Si hay varias zonas válidas,
              puedes elegir si basta una o si se requieren todas.
            </p>
            <h3>Zonas de texto</h3>
            <p>
              Con <strong>Zona de texto</strong> marcas dónde se escribe un dato. En el panel
              de propiedades defines:
            </p>
            <ul className="about-list">
              <li>etiqueta y texto de ayuda (placeholder);</li>
              <li>si el valor se enmascara, como una contraseña;</li>
              <li>validación: no vacío, valor exacto, lista de valores o RUT chileno;</li>
              <li>valores esperados y mensajes de error o éxito;</li>
              <li>tamaño de letra como porcentaje del alto de la zona.</li>
            </ul>
            <p className="about-note">
              Las contraseñas simuladas nunca se guardan ni se reportan al LMS.
            </p>
            <h3>Casillas de selección</h3>
            <p>
              Si el CRM usa checkboxes, elige la herramienta <strong>Casilla</strong> y dibuja
              cada uno. En propiedades indicas si debe quedar marcada o desmarcada; al
              confirmar, la app exige que todas las casillas dibujadas coincidan con lo esperado.
              Si el paso no tiene una zona de clic para confirmar, aparece el botón
              <strong>Validar selección</strong>.
            </p>
          </section>

          <section id="formulario" className="about-card">
            <h2>Formulario sobre la captura</h2>
            <p>
              Cuando un paso tiene zonas de texto y una zona de clic, la app muestra todos los
              campos a la vez sobre la captura, como si el alumno estuviera en el sistema real.
              Al pulsar el botón de la captura se validan todos los campos; también puedes
              enviar con Enter.
            </p>
            <ul className="about-list">
              <li>Los campos se alinean con las zonas y escalan con la imagen.</li>
              <li>Al pasar el mouse o enfocar un campo aparece un globo con su ayuda.</li>
              <li>Si un dato no es válido, el campo se marca y el foco va al primer error.</li>
              <li>Los valores escritos por el alumno no se persisten.</li>
            </ul>
          </section>

          <section id="propiedades" className="about-card">
            <h2>Panel de propiedades</h2>
            <p>
              El panel derecho tiene tres pestañas: <strong>Paso</strong>,{" "}
              <strong>Zonas</strong> y <strong>Difuminado</strong>. Cambia según lo que
              selecciones.
            </p>
            <ul className="about-list">
              <li>
                En <strong>Paso</strong>: título, instrucción, pista, mensajes, tipo de paso y
                regla de clic.
              </li>
              <li>
                En <strong>Zonas</strong>: etiqueta, validación, máscara, tamaño de letra y
                coordenadas.
              </li>
              <li>
                En <strong>Difuminado</strong>: estilo, intensidad y coordenadas de la
                redacción.
              </li>
            </ul>
            <p>
              Las coordenadas se expresan en porcentaje de la imagen, para que las zonas sigan
              alineadas al cambiar el zoom o el tamaño de la ventana.
            </p>
          </section>

          <section id="difuminado" className="about-card">
            <h2>Difuminar datos sensibles</h2>
            <p>
              Antes de exportar, revisa cada captura y oculta RUT, nombres, correos, teléfonos
              o cualquier dato de cliente. La herramienta <strong>Difuminar</strong> crea
              rectángulos que puedes mover y redimensionar.
            </p>
            <ul className="about-list">
              <li><strong>Ocultar</strong>: bloque sólido; es la opción más segura.</li>
              <li><strong>Difuminar</strong>: desenfoque ajustable.</li>
              <li><strong>Pixelar</strong>: mosaico ajustable.</li>
            </ul>
            <p>
              La redacción se aplica de verdad a la imagen de la vista previa y del SCORM: los
              píxeles originales no son recuperables desde el paquete. Las capturas originales
              quedan solo en el navegador.
            </p>
            <p className="about-warning">
              No subas al LMS capturas con datos reales sin difuminar. Para datos muy sensibles,
              usa Ocultar y no compartas el respaldo editable.
            </p>
          </section>

          <section id="vista-previa" className="about-card">
            <h2>Vista previa</h2>
            <p>
              <strong>Vista previa</strong> ejecuta el simulador en modo guiado, desde el paso
              actual o desde el inicio, usando el mismo reproductor que irá en el SCORM. Sirve
              para comprobar clics, textos, validaciones y difuminado antes de exportar.
            </p>
            <p>
              Si falta una imagen, una zona o una validación, la app muestra los problemas y te
              permite ir al paso o zona afectada. La vista previa no reporta nada a ningún LMS.
            </p>
          </section>

          <section id="scorm" className="about-card">
            <h2>Descargar el SCORM</h2>
            <p>
              El botón <strong>Descargar SCORM 1.2</strong> arma un ZIP autocontenido con el
              reproductor, el proyecto y las imágenes procesadas. Antes de descargar se pide
              confirmar que revisaste los datos personales.
            </p>
            <ol className="about-list">
              <li>Descarga el paquete desde el editor.</li>
              <li>Entra al LMS y crea o importa una actividad SCORM 1.2.</li>
              <li>Sube el ZIP y publica la actividad.</li>
              <li>Prueba apertura, avance y finalización en el LMS antes de asignarla.</li>
            </ol>
            <p className="about-note">
              La compatibilidad con el LMS corporativo todavía está pendiente de validación. No
              se debe afirmar que funciona en un LMS hasta probarlo allí.
            </p>
          </section>

          <section id="respaldo" className="about-card">
            <h2>Respaldo e importación</h2>
            <table className="about-table">
              <caption>Diferencia entre los dos archivos de salida</caption>
              <thead>
                <tr>
                  <th scope="col">Archivo</th>
                  <th scope="col">Para qué sirve</th>
                  <th scope="col">Contiene originales</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">SCORM 1.2 (.zip)</th>
                  <td>Subirlo al LMS para que los alumnos practiquen.</td>
                  <td>No: solo las imágenes ya procesadas.</td>
                </tr>
                <tr>
                  <th scope="row">Respaldo (.simpaso)</th>
                  <td>Volver a editar, mover el proyecto o guardar una copia.</td>
                  <td>Sí: capturas originales y difuminados editables.</td>
                </tr>
              </tbody>
            </table>
            <p>
              En <strong>Mis proyectos → Importar SCORM o respaldo</strong> puedes restaurar un
              `.simpaso` o reimportar un SCORM exportado por SimuPaso. La importación crea una
              copia; el original no se sobrescribe.
            </p>
            <p className="about-warning">
              El respaldo contiene imágenes sin difuminar. Guárdalo en un lugar seguro y no lo
              subas al LMS.
            </p>
          </section>

          <section id="datos" className="about-card">
            <h2>Dónde viven los proyectos</h2>
            <p>
              Los proyectos se guardan en el navegador de cada equipo: la lista en
              <code>localStorage</code> y el proyecto con sus capturas en <code>IndexedDB</code>.
              No hay cuentas, sincronización ni biblioteca compartida.
            </p>
            <ul className="about-list">
              <li>No aparecen en otro navegador, otro perfil u otro equipo.</li>
              <li>No se comparten automáticamente con tus compañeros.</li>
              <li>Si se borran los datos del sitio, se pierden.</li>
              <li>Para moverlos, usa el respaldo `.simpaso` e impórtalo en el otro equipo.</li>
            </ul>
          </section>

          <section id="faq" className="about-card">
            <h2>Preguntas frecuentes</h2>
            <details>
              <summary>¿Necesito instalar algo?</summary>
              <p>No. La app se abre en el navegador. Para construir y publicar se usa Node, pero es tarea de TI.</p>
            </details>
            <details>
              <summary>¿Puedo usar capturas reales de clientes?</summary>
              <p>
                Solo si tienes autorización y las difuminas antes de exportar. Para aprender o
                hacer demos, usa datos ficticios.
              </p>
            </details>
            <details>
              <summary>¿El SCORM incluye las imágenes originales?</summary>
              <p>
                No. El SCORM contiene las imágenes procesadas. Los originales solo están en el
                navegador y en el respaldo `.simpaso`.
              </p>
            </details>
            <details>
              <summary>¿Puedo editar un SCORM de otra herramienta?</summary>
              <p>
                No de forma fiable. Solo se pueden reimportar paquetes exportados por SimuPaso,
                porque incluyen el proyecto en <code>data/project.json</code>.
              </p>
            </details>
            <details>
              <summary>¿Por qué no veo mis proyectos en otro computador?</summary>
              <p>
                Porque se guardan en el navegador de este equipo, no en un servidor. Usa un
                respaldo `.simpaso` para moverlos.
              </p>
            </details>
            <details>
              <summary>¿El simulador envía datos a un servidor?</summary>
              <p>
                No. La app no tiene backend ni telemetría, y no hace peticiones de red externas.
              </p>
            </details>
            <details>
              <summary>¿Qué pasa con lo que escribe el alumno?</summary>
              <p>
                No se persiste ni se reporta. Las claves enmascaradas se descartan al avanzar.
              </p>
            </details>
          </section>

          <section id="limites" className="about-card">
            <h2>Límites actuales</h2>
            <ul className="about-list">
              <li>No hay anotaciones (texto, flechas, resaltados); el difuminado sí está disponible.</li>
              <li>No hay biblioteca compartida, cuentas ni sincronización.</li>
              <li>La importación de SCORM solo admite paquetes exportados por SimuPaso.</li>
              <li>La compatibilidad con el LMS corporativo está pendiente de prueba.</li>
              <li>La captura se ajusta al espacio; no hay modo 100 % con scroll.</li>
              <li>No se ha probado en Safari.</li>
            </ul>
            <div className="about-final-actions">
              <button type="button" className="secondary-button" onClick={onOpenGuide}>
                Volver a la guía
              </button>
              <button type="button" className="primary-button" onClick={onStart}>
                Empezar a crear
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
