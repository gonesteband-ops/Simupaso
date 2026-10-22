import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  clampRect,
  clampZoom,
  clientToNormalized,
  fitZoom,
  moveRect,
  rectFromPoints,
  resizeRect,
  type Point,
  type ResizeHandle,
} from "../model/geometry";
import type {
  EditorAsset,
  EditorRect,
  EditorRedaction,
  EditorStep,
  EditorTool,
  EditorZoneSelection,
} from "../model/editor-types";

type DragState =
  | {
      kind: "create";
      tool: "click" | "text" | "redact";
      start: Point;
      current: Point;
    }
  | {
      kind: "move";
      zoneKind: "click" | "text" | "redaction";
      zoneId: string;
      start: Point;
      original: EditorRect;
      current: EditorRect;
    }
  | {
      kind: "resize";
      zoneKind: "click" | "text" | "redaction";
      zoneId: string;
      handle: ResizeHandle;
      start: Point;
      original: EditorRect;
      current: EditorRect;
    }
  | {
      kind: "pan";
      startClientX: number;
      startClientY: number;
      originalPan: Point;
    };

type CanvasStageProps = {
  step: EditorStep | null;
  asset: EditorAsset | null;
  assetUrl?: string;
  tool: EditorTool;
  zoom: number;
  pan: Point;
  activeZone: EditorZoneSelection;
  redactions: EditorRedaction[];
  onSelectZone: (zone: EditorZoneSelection) => void;
  onAddClickZone: (rect: EditorRect) => void;
  onAddTextZone: (rect: EditorRect) => void;
  onAddRedaction: (rect: EditorRect) => void;
  onUpdateZoneRect: (zone: EditorZoneSelection, rect: EditorRect) => void;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: Point) => void;
  onToolChange: (tool: EditorTool) => void;
};

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

type SelectableItem = { id: string; rect: EditorRect };

function findSelectedItem(
  step: EditorStep | null,
  redactions: EditorRedaction[],
  selection: EditorZoneSelection,
): SelectableItem | null {
  if (!step || !selection) return null;
  if (selection.kind === "redaction") {
    return redactions.find((item) => item.id === selection.id) ?? null;
  }
  if (selection.kind === "click") {
    return step.clickZones.find((zone) => zone.id === selection.id) ?? null;
  }
  return step.textZones.find((zone) => zone.id === selection.id) ?? null;
}

