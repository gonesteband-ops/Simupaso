import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectDraft } from "../app/storage";
import { moveRect } from "./model/geometry";
import type {
  EditorIssue,
  EditorRect,
  EditorStep,
  EditorZoneSelection,
} from "./model/editor-types";
import { compileEditorProject, type CompileResult } from "./model/compile-project";
import { downloadBytes, exportEditorProject } from "./model/export-scorm";
import { createProjectBackup } from "./model/project-backup";
import { createRedaction, redactionsForAsset } from "./model/redactions";
import { CanvasStage } from "./components/CanvasStage";
import { PreviewDialog } from "./components/PreviewDialog";
import { ImageDropZone } from "./components/ImageDropZone";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { StepList } from "./components/StepList";
import { useEditor } from "./hooks/useEditor";
import "./editor.css";

type EditorPageProps = {
  draft: ProjectDraft;
  onClose: () => void;
  onDraftUpdated: (
    draftId: string,
    patch: { stepCount: number; updatedAt: string },
  ) => void;
};

function findRect(
  step: EditorStep | null,
  redactions: ReturnType<typeof redactionsForAsset>,
  selection: EditorZoneSelection,
) {
  if (!step || !selection) return null;
  if (selection.kind === "click") {
    return step.clickZones.find((zone) => zone.id === selection.id)?.rect ?? null;
  }
  if (selection.kind === "text") {
    return step.textZones.find((zone) => zone.id === selection.id)?.rect ?? null;
  }
  return redactions.find((item) => item.id === selection.id)?.rect ?? null;
}

function saveLabel(state: string, storageState: string): string {
  if (storageState === "checking") return "Comprobando almacenamiento…";
  if (storageState === "unavailable") return "Sin persistencia";
  if (state === "saving") return "Guardando…";
  if (state === "error") return "Error al guardar";
  if (state === "saved") return "Guardado localmente";
  return "Sin cambios todavía";
}

