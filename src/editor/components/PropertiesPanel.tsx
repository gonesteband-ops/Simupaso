import { useEffect, useState } from "react";
import {
  INPUT_FONT_SIZE_DEFAULT,
  INPUT_FONT_SIZE_MAX,
  INPUT_FONT_SIZE_MIN,
} from "../../contract/text-style";
import { clampRect, rectToPercent } from "../model/geometry";
import type {
  EditorClickZone,
  EditorRect,
  EditorRedaction,
  EditorStep,
  EditorTextValidation,
  EditorTextZone,
  EditorZoneSelection,
} from "../model/editor-types";

type PropertiesPanelProps = {
  step: EditorStep | null;
  activeZone: EditorZoneSelection;
  redactions: EditorRedaction[];
  onUpdateStep: (patch: Partial<Omit<EditorStep, "id" | "assetId" | "clickZones" | "textZones">>) => void;
  onUpdateClickZone: (zoneId: string, patch: Partial<Omit<EditorClickZone, "id">>) => void;
  onUpdateTextZone: (zoneId: string, patch: Partial<Omit<EditorTextZone, "id">>) => void;
  onUpdateRedaction: (redactionId: string, patch: Partial<Omit<EditorRedaction, "id">>) => void;
  onSelectZone: (selection: EditorZoneSelection) => void;
  onDeleteZone: () => void;
  onDuplicateZone: () => void;
};

function RectFields({
  rect,
  onChange,
}: {
  rect: EditorRect;
  onChange: (rect: EditorRect) => void;
}) {
  const percent = rectToPercent(rect);
  const update = (key: "x" | "y" | "w" | "h", raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const next = { ...rect };
    if (key === "x") next.x = value / 100;
    if (key === "y") next.y = value / 100;
    if (key === "w") next.w = value / 100;
    if (key === "h") next.h = value / 100;
    onChange(clampRect(next));
  };

  return (
    <fieldset className="coordinate-grid">
      <legend>Coordenadas (% de la imagen)</legend>
      {(["x", "y", "w", "h"] as const).map((key) => (
        <label key={key} className="field compact-field">
          <span>{key.toUpperCase()}</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={percent[key]}
            onChange={(event) => update(key, event.target.value)}
          />
        </label>
      ))}
    </fieldset>
  );
}

function zoneFromStep(
  step: EditorStep | null,
  selection: EditorZoneSelection,
): EditorClickZone | EditorTextZone | null {
  if (!step || !selection) return null;
  return selection.kind === "click"
    ? step.clickZones.find((zone) => zone.id === selection.id) ?? null
    : step.textZones.find((zone) => zone.id === selection.id) ?? null;
}

function isTextZone(
  zone: EditorClickZone | EditorTextZone | null,
): zone is EditorTextZone {
  return Boolean(zone && "validation" in zone);
}