export function CanvasStage({
  step,
  asset,
  assetUrl,
  tool,
  zoom,
  pan,
  activeZone,
  redactions,
  onSelectZone,
  onAddClickZone,
  onAddTextZone,
  onAddRedaction,
  onUpdateZoneRect,
  onZoomChange,
  onPanChange,
  onToolChange,
}: CanvasStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [notice, setNotice] = useState("");
  const lastFittedAsset = useRef<string | null>(null);

  const selected = findSelectedItem(step, redactions, activeZone);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !asset) return;
    const size = viewport.getBoundingClientRect();
    const nextZoom = fitZoom(size.width, size.height, asset.width, asset.height);
    onZoomChange(nextZoom);
    onPanChange({
      x: Math.max(0, (size.width - asset.width * nextZoom) / 2),
      y: Math.max(0, (size.height - asset.height * nextZoom) / 2),
    });
  }, [asset, onPanChange, onZoomChange]);

  useEffect(() => {
    if (!asset) return;
    if (lastFittedAsset.current === asset.id) return;
    lastFittedAsset.current = asset.id;
    const frame = window.requestAnimationFrame(fit);
    return () => window.cancelAnimationFrame(frame);
  }, [asset, fit]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      onZoomChange(clampZoom(zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [asset, onZoomChange, zoom]);

  const pointFromEvent = (event: ReactPointerEvent): Point | null => {
    const image = imageRef.current;
    if (!image) return null;
    const rect = image.getBoundingClientRect();
    return clientToNormalized(event.clientX, event.clientY, rect);
  };

  const startPointer = (event: ReactPointerEvent) => {
    if (!asset) return;
    const point = pointFromEvent(event);
    if (!point) return;

    if (tool === "hand") {
      event.preventDefault();
      svgRef.current?.setPointerCapture(event.pointerId);
      setDrag({
        kind: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalPan: pan,
      });
      return;
    }

    if (tool === "click" || tool === "text" || tool === "redact") {
      event.preventDefault();
      svgRef.current?.setPointerCapture(event.pointerId);
      setDrag({ kind: "create", tool, start: point, current: point });
      return;
    }

    onSelectZone(null);
  };

  const startZonePointer = (
    event: ReactPointerEvent,
    zoneKind: "click" | "text" | "redaction",
    zone: SelectableItem,
  ) => {
    if (tool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    onSelectZone({ kind: zoneKind, id: zone.id });
    const point = pointFromEvent(event);
    if (!point) return;
    setDrag({
      kind: "move",
      zoneKind,
      zoneId: zone.id,
      start: point,
      original: zone.rect,
      current: zone.rect,
    });
  };

  const startResize = (
    event: ReactPointerEvent,
    zoneKind: "click" | "text" | "redaction",
    zoneId: string,
    handle: ResizeHandle,
    rect: EditorRect,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (!point) return;
    setDrag({
      kind: "resize",
      zoneKind,
      zoneId,
      handle,
      start: point,
      original: rect,
      current: rect,
    });
  };

  const movePointer = (event: ReactPointerEvent) => {
    if (!drag) return;
    if (drag.kind === "pan") {
      onPanChange({
        x: drag.originalPan.x + (event.clientX - drag.startClientX),
        y: drag.originalPan.y + (event.clientY - drag.startClientY),
      });
      return;
    }
    const point = pointFromEvent(event);
    if (!point) return;
    if (drag.kind === "create") {
      setDrag({ ...drag, current: point });
      return;
    }
    const delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
    if (drag.kind === "move") {
      setDrag({ ...drag, current: moveRect(drag.original, delta.x, delta.y) });
      return;
    }
    setDrag({
      ...drag,
      current: resizeRect(drag.original, drag.handle, delta.x, delta.y),
    });
  };

  const endPointer = (event: ReactPointerEvent) => {
    if (!drag) return;
    try {
      svgRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // La captura pudo liberarse automáticamente.
    }

    if (drag.kind === "create") {
      const rect = rectFromPoints(drag.start, drag.current);
      if (!rect) {
        setNotice("La zona es demasiado pequeña. Dibuja un rectángulo más amplio.");
      } else if (drag.tool === "click") {
        onAddClickZone(rect);
        setNotice("");
      } else if (drag.tool === "text") {
        onAddTextZone(rect);
        setNotice("");
      } else {
        onAddRedaction(rect);
        setNotice("");
      }
    } else if (drag.kind === "move" || drag.kind === "resize") {
      onUpdateZoneRect({ kind: drag.zoneKind, id: drag.zoneId }, clampRect(drag.current));
    }
    setDrag(null);
  };

  const previewRect = (() => {
    if (!drag) return null;
    if (drag.kind === "create") return rectFromPoints(drag.start, drag.current);
    if (drag.kind === "move" || drag.kind === "resize") return drag.current;
    return null;
  })();

  const selectedRect =
    selected && drag && (drag.kind === "move" || drag.kind === "resize")
      ? drag.current
      : selected?.rect;

  const addDefaultZone = (kind: "click" | "text") => {
    const rect = { x: 0.35, y: 0.35, w: 0.3, h: 0.15 };
    if (kind === "click") onAddClickZone(rect);
    else onAddTextZone(rect);
  };

  return (
    <section className="canvas-panel" aria-label="Lienzo del paso">
      <div className="canvas-toolbar" role="toolbar" aria-label="Herramientas del lienzo">
        <div className="tool-group">
          <button
            type="button"
            className={tool === "select" ? "tool-button active" : "tool-button"}
            aria-pressed={tool === "select"}
            onClick={() => onToolChange("select")}
            title="Seleccionar y mover (V)"
          >
            Seleccionar
          </button>
          <button
            type="button"
            className={tool === "click" ? "tool-button active" : "tool-button"}
            aria-pressed={tool === "click"}
            onClick={() => onToolChange("click")}
            title="Zona de clic (C)"
          >
            Zona de clic
          </button>
          <button
            type="button"
            className={tool === "text" ? "tool-button active" : "tool-button"}
            aria-pressed={tool === "text"}
            onClick={() => onToolChange("text")}
            title="Zona de texto (T)"
          >
            Zona de texto
          </button>
          <button
            type="button"
            className={tool === "redact" ? "tool-button active" : "tool-button"}
            aria-pressed={tool === "redact"}
            onClick={() => onToolChange("redact")}
            title="Difuminar datos sensibles (B)"
          >
            Difuminar
          </button>
          <button
            type="button"
            className={tool === "hand" ? "tool-button active" : "tool-button"}
            aria-pressed={tool === "hand"}
            onClick={() => onToolChange("hand")}
            title="Mover el lienzo"
          >
            Mano
          </button>
        </div>
        <div className="tool-group zoom-group" aria-label="Zoom">
          <button
            type="button"
            className="icon-button"
            onClick={() => onZoomChange(clampZoom(zoom / 1.2))}
            aria-label="Alejar"
            title="Alejar"
          >
            −
          </button>
          <input
            type="range"
            className="zoom-slider"
            min={10}
            max={400}
            step={5}
            value={Math.round(zoom * 100)}
            aria-label="Nivel de zoom"
            onChange={(event) => onZoomChange(clampZoom(Number(event.target.value) / 100))}
          />
          <span className="zoom-value" aria-live="polite">
            {Math.round(zoom * 100)} %
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => onZoomChange(clampZoom(zoom * 1.2))}
            aria-label="Acercar"
            title="Acercar"
          >
            +
          </button>
          <button type="button" className="ghost-button" onClick={fit}>
            Ajustar
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              onZoomChange(1);
              onPanChange({ x: 0, y: 0 });
            }}
          >
            Restablecer
          </button>
        </div>
      </div>

      <div className="canvas-shortcuts">
        <button type="button" className="ghost-button" onClick={() => addDefaultZone("click")}>
          Agregar zona de clic
        </button>
        <button type="button" className="ghost-button" onClick={() => addDefaultZone("text")}>
          Agregar zona de texto
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() => onAddRedaction({ x: 0.3, y: 0.3, w: 0.25, h: 0.1 })}
        >
          Agregar bloque de difuminado
        </button>
        <span>También puedes dibujar arrastrando sobre la captura.</span>
      </div>

      {notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}

      {!step || !asset ? (
        <div className="canvas-empty">
          <h3>Selecciona o carga una captura</h3>
          <p>Cuando tengas un paso con imagen podrás marcar zonas sobre ella.</p>
        </div>
      ) : (
        <div
          ref={viewportRef}
          className={`canvas-viewport tool-${tool}`}
          data-testid="editor-viewport"
        >
          <div
            className="canvas-world"
            style={{
              width: asset.width,
              height: asset.height,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <img
              ref={imageRef}
              src={assetUrl}
              alt={`Captura del paso: ${step.title}`}
              width={asset.width}
              height={asset.height}
              draggable={false}
              className="canvas-image"
            />
            <svg
              ref={svgRef}
              className="zone-layer"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              role="group"
              aria-label="Zonas del paso"
              onPointerDown={startPointer}
              onPointerMove={movePointer}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
            >
              <rect className="zone-surface" x={0} y={0} width={1} height={1} />
              {redactions.map((redaction) => (
                <rect
                  key={redaction.id}
                  data-zone-kind="redaction"
                  data-zone-id={redaction.id}
                  className={
                    activeZone?.kind === "redaction" && activeZone.id === redaction.id
                      ? "redaction-zone selected"
                      : "redaction-zone"
                  }
                  x={redaction.rect.x}
                  y={redaction.rect.y}
                  width={redaction.rect.w}
                  height={redaction.rect.h}
                  onPointerDown={(event) =>
                    startZonePointer(event, "redaction", redaction)
                  }
                />
              ))}
              {step.clickZones.map((zone) => (
                <rect
                  key={zone.id}
                  data-zone-kind="click"
                  data-zone-id={zone.id}
                  className={
                    activeZone?.kind === "click" && activeZone.id === zone.id
                      ? "zone click-zone selected"
                      : "zone click-zone"
                  }
                  x={zone.rect.x}
                  y={zone.rect.y}
                  width={zone.rect.w}
                  height={zone.rect.h}
                  onPointerDown={(event) => startZonePointer(event, "click", zone)}
                />
              ))}
              {step.textZones.map((zone) => (
                <rect
                  key={zone.id}
                  data-zone-kind="text"
                  data-zone-id={zone.id}
                  className={
                    activeZone?.kind === "text" && activeZone.id === zone.id
                      ? "zone text-zone selected"
                      : "zone text-zone"
                  }
                  x={zone.rect.x}
                  y={zone.rect.y}
                  width={zone.rect.w}
                  height={zone.rect.h}
                  onPointerDown={(event) => startZonePointer(event, "text", zone)}
                />
              ))}
              {previewRect && (
                <rect
                  className="zone-preview"
                  x={previewRect.x}
                  y={previewRect.y}
                  width={previewRect.w}
                  height={previewRect.h}
                />
              )}
              {selected && selectedRect && activeZone && asset && tool === "select" && (
                <g>
                  {HANDLES.map((handle) => {
                    const sizeX = 9 / (asset.width * zoom);
                    const sizeY = 9 / (asset.height * zoom);
                    const positions: Record<ResizeHandle, [number, number]> = {
                      nw: [selectedRect.x, selectedRect.y],
                      n: [selectedRect.x + selectedRect.w / 2, selectedRect.y],
                      ne: [selectedRect.x + selectedRect.w, selectedRect.y],
                      e: [selectedRect.x + selectedRect.w, selectedRect.y + selectedRect.h / 2],
                      se: [selectedRect.x + selectedRect.w, selectedRect.y + selectedRect.h],
                      s: [selectedRect.x + selectedRect.w / 2, selectedRect.y + selectedRect.h],
                      sw: [selectedRect.x, selectedRect.y + selectedRect.h],
                      w: [selectedRect.x, selectedRect.y + selectedRect.h / 2],
                    };
                    const [cx, cy] = positions[handle];
                    return (
                      <rect
                        key={handle}
                        data-handle={handle}
                        className="zone-handle"
                        x={cx - sizeX / 2}
                        y={cy - sizeY / 2}
                        width={sizeX}
                        height={sizeY}
                        onPointerDown={(event) =>
                          startResize(
                            event,
                            activeZone.kind,
                            activeZone.id,
                            handle,
                            selected.rect,
                          )
                        }
                      />
                    );
                  })}
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      <div className="canvas-status">
        <span>
          {step
            ? `${step.title} · ${step.clickZones.length + step.textZones.length} zonas · ${redactions.length} difuminados`
            : "Sin paso seleccionado"}
        </span>
        <span>
          {activeZone && selected
            ? `Selección: ${
                activeZone.kind === "click"
                  ? "zona de clic"
                  : activeZone.kind === "text"
                    ? "zona de texto"
                    : "difuminado"
              }`
            : "Sin selección"}
        </span>
      </div>
    </section>
  );
}
