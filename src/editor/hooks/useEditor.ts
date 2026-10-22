import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectDraft } from "../../app/storage";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
  type EditorAction,
} from "../model/editor-reducer";
import type {
  EditorAsset,
  EditorHistory,
  EditorProject,
  EditorSaveState,
  EditorStep,
  EditorTool,
  EditorZoneSelection,
} from "../model/editor-types";
import { ingestImageFile, orderImageFiles, suggestedStepTitle } from "../model/image-ingest";
import {
  createEditorRepository,
  storageErrorMessage,
  type EditorRepository,
} from "../storage/editor-repository";

type UseEditorOptions = {
  draft: ProjectDraft;
  repository?: EditorRepository;
  onDraftUpdated?: (
    draftId: string,
    patch: { stepCount: number; updatedAt: string },
  ) => void;
};

export function useEditor({ draft, repository: injected, onDraftUpdated }: UseEditorOptions) {
  const repository = useMemo(
    () => injected ?? createEditorRepository(),
    [injected],
  );
  const initialDocumentRef = useRef<EditorProject>(
    createEmptyDocument({
      id: draft.id,
      title: draft.name,
      client: draft.client,
      description: draft.description,
      author: draft.author,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    }),
  );
  const [history, setHistory] = useState<EditorHistory>(() =>
    createHistory(initialDocumentRef.current),
  );
  const [assets, setAssets] = useState<EditorAsset[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<EditorZoneSelection>(null);
  const [tool, setTool] = useState<EditorTool>("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saveState, setSaveState] = useState<EditorSaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [storageState, setStorageState] = useState<"checking" | "available" | "unavailable">(
    "checking",
  );
  const [isLoading, setIsLoading] = useState(true);
  const lastSavedRef = useRef("");
  const onDraftUpdatedRef = useRef(onDraftUpdated);

  useEffect(() => {
    onDraftUpdatedRef.current = onDraftUpdated;
  }, [onDraftUpdated]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setStorageState("checking");
    setSaveError("");

    void (async () => {
      try {
        const stored = await repository.loadProject(draft.id);
        const storedAssets = await repository.loadAssets(draft.id);
        if (cancelled) return;
        const document = stored ?? initialDocumentRef.current;
        setHistory(createHistory(document));
        setAssets(storedAssets);
        setActiveStepId(document.steps[0]?.id ?? null);
        setActiveZone(null);
        setSaveState(stored ? "saved" : "idle");
        setStorageState("available");
        lastSavedRef.current = JSON.stringify(document);
      } catch (error) {
        if (cancelled) return;
        setStorageState("unavailable");
        setSaveError(storageErrorMessage(error));
        setHistory(createHistory(initialDocumentRef.current));
        setAssets([]);
        setActiveStepId(null);
        setSaveState("error");
        lastSavedRef.current = JSON.stringify(initialDocumentRef.current);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.id, repository]);

  useEffect(() => {
    const steps = history.present.steps;
    if (activeStepId && !steps.some((step) => step.id === activeStepId)) {
      setActiveStepId(steps[0]?.id ?? null);
      setActiveZone(null);
      return;
    }
    if (!activeStepId && steps.length > 0) {
      setActiveStepId(steps[0].id);
    }
    if (activeZone) {
      const step = steps.find((item) => item.id === activeStepId);
      const redactions = step
        ? history.present.redactions?.find((group) => group.assetId === step.assetId)
            ?.items ?? []
        : [];
      const exists =
        step &&
        (activeZone.kind === "click"
          ? step.clickZones.some((zone) => zone.id === activeZone.id)
          : activeZone.kind === "text"
            ? step.textZones.some((zone) => zone.id === activeZone.id)
            : redactions.some((item) => item.id === activeZone.id));
      if (!exists) setActiveZone(null);
    }
  }, [activeStepId, activeZone, history.present.steps, history.present.redactions]);

  useEffect(() => {
    if (isLoading || storageState === "checking") return;
    const snapshot = JSON.stringify(history.present);
    if (snapshot === lastSavedRef.current) return;

    if (storageState === "unavailable") {
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const updatedAt = new Date().toISOString();
          const document: EditorProject = {
            ...history.present,
            meta: { ...history.present.meta, updatedAt },
          };
          await repository.saveProject(document);
          lastSavedRef.current = snapshot;
          setSaveState("saved");
          setSaveError("");
          onDraftUpdatedRef.current?.(draft.id, {
            stepCount: history.present.steps.length,
            updatedAt,
          });
        } catch (error) {
          setSaveState("error");
          setSaveError(storageErrorMessage(error));
        }
      })();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [draft.id, history.present, isLoading, repository, storageState]);

  const assetUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    for (const asset of assets) {
      urls[asset.id] = URL.createObjectURL(asset.blob);
    }
    return urls;
  }, [assets]);

  useEffect(
    () => () => {
      for (const url of Object.values(assetUrls)) {
        URL.revokeObjectURL(url);
      }
    },
    [assetUrls],
  );

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (storageState !== "available") return false;
    const snapshot = JSON.stringify(history.present);
    if (snapshot === lastSavedRef.current) return true;
    setSaveState("saving");
    try {
      const updatedAt = new Date().toISOString();
      const document: EditorProject = {
        ...history.present,
        meta: { ...history.present.meta, updatedAt },
      };
      await repository.saveProject(document);
      lastSavedRef.current = snapshot;
      setSaveState("saved");
      setSaveError("");
      onDraftUpdatedRef.current?.(draft.id, {
        stepCount: history.present.steps.length,
        updatedAt,
      });
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveError(storageErrorMessage(error));
      return false;
    }
  }, [draft.id, history.present, repository, storageState]);

  const dispatch = useCallback((action: EditorAction) => {
    setHistory((current) => editorReducer(current, action));
  }, []);

  const undo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);

  const addImages = useCallback(
    async (files: File[], afterStepId?: string) => {
      const ordered = orderImageFiles(files);
      const createdSteps: EditorStep[] = [];
      const createdAssets: EditorAsset[] = [];
      const errors: string[] = [];

      for (const file of ordered) {
        const result = await ingestImageFile(file, draft.id);
        if (!result.ok) {
          errors.push(result.message);
          continue;
        }
        if (storageState === "available") {
          try {
            await repository.saveAsset(result.asset);
          } catch (error) {
            errors.push(storageErrorMessage(error));
            continue;
          }
        }
        createdAssets.push(result.asset);
        createdSteps.push(
          createEditorStep({
            title: suggestedStepTitle(file),
            instruction: "",
            assetId: result.asset.id,
          }),
        );
      }

      if (createdAssets.length > 0) {
        setAssets((current) => [...current, ...createdAssets]);
      }
      if (createdSteps.length > 0) {
        if (afterStepId) {
          dispatch({ type: "insertSteps", steps: createdSteps, afterStepId });
        } else {
          dispatch({ type: "addSteps", steps: createdSteps });
        }
        if (!activeStepId) {
          setActiveStepId(createdSteps[0].id);
        }
      }

      return { added: createdSteps.length, errors };
    },
    [activeStepId, dispatch, draft.id, repository, storageState],
  );

  const activeStep =
    history.present.steps.find((step) => step.id === activeStepId) ?? null;
  const activeAsset = activeStep
    ? assets.find((asset) => asset.id === activeStep.assetId) ?? null
    : null;
  const redactions = history.present.redactions ?? [];
  const activeRedactions =
    redactions.find((group) => group.assetId === activeStep?.assetId)?.items ?? [];

  const setStep = useCallback((stepId: string) => {
    setActiveStepId(stepId);
    setActiveZone(null);
  }, []);

  return {
    document: history.present,
    assets,
    assetUrls,
    activeStep,
    activeAsset,
    redactions,
    activeRedactions,
    activeStepId,
    setActiveStepId: setStep,
    activeZone,
    setActiveZone,
    tool,
    setTool,
    zoom,
    setZoom,
    pan,
    setPan,
    saveState,
    saveError,
    storageState,
    isLoading,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    saveNow,
    dispatch,
    addImages,
    repository,
  };
}