export function PropertiesPanel({
  step,
  activeZone,
  redactions,
  onUpdateStep,
  onUpdateClickZone,
  onUpdateTextZone,
  onUpdateRedaction,
  onSelectZone,
  onDeleteZone,
  onDuplicateZone,
}: PropertiesPanelProps) {
  const [tab, setTab] = useState<"step" | "zones" | "redact">("step");
  const zone = zoneFromStep(step, activeZone);
  const redaction =
    activeZone?.kind === "redaction"
      ? redactions.find((item) => item.id === activeZone.id) ?? null
      : null;

  useEffect(() => {
    if (activeZone?.kind === "redaction") setTab("redact");
    else if (activeZone) setTab("zones");
  }, [activeZone]);

  if (!step) {
    return (
      <aside className="properties-panel" aria-label="Propiedades">
        <p className="panel-empty">Selecciona un paso para editar sus propiedades.</p>
      </aside>
    );
  }

  const updateValidationKind = (kind: EditorTextValidation["kind"]) => {
    if (!isTextZone(zone)) return;
    let validation: EditorTextValidation;
    if (kind === "equals") {
      validation = {
        kind: "equals",
        expected: zone.validation.kind === "equals" ? zone.validation.expected : "",
      };
    } else if (kind === "one_of") {
      validation = {
        kind: "one_of",
        values: zone.validation.kind === "one_of" ? zone.validation.values : [""],
      };
    } else if (kind === "rut") {
      validation = { kind: "rut", normalize: true };
    } else {
      validation = { kind: "non_empty" };
    }
    onUpdateTextZone(zone.id, { validation });
  };

  return (
    <aside className="properties-panel" aria-label="Propiedades">
      <div className="panel-tabs" role="tablist" aria-label="Panel de propiedades">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "step"}
          className={tab === "step" ? "panel-tab active" : "panel-tab"}
          onClick={() => setTab("step")}
        >
          Paso
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "zones"}
          className={tab === "zones" ? "panel-tab active" : "panel-tab"}
          onClick={() => setTab("zones")}
        >
          Zonas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "redact"}
          className={tab === "redact" ? "panel-tab active" : "panel-tab"}
          onClick={() => setTab("redact")}
        >
          Difuminado
        </button>
      </div>

      {tab === "step" ? (
        <div className="panel-body">
          <label className="field">
            <span>Título del paso</span>
            <input
              type="text"
              value={step.title}
              onChange={(event) => onUpdateStep({ title: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Instrucción para el alumno</span>
            <textarea
              rows={3}
              value={step.instruction}
              onChange={(event) => onUpdateStep({ instruction: event.target.value })}
              placeholder="Describe qué debe hacer el alumno en esta pantalla."
            />
          </label>

          <label className="field">
            <span>Pista</span>
            <input
              type="text"
              value={step.hint ?? ""}
              onChange={(event) =>
                onUpdateStep({ hint: event.target.value.trim() ? event.target.value : undefined })
              }
              placeholder="Ayuda opcional para el alumno."
            />
          </label>

          <div className="two-column-fields">
            <label className="field">
              <span>Mensaje de error</span>
              <input
                type="text"
                value={step.messages?.error ?? ""}
                onChange={(event) =>
                  onUpdateStep({
                    messages: {
                      ...step.messages,
                      error: event.target.value.trim() ? event.target.value : undefined,
                    },
                  })
                }
              />
            </label>
            <label className="field">
              <span>Mensaje de éxito</span>
              <input
                type="text"
                value={step.messages?.success ?? ""}
                onChange={(event) =>
                  onUpdateStep({
                    messages: {
                      ...step.messages,
                      success: event.target.value.trim() ? event.target.value : undefined,
                    },
                  })
                }
              />
            </label>
          </div>

          <label className="field">
            <span>Tipo de paso</span>
            <select
              value={step.mode}
              onChange={(event) =>
                onUpdateStep({ mode: event.target.value as EditorStep["mode"] })
              }
            >
              <option value="interactive">Interactivo (zonas)</option>
              <option value="informative">Informativo (solo lectura)</option>
            </select>
          </label>

          {step.mode === "informative" && (
            <label className="field">
              <span>Texto del botón</span>
              <input
                type="text"
                value={step.informativeButtonLabel ?? ""}
                placeholder="Siguiente o Finalizar"
                onChange={(event) =>
                  onUpdateStep({
                    informativeButtonLabel: event.target.value.trim()
                      ? event.target.value
                      : undefined,
                  })
                }
              />
            </label>
          )}

          {step.mode === "interactive" && step.clickZones.length > 0 && (
            <label className="field">
              <span>Regla de las zonas de clic</span>
              <select
                value={step.clickMatch}
                onChange={(event) =>
                  onUpdateStep({ clickMatch: event.target.value as "any" | "all" })
                }
              >
                <option value="any">Basta una zona</option>
                <option value="all">Se requieren todas</option>
              </select>
            </label>
          )}

          {step.mode === "informative" &&
            (step.clickZones.length > 0 || step.textZones.length > 0) && (
              <p className="inline-note">
                Las zonas existentes se conservan, pero no se usan mientras el paso sea informativo.
              </p>
            )}
        </div>
      ) : tab === "zones" ? (
        <div className="panel-body">
          {(step.clickZones.length > 0 || step.textZones.length > 0) && (
            <div className="zone-index" aria-label="Zonas del paso">
              {step.clickZones.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    activeZone?.kind === "click" && activeZone.id === item.id
                      ? "zone-index-item active"
                      : "zone-index-item"
                  }
                  onClick={() => onSelectZone({ kind: "click", id: item.id })}
                >
                  Clic {index + 1}
                </button>
              ))}
              {step.textZones.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    activeZone?.kind === "text" && activeZone.id === item.id
                      ? "zone-index-item active"
                      : "zone-index-item"
                  }
                  onClick={() => onSelectZone({ kind: "text", id: item.id })}
                >
                  {item.label.trim() || `Texto ${index + 1}`}
                </button>
              ))}
            </div>
          )}
          {!zone ? (
            <div className="panel-empty">
              <p>Selecciona una zona en el lienzo o agrega una nueva.</p>
              <p className="muted-copy">
                Las zonas de clic y de texto se configuran por separado.
              </p>
            </div>
          ) : isTextZone(zone) ? (
            <>
              <div className="zone-badge text">Zona de texto</div>
              <label className="field">
                <span>Etiqueta</span>
                <input
                  type="text"
                  value={zone.label}
                  onChange={(event) => onUpdateTextZone(zone.id, { label: event.target.value })}
                />
                {!zone.label.trim() && (
                  <small className="field-error">La etiqueta es obligatoria para previsualizar.</small>
                )}
              </label>
              <label className="field">
                <span>Texto de ayuda</span>
                <input
                  type="text"
                  value={zone.placeholder ?? ""}
                  onChange={(event) =>
                    onUpdateTextZone(zone.id, {
                      placeholder: event.target.value.trim() ? event.target.value : undefined,
                    })
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={zone.masked}
                  onChange={(event) =>
                    onUpdateTextZone(zone.id, { masked: event.target.checked })
                  }
                />
                <span>Enmascarar el valor (contraseña)</span>
              </label>
              <label className="field">
                <span>Tamaño del texto (% del alto de la zona)</span>
                <input
                  type="number"
                  min={INPUT_FONT_SIZE_MIN}
                  max={INPUT_FONT_SIZE_MAX}
                  step={1}
                  value={zone.fontSize ?? INPUT_FONT_SIZE_DEFAULT}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    onUpdateTextZone(zone.id, {
                      fontSize: Math.min(
                        INPUT_FONT_SIZE_MAX,
                        Math.max(INPUT_FONT_SIZE_MIN, Math.round(value)),
                      ),
                    });
                  }}
                />
                <small className="field-help">
                  Se ajusta al alto de la zona. Un valor menor reduce la letra.
                </small>
              </label>
              <label className="field">
                <span>Validación</span>
                <select
                  value={zone.validation.kind}
                  onChange={(event) =>
                    updateValidationKind(event.target.value as EditorTextValidation["kind"])
                  }
                >
                  <option value="non_empty">No vacío</option>
                  <option value="equals">Valor exacto</option>
                  <option value="one_of">Lista de valores</option>
                  <option value="rut">RUT chileno</option>
                </select>
              </label>
              {zone.validation.kind === "equals" && (
                <label className="field">
                  <span>Valor esperado</span>
                  <input
                    type="text"
                    value={zone.validation.expected}
                    onChange={(event) =>
                      onUpdateTextZone(zone.id, {
                        validation: { kind: "equals", expected: event.target.value },
                      })
                    }
                  />
                </label>
              )}
              {zone.validation.kind === "one_of" && (
                <label className="field">
                  <span>Valores válidos (uno por línea)</span>
                  <textarea
                    rows={4}
                    value={zone.validation.values.join("\n")}
                    onChange={(event) =>
                      onUpdateTextZone(zone.id, {
                        validation: {
                          kind: "one_of",
                          values: event.target.value.replace(/\r/g, "").split("\n"),
                        },
                      })
                    }
                  />
                </label>
              )}
              {zone.validation.kind === "rut" && (
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={zone.validation.normalize}
                    onChange={(event) =>
                      onUpdateTextZone(zone.id, {
                        validation: { kind: "rut", normalize: event.target.checked },
                      })
                    }
                  />
                  <span>Aceptar con o sin puntos y guion</span>
                </label>
              )}
              <div className="two-column-fields">
                <label className="field">
                  <span>Mensaje de error</span>
                  <input
                    type="text"
                    value={zone.errorMessage ?? ""}
                    onChange={(event) =>
                      onUpdateTextZone(zone.id, {
                        errorMessage: event.target.value.trim() ? event.target.value : undefined,
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Mensaje de éxito</span>
                  <input
                    type="text"
                    value={zone.successMessage ?? ""}
                    onChange={(event) =>
                      onUpdateTextZone(zone.id, {
                        successMessage: event.target.value.trim() ? event.target.value : undefined,
                      })
                    }
                  />
                </label>
              </div>
              <RectFields
                rect={zone.rect}
                onChange={(rect) => onUpdateTextZone(zone.id, { rect })}
              />
            </>
          ) : (
            <>
              <div className="zone-badge click">Zona de clic</div>
              <label className="field">
                <span>Nombre de la zona</span>
                <input
                  type="text"
                  value={zone.label ?? ""}
                  onChange={(event) =>
                    onUpdateClickZone(zone.id, {
                      label: event.target.value.trim() ? event.target.value : undefined,
                    })
                  }
                />
              </label>
              <RectFields
                rect={zone.rect}
                onChange={(rect) => onUpdateClickZone(zone.id, { rect })}
              />
            </>
          )}

          {zone && (
            <div className="zone-actions">
              <button type="button" className="ghost-button" onClick={onDuplicateZone}>
                Duplicar zona
              </button>
              <button type="button" className="ghost-button danger" onClick={onDeleteZone}>
                Eliminar zona
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="panel-body">
          {redactions.length > 0 && (
            <div className="zone-index" aria-label="Difuminados de la imagen">
              {redactions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    activeZone?.kind === "redaction" && activeZone.id === item.id
                      ? "zone-index-item active"
                      : "zone-index-item"
                  }
                  onClick={() => onSelectZone({ kind: "redaction", id: item.id })}
                >
                  Difuminado {index + 1}
                </button>
              ))}
            </div>
          )}

          {!redaction ? (
            <div className="panel-empty">
              <p>No hay un difuminado seleccionado.</p>
              <p className="muted-copy">
                Usa la herramienta <strong>Difuminar (B)</strong> o el botón «Agregar bloque de
                difuminado» y arrastra sobre los datos sensibles.
              </p>
            </div>
          ) : (
            <>
              <div className="zone-badge redact">Difuminado</div>
              <label className="field">
                <span>Estilo</span>
                <select
                  value={redaction.style}
                  onChange={(event) =>
                    onUpdateRedaction(redaction.id, {
                      style: event.target.value as EditorRedaction["style"],
                    })
                  }
                >
                  <option value="solid">Ocultar (bloque sólido)</option>
                  <option value="blur">Difuminar</option>
                  <option value="pixelate">Pixelar</option>
                </select>
              </label>
              {redaction.style !== "solid" && (
                <label className="field">
                  <span>Intensidad</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={redaction.intensity}
                    onChange={(event) =>
                      onUpdateRedaction(redaction.id, {
                        intensity: Number(event.target.value),
                      })
                    }
                  />
                  <small className="field-help">
                    {redaction.intensity} % · más intensidad oculta mejor el contenido.
                  </small>
                </label>
              )}
              <p className="inline-note">
                El original queda solo en este navegador. Al previsualizar o exportar, la zona se
                aplica a la imagen del paquete. Para datos muy sensibles, usa «Ocultar».
              </p>
              <RectFields
                rect={redaction.rect}
                onChange={(rect) => onUpdateRedaction(redaction.id, { rect })}
              />
              <div className="zone-actions">
                <button type="button" className="ghost-button" onClick={onDuplicateZone}>
                  Duplicar difuminado
                </button>
                <button type="button" className="ghost-button danger" onClick={onDeleteZone}>
                  Eliminar difuminado
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
