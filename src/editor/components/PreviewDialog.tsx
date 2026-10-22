import { useEffect, useMemo, useRef, useState } from "react";
import type { CompileResult } from "../model/compile-project";
import {
  PREVIEW_ERROR,
  PREVIEW_LOAD,
  PREVIEW_MOUNTED,
  PREVIEW_READY,
  buildPreviewAssetUrls,
  parsePreviewToEditorMessage,
} from "../model/preview-message";
import { applyRedactionsToImage } from "../model/redact-image";
import { redactionsForAsset } from "../model/redactions";
import type {
  EditorAsset,
  EditorIssue,
  EditorProject,
} from "../model/editor-types";

type PreviewDialogProps = {
  result: CompileResult;
  document: EditorProject;
  assets: readonly EditorAsset[];
  initialStepId: string | null;
  onClose: () => void;
  onGoToIssue: (issue: EditorIssue) => void;
};

type PreviewStatus = "loading" | "mounted" | "error";

export function PreviewDialog({
  result,
  document,
  assets,
  initialStepId,
  onClose,
  onGoToIssue,
}: PreviewDialogProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const requestIdRef = useRef(crypto.randomUUID());
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [error, setError] = useState("");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string> | null>(null);
  const previewUrl = useMemo(
    () => new URL("preview.html", window.location.href).href,
    [],
  );

  useEffect(() => {
    if (!result.ok) {
      setPreviewUrls(null);
      return;
    }
    let cancelled = false;
    const created: string[] = [];

    void (async () => {
      try {
        const prepared = await Promise.all(
          assets.map(async (asset) => {
            const redactions = redactionsForAsset(document, asset.id);
            if (redactions.length === 0) return asset;
            const blob = await applyRedactionsToImage(asset.blob, redactions);
            return { ...asset, blob };
          }),
        );
        if (cancelled) return;
        const urls = buildPreviewAssetUrls(result.project, prepared);
        created.push(...Object.values(urls));
        setPreviewUrls(urls);
      } catch (prepareError) {
        if (cancelled) return;
        setStatus("error");
        setError(
          prepareError instanceof Error
            ? prepareError.message
            : "No se pudieron preparar las imágenes de la vista previa.",
        );
      }
    })();

    return () => {
      cancelled = true;
      for (const url of created) {
        URL.revokeObjectURL(url);
      }
    };
  }, [assets, document, result]);

  const closeDialog = () => {
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!result.ok || !previewUrls) return;
    if (Object.keys(previewUrls).length === 0) return;
    const initialIndex = Math.max(
      0,
      result.project.steps.findIndex((step) => step.id === initialStepId),
    );
    const payload = {
      type: PREVIEW_LOAD,
      requestId: requestIdRef.current,
      project: result.project,
      assets: previewUrls,
      initialStepIndex: initialIndex,
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      const message = parsePreviewToEditorMessage(event.data);
      if (!message) return;
      if (message.type === PREVIEW_READY) {
        frameRef.current?.contentWindow?.postMessage(payload, window.location.origin);
        return;
      }
      if (message.requestId !== requestIdRef.current) return;
      if (message.type === PREVIEW_MOUNTED) {
        setStatus("mounted");
        setError("");
        return;
      }
      if (message.type === PREVIEW_ERROR) {
        setStatus("error");
        setError(message.message);
      }
    };
    window.addEventListener("message", onMessage);
    const timeout = window.setTimeout(() => {
      setStatus((current) => {
        if (current === "loading") {
          setError("La vista previa tardó demasiado en responder. Inténtalo de nuevo.");
          return "error";
        }
        return current;
      });
    }, 5000);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
    };
  }, [initialStepId, previewUrls, result]);

  return (
    <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Vista previa">
      <div className="preview-dialog">
        <header className="preview-header">
          <div>
            <p className="eyebrow">Vista previa</p>
            <h2>{document.meta.title}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={closeDialog} autoFocus>
            Cerrar vista previa
          </button>
        </header>

        {!result.ok ? (
          <div className="preview-issues">
            <h3>Revisa estos puntos antes de continuar</h3>
            <p>Corrige estos puntos para previsualizar o exportar:</p>
            <ul>
              {result.issues.map((issue, index) => {
                const step = document.steps.find((item) => item.id === issue.stepId);
                return (
                  <li key={`${issue.field}-${issue.stepId ?? "proyecto"}-${index}`}>
                    <span>{issue.message}</span>
                    {issue.stepId && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          onGoToIssue(issue);
                          closeDialog();
                        }}
                      >
                        {issue.zoneId ? "Ir a la zona" : `Ir al paso${step ? ` «${step.title}»` : ""}`}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="preview-actions">
              <button type="button" className="ghost-button" onClick={closeDialog}>
                Volver al editor
              </button>
            </div>
          </div>
        ) : (
          <div className="preview-frame-wrap">
            {status !== "mounted" && (
              <div className="preview-status" role="status">
                {status === "error"
                  ? error
                  : previewUrls
                    ? "Cargando la vista previa…"
                    : "Preparando las imágenes…"}
              </div>
            )}
            {previewUrls && (
              <iframe
                ref={frameRef}
                className="preview-frame"
                src={previewUrl}
                title="Vista previa del simulador"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
