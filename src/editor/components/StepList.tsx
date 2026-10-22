import type { EditorAsset, EditorStep } from "../model/editor-types";

type StepListProps = {
  steps: EditorStep[];
  assetsById: Record<string, EditorAsset>;
  assetUrls: Record<string, string>;
  activeStepId: string | null;
  onSelect: (stepId: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onMove: (stepId: string, direction: -1 | 1) => void;
  onDuplicate: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onInsertCapture: (stepId: string) => void;
};

export function StepList({
  steps,
  assetsById,
  assetUrls,
  activeStepId,
  onSelect,
  onReorder,
  onMove,
  onDuplicate,
  onDelete,
  onInsertCapture,
}: StepListProps) {
  return (
    <section className="step-list-panel" aria-label="Pasos del simulador">
      <div className="panel-heading">
        <h2>Pasos</h2>
        <span className="count-chip">{steps.length}</span>
      </div>
      {steps.length === 0 ? (
        <p className="panel-empty">Aún no hay capturas. Carga la primera para crear un paso.</p>
      ) : (
        <ol className="step-list">
          {steps.map((step, index) => {
            const asset = assetsById[step.assetId];
            const url = assetUrls[step.assetId];
            const active = step.id === activeStepId;
            return (
              <li
                key={step.id}
                className={active ? "step-item active" : "step-item"}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", step.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/plain");
                  if (sourceId && sourceId !== step.id) {
                    onReorder(sourceId, step.id);
                  }
                }}
              >
                <button
                  type="button"
                  className="step-select"
                  onClick={() => onSelect(step.id)}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="step-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="step-thumb">
                    {url ? (
                      <img src={url} alt="" draggable={false} />
                    ) : asset ? (
                      <span className="thumb-placeholder">Sin vista</span>
                    ) : (
                      <span className="thumb-placeholder">Sin imagen</span>
                    )}
                  </span>
                  <span className="step-copy">
                    <strong>{step.title}</strong>
                    <small>
                      {step.mode === "informative"
                        ? "Informativo"
                        : `${step.clickZones.length + step.textZones.length} zonas${
                            (step.checkboxZones?.length ?? 0) > 0
                              ? ` · ${step.checkboxZones?.length} casillas`
                              : ""
                          }`}
                    </small>
                  </span>
                </button>
                <div className="step-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onMove(step.id, -1)}
                    disabled={index === 0}
                    aria-label={`Mover paso ${index + 1} arriba`}
                    title="Mover arriba"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onMove(step.id, 1)}
                    disabled={index === steps.length - 1}
                    aria-label={`Mover paso ${index + 1} abajo`}
                    title="Mover abajo"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onDuplicate(step.id)}
                    aria-label={`Duplicar paso ${index + 1}`}
                    title="Duplicar"
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onInsertCapture(step.id)}
                    aria-label={`Insertar captura después del paso ${index + 1}`}
                    title="Insertar captura después"
                  >
                    ＋
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => onDelete(step.id)}
                    aria-label={`Eliminar paso ${index + 1}`}
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
