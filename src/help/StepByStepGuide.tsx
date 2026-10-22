import { useEffect, useLayoutEffect, useRef, useState } from "react";
import demoImage from "../fixtures/assets/search-demo.png";
import "./help.css";

type GuideStep = {
  target: string;
  title: string;
  body: string;
  tip?: string;
};

const STEPS: GuideStep[] = [
  {
    target: "upload",
    title: "Carga una o varias capturas",
    body: "Arrastra tus imágenes o pulsa «Seleccionar archivos». Puedes subir varias a la vez: cada captura se convertirá en un paso del simulador.",
    tip: "Formatos: PNG, JPG o WebP, hasta 10 MB por imagen.",
  },
  {
    target: "steps",
    title: "Revisa la secuencia de pasos",
    body: "Cada imagen aparece en la columna izquierda como un paso. El orden de esa lista es el orden en que el alumno recorrerá el procedimiento.",
    tip: "La miniatura te ayuda a identificar cada pantalla.",
  },
  {
    target: "step-actions",
    title: "Ordena y ajusta los pasos",
    body: "Usa las flechas para mover un paso, el icono de copiar para duplicarlo, el signo + para insertar una captura y la × para eliminarlo.",
    tip: "Puedes deshacer estos cambios mientras el editor esté abierto.",
  },
  {
    target: "tools",
    title: "Marca zonas de clic",
    body: "Elige «Zona de clic» y arrastra sobre el botón o enlace que debe pulsar el alumno. Dibuja todas las zonas válidas que necesites.",
    tip: "En propiedades puedes elegir si basta una zona o se requieren todas.",
  },
  {
    target: "text-zone",
    title: "Agrega campos de texto",
    body: "Con «Zona de texto» marcas dónde se escribe un RUT, una clave u otro dato. Configura etiqueta, placeholder, enmascarado, validación y tamaño de letra.",
    tip: "En los formularios, el globo de ayuda aparece al pasar el mouse o enfocar el campo.",
  },
  {
    target: "properties",
    title: "Ajusta cada detalle en el panel",
    body: "El panel derecho cambia según lo que selecciones: datos del paso, propiedades de la zona o difuminado. Ahí defines validaciones, mensajes y coordenadas.",
    tip: "El tamaño de letra se expresa como porcentaje del alto de la zona.",
  },
  {
    target: "redaction",
    title: "Protege los datos sensibles",
    body: "Usa «Difuminar» para ocultar RUT, nombres, correos o teléfonos. Puedes ocultar con bloque sólido, difuminar o pixelar.",
    tip: "La redacción se aplica a la imagen de la vista previa y del SCORM; el original queda solo en tu navegador.",
  },
  {
    target: "preview",
    title: "Previsualiza el resultado",
    body: "Abre la vista previa para probar el flujo real, desde el paso actual o desde el inicio, sin depender del LMS.",
    tip: "Si falta una zona o una validación, la app te dice qué corregir.",
  },
  {
    target: "download",
    title: "Descarga y respalda",
    body: "Descarga el paquete SCORM 1.2 para subirlo al LMS y un respaldo .simpaso para volver a editar el proyecto con sus imágenes originales.",
    tip: "El respaldo contiene datos sin difuminar: guárdalo en un lugar seguro y no lo subas al LMS.",
  },
];

const PLACEMENTS: Array<"right" | "left" | "bottom" | "top"> = [
  "right",
  "right",
  "right",
  "bottom",
  "right",
  "left",
  "bottom",
  "bottom",
  "bottom",
];

type StepByStepGuideProps = {
  onStart: () => void;
  onOpenManual: () => void;
};