export function EditorPage({ draft, onClose, onDraftUpdated }: EditorPageProps) {
  const editor = useEditor({ draft, onDraftUpdated });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [insertAfterStepId, setInsertAfterStepId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [previewResult, setPreviewResult] = useState<CompileResult | null>(null);
  const [exportState, setExportState] = useState<"idle" | "exporting" | "success" | "error">(
    "idle",
  );
  const [exportIssues, setExportIssues] = useState<EditorIssue[]>([]);
  const [exportMessage, setExportMessage] = useState("");
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [showBackupConfirm, setShowBackupConfirm] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [backupState, setBackupState] = useState<"idle" | "generating" | "error">("idle");
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const insertInputRef = useRef<HTMLInputElement>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);

  const assetsById = useMemo(
    () =>
      Object.fromEntries(editor.assets.map((asset) => [asset.id, asset])) as Record<
        string,
        (typeof editor.assets)[number]
      >,
    [editor.assets],
  );

  const handleFiles = async (files: File[], afterStepId?: string) => {
    const result = await editor.addImages(files, afterStepId);
    setUploadErrors(result.errors);
    setInsertAfterStepId(null);
  };

  const updateZoneRect = (selection: EditorZoneSelection, rect: EditorRect) => {
    if (!selection || !editor.activeStep) return;
    if (selection.kind === "click") {
      editor.dispatch({
        type: "updateClickZone",
        stepId: editor.activeStep.id,
        zoneId: selection.id,
        patch: { rect },
      });
    } else if (selection.kind === "text") {
      editor.dispatch({
        type: "updateTextZone",
        stepId: editor.activeStep.id,
        zoneId: selection.id,
        patch: { rect },
      });
    } else if (editor.activeAsset) {
      editor.dispatch({
        type: "updateRedaction",
        assetId: editor.activeAsset.id,
        redactionId: selection.id,
        patch: { rect },
      });
    }
  };

  const deleteZone = () => {
    if (!editor.activeZone || !editor.activeStep) return;
    if (editor.activeZone.kind === "click") {
      editor.dispatch({
        type: "deleteClickZone",
        stepId: editor.activeStep.id,
        zoneId: editor.activeZone.id,
      });
    } else if (editor.activeZone.kind === "text") {
      editor.dispatch({
        type: "deleteTextZone",
        stepId: editor.activeStep.id,
        zoneId: editor.activeZone.id,
      });
    } else if (editor.activeAsset) {
      editor.dispatch({
        type: "deleteRedaction",
        assetId: editor.activeAsset.id,
        redactionId: editor.activeZone.id,
      });
    }
    editor.setActiveZone(null);
  };

  const duplicateZone = () => {
    if (!editor.activeZone || !editor.activeStep) return;
    if (editor.activeZone.kind === "click") {
      editor.dispatch({
        type: "duplicateClickZone",
        stepId: editor.activeStep.id,
        zoneId: editor.activeZone.id,
      });
    } else if (editor.activeZone.kind === "text") {
      editor.dispatch({
        type: "duplicateTextZone",
        stepId: editor.activeStep.id,
        zoneId: editor.activeZone.id,
      });
    } else if (editor.activeAsset) {
      editor.dispatch({
        type: "duplicateRedaction",
        assetId: editor.activeAsset.id,
        redactionId: editor.activeZone.id,
      });
    }
  };

  const reorderStep = (sourceId: string, targetId: string) => {
    const targetIndex = editor.document.steps.findIndex((step) => step.id === targetId);
    if (targetIndex < 0) return;
    editor.dispatch({ type: "reorderStep", stepId: sourceId, toIndex: targetIndex });
  };

  const moveStep = (stepId: string, direction: -1 | 1) => {
    const index = editor.document.steps.findIndex((step) => step.id === stepId);
    if (index < 0) return;
    editor.dispatch({ type: "reorderStep", stepId, toIndex: index + direction });
  };

  const deleteStep = (stepId: string) => {
    editor.dispatch({ type: "deleteStep", stepId });
    setDeleteTarget(null);
  };

  const addClickZone = (rect: EditorRect) => {
    if (!editor.activeStep) return;
    const id = `zona-${crypto.randomUUID()}`;
    editor.dispatch({
      type: "addClickZone",
      stepId: editor.activeStep.id,
      zone: { id, rect },
    });
    editor.setActiveZone({ kind: "click", id });
  };

  const addTextZone = (rect: EditorRect) => {
    if (!editor.activeStep) return;
    const id = `texto-${crypto.randomUUID()}`;
    editor.dispatch({
      type: "addTextZone",
      stepId: editor.activeStep.id,
      zone: {
        id,
        rect,
        label: "Nuevo campo",
        masked: false,
        validation: { kind: "non_empty" },
      },
    });
    editor.setActiveZone({ kind: "text", id });
  };

  const addRedaction = (rect: EditorRect) => {
    if (!editor.activeAsset) return;
    const redaction = createRedaction({ rect });
    editor.dispatch({
      type: "addRedaction",
      assetId: editor.activeAsset.id,
      redaction,
    });
    editor.setActiveZone({ kind: "redaction", id: redaction.id });
  };

  useEffect(() => {
    if (!deleteTarget) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleteTarget(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [deleteTarget]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (event.ctrlKey || event.metaKey) {
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) editor.redo();
          else editor.undo();
          return;
        }
        if (key === "y") {
          event.preventDefault();
          editor.redo();
          return;
        }
        if (key === "d" && editor.activeZone) {
          event.preventDefault();
          duplicateZone();
          return;
        }
      }
      if ((event.key === "Delete" || event.key === "Backspace") && editor.activeZone) {
        event.preventDefault();
        deleteZone();
        return;
      }
      if (event.key === "Escape") {
        editor.setActiveZone(null);
        return;
      }
      if (event.key.startsWith("Arrow") && editor.activeZone && editor.activeStep) {
        event.preventDefault();
        const rect = findRect(
          editor.activeStep,
          editor.activeRedactions,
          editor.activeZone,
        );
        if (!rect) return;
        const step = editor.activeAsset;
        const stepX = (event.shiftKey ? 10 : 1) / (step?.width ?? 1000);
        const stepY = (event.shiftKey ? 10 : 1) / (step?.height ?? 1000);
        const dx = event.key === "ArrowLeft" ? -stepX : event.key === "ArrowRight" ? stepX : 0;
        const dy = event.key === "ArrowUp" ? -stepY : event.key === "ArrowDown" ? stepY : 0;
        updateZoneRect(editor.activeZone, moveRect(rect, dx, dy));
        return;
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (key === "v") editor.setTool("select");
        if (key === "c") editor.setTool("click");
        if (key === "t") editor.setTool("text");
        if (key === "b") editor.setTool("redact");
        if (key === "h") editor.setTool("hand");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const closePreview = () => {
    setPreviewResult(null);
    window.requestAnimationFrame(() => previewButtonRef.current?.focus());
  };

  const openPreview = () => {
    setPreviewResult(compileEditorProject(editor.document, editor.assets));
  };

  const goToIssue = (issue: EditorIssue) => {
    if (!issue.stepId) return;
    editor.setActiveStepId(issue.stepId);
    if (!issue.zoneId) return;
    const step = editor.document.steps.find((item) => item.id === issue.stepId);
    if (!step) return;
    if (step.clickZones.some((zone) => zone.id === issue.zoneId)) {
      editor.setActiveZone({ kind: "click", id: issue.zoneId });
    } else if (step.textZones.some((zone) => zone.id === issue.zoneId)) {
      editor.setActiveZone({ kind: "text", id: issue.zoneId });
    }
  };

  const exportScorm = async () => {
    setExportState("exporting");
    setExportIssues([]);
    setExportMessage("");
    try {
      const result = await exportEditorProject(editor.document, editor.assets);
      if (!result.ok) {
        setExportState("error");
        setExportIssues(result.issues);
        return;
      }
      downloadBytes(result.fileName, result.bytes);
      setExportState("success");
      setExportMessage(`Se descargó «${result.fileName}».`);
    } catch (error) {
      setExportState("error");
      setExportIssues([
        {
          field: "export",
          message:
            error instanceof Error
              ? `No se pudo exportar: ${error.message}`
              : "No se pudo exportar el paquete SCORM.",
        },
      ]);
    }
  };

  const totalRedactions = editor.redactions.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  const downloadBackup = async () => {
    setBackupState("generating");
    setBackupError("");
    setBackupMessage("");
    try {
      const backup = await createProjectBackup(editor.document, editor.assets);
      downloadBytes(backup.fileName, backup.bytes);
      setBackupState("idle");
      setShowBackupConfirm(false);
      setBackupMessage(`Se descargó «${backup.fileName}».`);
    } catch (error) {
      setBackupState("error");
      setBackupError(
        error instanceof Error
          ? `No se pudo crear el respaldo: ${error.message}`
          : "No se pudo crear el respaldo.",
      );
    }
  };

  const closeEditor = async () => {
    const saved = await editor.saveNow();
    if (!saved && editor.storageState === "available") return;
    onClose();
  };

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div className="editor-heading">
          <button type="button" className="ghost-button" onClick={() => void closeEditor()}>
            ← Volver a proyectos
          </button>
          <div>
            <p className="eyebrow">Editor</p>
            <h1>{editor.document.meta.title}</h1>
          </div>
        </div>
        <div className="editor-header-actions">
          <span className={`save-indicator ${editor.saveState}`} role="status" aria-live="polite">
            {saveLabel(editor.saveState, editor.storageState)}
          </span>
          <button
            type="button"
            className="ghost-button"
            onClick={editor.undo}
            disabled={!editor.canUndo}
          >
            Deshacer
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={editor.redo}
            disabled={!editor.canRedo}
          >
            Rehacer
          </button>
          <button
            ref={previewButtonRef}
            type="button"
            className="primary-button"
            onClick={openPreview}
          >
            Vista previa
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setPrivacyConfirmed(false);
              setShowExportConfirm(true);
            }}
            disabled={exportState === "exporting" || editor.isLoading}
          >
            {exportState === "exporting" ? "Generando paquete…" : "Descargar SCORM 1.2"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setBackupConfirmed(false);
              setBackupError("");
              setShowBackupConfirm(true);
            }}
            disabled={backupState === "generating" || editor.isLoading}
          >
            {backupState === "generating" ? "Generando respaldo…" : "Descargar respaldo"}
          </button>
        </div>
      </header>

      {exportState === "error" && exportIssues.length > 0 && (
        <div className="storage-warning" role="alert">
          <strong>No se pudo descargar el SCORM.</strong>
          <ul>
            {exportIssues.map((issue, index) => (
              <li key={`${issue.field}-${index}`}>{issue.message}</li>
            ))}
          </ul>
          <button type="button" className="ghost-button" onClick={openPreview}>
            Revisar problemas
          </button>
        </div>
      )}

      {exportState === "success" && (
        <div className="export-success" role="status">
          {exportMessage}
        </div>
      )}

      {backupMessage && (
        <div className="export-success" role="status">
          {backupMessage}
        </div>
      )}

      {editor.storageState === "unavailable" && (
        <div className="storage-warning" role="alert">
          <strong>Sin persistencia local.</strong> El navegador no permitió guardar este proyecto.
          Puedes editar durante esta sesión, pero los cambios se perderán al cerrarla.
          {editor.saveError && <span> {editor.saveError}</span>}
        </div>
      )}

      {editor.saveState === "error" && editor.storageState !== "unavailable" && (
        <div className="storage-warning" role="alert">
          <strong>No se pudo guardar.</strong> {editor.saveError}
        </div>
      )}

      {editor.isLoading ? (
        <div className="editor-loading" role="status">
          Cargando el proyecto…
        </div>
      ) : (
        <div className="editor-body">
          <StepList
            steps={editor.document.steps}
            assetsById={assetsById}
            assetUrls={editor.assetUrls}
            activeStepId={editor.activeStepId}
            onSelect={editor.setActiveStepId}
            onReorder={reorderStep}
            onMove={moveStep}
            onDuplicate={(stepId) => editor.dispatch({ type: "duplicateStep", stepId })}
            onDelete={(stepId) => setDeleteTarget(stepId)}
            onInsertCapture={(stepId) => {
              setInsertAfterStepId(stepId);
              insertInputRef.current?.click();
            }}
          />

          <div className="editor-center">
            <div className="editor-upload-bar">
              <ImageDropZone
                compact
                disabled={editor.isLoading}
                onFiles={(files) => void handleFiles(files)}
                label="Agregar capturas"
              />
            </div>

            {uploadErrors.length > 0 && (
              <div className="upload-errors" role="alert">
                <strong>Algunas imágenes no se agregaron:</strong>
                <ul>
                  {uploadErrors.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            <CanvasStage
              step={editor.activeStep}
              asset={editor.activeAsset}
              assetUrl={editor.activeAsset ? editor.assetUrls[editor.activeAsset.id] : undefined}
              tool={editor.tool}
              zoom={editor.zoom}
              pan={editor.pan}
              activeZone={editor.activeZone}
              redactions={editor.activeRedactions}
              onSelectZone={editor.setActiveZone}
              onAddClickZone={addClickZone}
              onAddTextZone={addTextZone}
              onAddRedaction={addRedaction}
              onUpdateZoneRect={updateZoneRect}
              onZoomChange={editor.setZoom}
              onPanChange={editor.setPan}
              onToolChange={editor.setTool}
            />
          </div>

          <PropertiesPanel
            step={editor.activeStep}
            activeZone={editor.activeZone}
            redactions={editor.activeRedactions}
            onUpdateStep={(patch) => {
              if (!editor.activeStep) return;
              editor.dispatch({
                type: "updateStep",
                stepId: editor.activeStep.id,
                patch,
              });
            }}
            onUpdateClickZone={(zoneId, patch) => {
              if (!editor.activeStep) return;
              editor.dispatch({
                type: "updateClickZone",
                stepId: editor.activeStep.id,
                zoneId,
                patch,
              });
            }}
            onUpdateTextZone={(zoneId, patch) => {
              if (!editor.activeStep) return;
              editor.dispatch({
                type: "updateTextZone",
                stepId: editor.activeStep.id,
                zoneId,
                patch,
              });
            }}
            onUpdateRedaction={(redactionId, patch) => {
              if (!editor.activeAsset) return;
              editor.dispatch({
                type: "updateRedaction",
                assetId: editor.activeAsset.id,
                redactionId,
                patch,
              });
            }}
            onSelectZone={editor.setActiveZone}
            onDeleteZone={deleteZone}
            onDuplicateZone={duplicateZone}
          />
        </div>
      )}

      <input
        ref={insertInputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          if (files.length > 0) {
            void handleFiles(files, insertAfterStepId ?? undefined);
          }
        }}
      />

      {previewResult && (
        <PreviewDialog
          result={previewResult}
          document={editor.document}
          assets={editor.assets}
          initialStepId={editor.activeStepId}
          onClose={closePreview}
          onGoToIssue={goToIssue}
        />
      )}

      {showBackupConfirm && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar respaldo"
        >
          <div className="confirm-card">
            <h2>Descargar respaldo</h2>
            <p>
              El archivo <strong>.simpaso</strong> incluye el proyecto editable, las capturas
              originales sin difuminar y los rectángulos de difuminado.
            </p>
            <p className="field-error">
              No subas este respaldo al LMS. Guárdalo en un lugar seguro y con acceso
              restringido.
            </p>
            {backupError && <p className="field-error" role="alert">{backupError}</p>}
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={backupConfirmed}
                onChange={(event) => setBackupConfirmed(event.target.checked)}
              />
              <span>Entiendo que el respaldo contiene imágenes originales sin difuminar.</span>
            </label>
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setShowBackupConfirm(false);
                  setBackupError("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!backupConfirmed || backupState === "generating"}
                onClick={() => void downloadBackup()}
              >
                {backupState === "generating" ? "Generando respaldo…" : "Descargar respaldo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportConfirm && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar exportación"
        >
          <div className="confirm-card">
            <h2>Antes de descargar</h2>
            <p>
              El paquete incluirá las capturas con los difuminados aplicados. Los originales
              quedan solo en este navegador.
            </p>
            {totalRedactions === 0 && (
              <p className="field-error">
                No has agregado ningún difuminado. Revisa que las capturas no contengan datos
                personales reales.
              </p>
            )}
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={privacyConfirmed}
                onChange={(event) => setPrivacyConfirmed(event.target.checked)}
              />
              <span>Revisé que las capturas no contienen datos personales reales.</span>
            </label>
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setShowExportConfirm(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!privacyConfirmed || exportState === "exporting"}
                onClick={() => {
                  setShowExportConfirm(false);
                  void exportScorm();
                }}
              >
                {exportState === "exporting" ? "Generando paquete…" : "Descargar SCORM 1.2"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Eliminar paso">
          <div className="confirm-card">
            <h2>Eliminar paso</h2>
            <p>Se eliminarán la imagen y las zonas de este paso. Puedes deshacerlo mientras el editor esté abierto.</p>
            <div className="confirm-actions">
              <button type="button" className="ghost-button" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="danger-button" onClick={() => deleteStep(deleteTarget)}>
                Eliminar paso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