type Spotlight = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function StepByStepGuide({ onStart, onOpenManual }: StepByStepGuideProps) {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(true);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [narrow, setNarrow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      onStart();
      return;
    }
    setIndex((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goPrevious = () => {
    setIndex((current) => Math.max(current - 1, 0));
  };

  const skip = () => {
    setActive(false);
    window.requestAnimationFrame(() => restartRef.current?.focus());
  };

  const restart = () => {
    setIndex(0);
    setActive(true);
  };

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    if (!active) {
      setSpotlight(null);
      return;
    }
    const target = document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`);
    if (!target) {
      setSpotlight(null);
      return;
    }

    const update = () => {
      const rect = target.getBoundingClientRect();
      const padding = 7;
      setSpotlight({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", inline: "center", behavior: reduced ? "auto" : "smooth" });
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, step.target]);

  useEffect(() => {
    if (!active) return;
    tooltipRef.current?.focus({ preventScroll: true });
  }, [active, index]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        skip();
        return;
      }
      if (event.key === "Tab") {
        const focusable = tooltipRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const cardWidth = Math.min(380, window.innerWidth - 32);
  const cardHeight = 300;
  const gap = 16;
  const margin = 16;
  const preference = PLACEMENTS[index] ?? "bottom";
  const cardStyle =
    spotlight && !narrow
      ? (() => {
          const spaceRight =
            window.innerWidth - (spotlight.left + spotlight.width) - gap - margin;
          const spaceLeft = spotlight.left - gap - margin;
          const spaceBelow =
            window.innerHeight - (spotlight.top + spotlight.height) - gap - margin;
          const spaceAbove = spotlight.top - gap - margin;
          const fits = {
            right: spaceRight >= cardWidth,
            left: spaceLeft >= cardWidth,
            bottom: spaceBelow >= cardHeight,
            top: spaceAbove >= cardHeight,
          };
          const order = [preference, "right", "left", "bottom", "top"] as const;
          const placement = order.find((item) => fits[item]) ?? "bottom";

          if (placement === "right") {
            return {
              top: clamp(spotlight.top, margin, window.innerHeight - cardHeight - margin),
              left: spotlight.left + spotlight.width + gap,
              width: cardWidth,
            };
          }
          if (placement === "left") {
            return {
              top: clamp(spotlight.top, margin, window.innerHeight - cardHeight - margin),
              left: spotlight.left - cardWidth - gap,
              width: cardWidth,
            };
          }
          const left = clamp(
            spotlight.left + spotlight.width / 2 - cardWidth / 2,
            margin,
            window.innerWidth - cardWidth - margin,
          );
          if (placement === "top") {
            return {
              top: Math.max(margin, spotlight.top - cardHeight - gap),
              left,
              width: cardWidth,
            };
          }
          return {
            top: Math.min(
              window.innerHeight - cardHeight - margin,
              spotlight.top + spotlight.height + gap,
            ),
            left,
            width: cardWidth,
          };
        })()
      : undefined;

  const showSteps = index >= 1;
  const showActions = index >= 2;
  const showZones = index >= 3;
  const showTextZone = index >= 4;
  const showProperties = index >= 5;
  const showRedaction = index >= 6;
  const showDifuminadoTab = index >= 6;

  return (
    <section className="help-page guide-page" aria-label="Simu Paso a paso">
      <header className="help-hero" style={active ? { pointerEvents: "none" } : undefined}>
        <div>
          <p className="eyebrow">Aprender</p>
          <h1>Simu Paso a paso</h1>
          <p className="help-lede">
            Un recorrido visual por el editor para que puedas crear tu primer simulador sin
            buscar ayuda. Usa Siguiente o las flechas del teclado.
          </p>
        </div>
        <div className="help-actions">
          <button type="button" className="secondary-button" onClick={onOpenManual}>
            Ver manual
          </button>
          <button type="button" className="primary-button" onClick={onStart}>
            Empezar a crear
          </button>
        </div>
      </header>

      <div className="guide-mock" aria-hidden="true">
        <div className="guide-topbar">
          <span className="guide-back">← Volver</span>
          <div className="guide-title">
            <small>Editor</small>
            <strong>Proyecto de ejemplo</strong>
          </div>
          <span className="guide-save">Guardado localmente</span>
          <span className="guide-fake-button">Deshacer</span>
          <span className="guide-fake-button">Rehacer</span>
          <span className="guide-fake-button primary" data-guide="preview">
            Vista previa
          </span>
          <span className="guide-download-group" data-guide="download">
            <span className="guide-fake-button">Descargar SCORM 1.2</span>
            <span className="guide-fake-button">Descargar respaldo</span>
          </span>
        </div>

        <div className="guide-layout">
          <aside className="guide-steps-panel" data-guide="steps">
            <div className="guide-panel-heading">
              <strong>Pasos</strong>
              <span>{showSteps ? "3" : "0"}</span>
            </div>
            {showSteps ? (
              <div className="guide-step-list">
                {[
                  { name: "1_home", count: "1 zona" },
                  { name: "2_login", count: "2 zonas · formulario", active: true },
                  { name: "3_panel", count: "1 zona" },
                ].map((item, itemIndex) => (
                  <div
                    key={item.name}
                    className={item.active ? "guide-step-row active" : "guide-step-row"}
                  >
                    <span className="guide-step-number">{itemIndex + 1}</span>
                    <img src={demoImage} alt="" />
                    <span className="guide-step-copy">
                      <strong>{item.name}</strong>
                      <small>{item.count}</small>
                    </span>
                    <span
                      className="guide-step-actions"
                      data-guide={item.active && showActions ? "step-actions" : undefined}
                    >
                      <i>↑</i>
                      <i>↓</i>
                      <i>⧉</i>
                      <i>＋</i>
                      <i>×</i>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="guide-empty">Aún no hay capturas.</p>
            )}
          </aside>

          <main className="guide-main">
            {index === 0 ? (
              <div className="guide-upload-card" data-guide="upload">
                <strong>Cargar capturas</strong>
                <span>Arrastra imágenes aquí, selecciónalas o pégalas con Ctrl+V.</span>
                <small>PNG, JPG o WebP · máximo 10 MB por imagen</small>
                <span className="guide-fake-button">Seleccionar archivos</span>
                <small className="guide-privacy">
                  Las capturas quedan solo en este navegador. Difumina los datos sensibles
                  antes de exportar.
                </small>
              </div>
            ) : (
              <>
                <div className="guide-toolbar" data-guide="tools">
                  <span className="guide-tool">Seleccionar</span>
                  <span className="guide-tool">Zona de clic</span>
                  <span className="guide-tool">Zona de texto</span>
                  <span className="guide-tool highlighted" data-guide="redaction">
                    Difuminar
                  </span>
                  <span className="guide-tool">Mano</span>
                  <span className="guide-zoom">− 100 % +</span>
                </div>
                <div className="guide-canvas" data-guide="canvas">
                  <img src={demoImage} alt="" className="guide-canvas-image" />
                  {showZones && (
                    <>
                      <span className="guide-zone click" />
                      {showTextZone && (
                        <span className="guide-zone text" data-guide="text-zone">
                          <span className="guide-overlay-input">Ingresa RUT</span>
                          <span className="guide-mini-tooltip">Ingresa RUT</span>
                        </span>
                      )}
                      {showRedaction && <span className="guide-zone redaction" />}
                    </>
                  )}
                </div>
                <div className="guide-status">
                  <span>2_login · 2 zonas</span>
                  <span>{showTextZone ? "Selección: zona de texto" : "Sin selección"}</span>
                </div>
              </>
            )}
          </main>

          <aside className="guide-properties" data-guide="properties">
            <div className="guide-tabs">
              <span className={!showDifuminadoTab && index < 3 ? "active" : ""}>Paso</span>
              <span className={!showDifuminadoTab && index >= 3 ? "active" : ""}>Zonas</span>
              <span className={showDifuminadoTab ? "active" : ""}>Difuminado</span>
            </div>
            {showProperties ? (
              showDifuminadoTab ? (
                <div className="guide-fields">
                  <span className="guide-field-label">Estilo</span>
                  <span className="guide-input">Ocultar (bloque sólido)</span>
                  <span className="guide-field-label">Intensidad</span>
                  <span className="guide-input">60 %</span>
                  <p className="guide-note">
                    La redacción se aplica a la imagen de la vista previa y del SCORM.
                  </p>
                </div>
              ) : (
                <div className="guide-fields">
                  <span className="guide-field-label">Etiqueta</span>
                  <span className="guide-input">RUT</span>
                  <span className="guide-field-label">Validación</span>
                  <span className="guide-input">RUT chileno</span>
                  <span className="guide-field-label">Tamaño del texto</span>
                  <span className="guide-input">28 %</span>
                  <label className="guide-check">
                    <span className="guide-check-box" /> Enmascarar el valor
                  </label>
                </div>
              )
            ) : (
              <p className="guide-empty">Selecciona una zona para ver sus propiedades.</p>
            )}
          </aside>
        </div>
      </div>

      {!active && (
        <div className="guide-paused" role="status">
          <span>La guía está oculta. Puedes retomarla cuando quieras.</span>
          <button ref={restartRef} type="button" className="secondary-button" onClick={restart}>
            Reiniciar guía
          </button>
        </div>
      )}

      {active && (
        <>
          <div className="guide-blocker" aria-hidden="true" />
          {spotlight && (
            <div
              className="guide-spotlight"
              style={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
              }}
              aria-hidden="true"
            />
          )}
          <div
            ref={tooltipRef}
            className={narrow ? "guide-tooltip narrow" : "guide-tooltip"}
            style={cardStyle}
            role="dialog"
            aria-modal="true"
            aria-label="Simu Paso a paso"
            tabIndex={-1}
          >
            <p className="guide-kicker">
              Paso {index + 1} de {STEPS.length}
            </p>
            <p className="visually-hidden" aria-live="polite">
              Paso {index + 1} de {STEPS.length}: {step.title}
            </p>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
            {step.tip && <p className="guide-tip">{step.tip}</p>}
            <div className="guide-progress" aria-hidden="true">
              <span style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
            </div>
            <div className="guide-actions">
              <button type="button" className="ghost-button" onClick={skip}>
                Saltar
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={goPrevious}
                disabled={index === 0}
              >
                Anterior
              </button>
              {isLast ? (
                <>
                  <button type="button" className="secondary-button" onClick={onOpenManual}>
                    Ver manual
                  </button>
                  <button type="button" className="primary-button" onClick={onStart}>
                    Empezar a crear
                  </button>
                </>
              ) : (
                <button type="button" className="primary-button" onClick={goNext}>
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
