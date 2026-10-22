import { useEffect, useMemo, useRef, useState } from "react";
import { EditorPage } from "../editor/EditorPage";
import { importProjectZip } from "../editor/import/project-import";
import { AboutPage } from "../help/AboutPage";
import { StepByStepGuide } from "../help/StepByStepGuide";
import {
  createEditorRepository,
  storageErrorMessage,
} from "../editor/storage/editor-repository";
import {
  buildDraft,
  readDrafts,
  requestPersistentStorage,
  saveDrafts,
  type ProjectDraft,
  type StorageStatus,
  validateDraftName,
} from "./storage";

type SectionId = "inicio" | "guia" | "proyectos" | "crear" | "historial" | "acerca";
type SaveState = "saving" | "saved" | "error";

const SECTION_LABELS: Record<SectionId, string> = {
  inicio: "Inicio",
  guia: "Simu Paso a paso",
  proyectos: "Mis proyectos",
  crear: "Crear nuevo",
  historial: "Historial de SCORM",
  acerca: "Acerca de",
};

const initialForm = {
  name: "",
  client: "",
  industry: "",
  description: "",
  author: "",
};

export function App() {
  const [section, setSection] = useState<SectionId>("inicio");
  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
  const [form, setForm] = useState(initialForm);
  const [nameError, setNameError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    capability: "available",
    message: "Comprobando almacenamiento local…",
  });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [openEditorId, setOpenEditorId] = useState<string | null>(null);
  const [importState, setImportState] = useState<"idle" | "importing" | "success" | "error">(
    "idle",
  );
  const [importError, setImportError] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("todos");
  const [sortBy, setSortBy] = useState<"updatedAt" | "name">("updatedAt");
  const lastPersistedSnapshot = useRef<string>("");
  const editorRepository = useMemo(() => createEditorRepository(), []);

  useEffect(() => {
    const loadedDrafts = readDrafts();
    setDrafts(loadedDrafts);
  }, []);

  useEffect(() => {
    void requestPersistentStorage().then(setStorageStatus);
  }, []);

  useEffect(() => {
    const snapshot = JSON.stringify(drafts);
    if (snapshot === lastPersistedSnapshot.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        saveDrafts(drafts);
        lastPersistedSnapshot.current = snapshot;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [drafts]);

  const recentProjects = useMemo(
    () => [...drafts].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 6),
    [drafts],
  );

  const filteredDrafts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...drafts]
      .filter((draft) => {
        const matchesSearch =
          !normalizedSearch ||
          draft.name.toLowerCase().includes(normalizedSearch) ||
          (draft.client ?? "").toLowerCase().includes(normalizedSearch) ||
          (draft.author ?? "").toLowerCase().includes(normalizedSearch);

        const matchesClient =
          clientFilter === "todos" || draft.client?.trim().toLowerCase() === clientFilter.toLowerCase();

        return matchesSearch && matchesClient;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name, "es-CL");
        }

        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      });
  }, [clientFilter, drafts, search, sortBy]);

  const clients = useMemo(
    () => [...new Set(drafts.map((draft) => draft.client?.trim()).filter(Boolean) as string[])],
    [drafts],
  );

  const handleInputChange = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "name") {
      setNameError("");
    }
  };

  const handleSaveDraft = () => {
    const nameErrorMessage = validateDraftName(form.name);
    if (nameErrorMessage) {
      setNameError(nameErrorMessage);
      return;
    }

    const draft = buildDraft({
      name: form.name,
      client: form.client,
      industry: form.industry,
      description: form.description,
      author: form.author,
      stepCount: 0,
    });

    setDrafts((current) => {
      const next = [draft, ...current.filter((item) => item.id !== draft.id)];
      setSaveState("saving");
      return next;
    });

    setForm(initialForm);
    setSection("proyectos");
  };

  const handleImportFile = async (file: File) => {
    setImportState("importing");
    setImportError("");
    setImportWarnings([]);
    const projectId = crypto.randomUUID();
    try {
      if (file.size > 200 * 1024 * 1024) {
        throw new Error("El archivo supera el límite de 200 MB para importar.");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const imported = await importProjectZip(bytes, projectId);
      const baseName = imported.document.meta.title.trim() || "Proyecto importado";
      const duplicateName = drafts.some(
        (draft) => draft.name.trim().toLowerCase() === baseName.toLowerCase(),
      );
      const name = duplicateName ? `${baseName} (importado)` : baseName;
      imported.document.meta.title = name;

      for (const asset of imported.assets) {
        await editorRepository.saveAsset(asset);
      }
      await editorRepository.saveProject(imported.document);

      const draft = buildDraft({
        id: projectId,
        name,
        client: imported.document.meta.client,
        description: imported.document.meta.description,
        author: imported.document.meta.author,
        stepCount: imported.document.steps.length,
      });
      setDrafts((current) => [draft, ...current]);
      setImportWarnings(imported.warnings);
      setImportState("success");
      setSection("proyectos");
    } catch (error) {
      await editorRepository.deleteProjectData(projectId).catch(() => undefined);
      setImportState("error");
      setImportError(
        error instanceof Error ? error.message : "No se pudo importar el archivo.",
      );
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await editorRepository.deleteProjectData(id);
      setDeleteError("");
    } catch (error) {
      setDeleteError(
        `El borrador se quitó de la lista, pero no se pudieron limpiar todos sus datos: ${storageErrorMessage(error)}`,
      );
    }
    setDrafts((current) => current.filter((draft) => draft.id !== id));
    setDeleteTargetId(null);
  };

  const handleDraftUpdated = (
    draftId: string,
    patch: { stepCount: number; updatedAt: string },
  ) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? { ...draft, stepCount: patch.stepCount, updatedAt: patch.updatedAt }
          : draft,
      ),
    );
  };

  const editingDraft = drafts.find((draft) => draft.id === openEditorId) ?? null;

  if (editingDraft) {
    return (
      <EditorPage
        key={editingDraft.id}
        draft={editingDraft}
        onClose={() => setOpenEditorId(null)}
        onDraftUpdated={handleDraftUpdated}
      />
    );
  }

  return (
    <div className="studio-app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            S
          </div>
          <div>
            <p className="sidebar-kicker">SimuPaso</p>
            <h2>Studio</h2>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Secciones principales">
          {(Object.entries(SECTION_LABELS) as Array<[SectionId, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={section === id ? "nav-item active" : "nav-item"}
              onClick={() => setSection(id)}
              aria-current={section === id ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="storage-pill" role="status" aria-live="polite">
          <span className="storage-dot" aria-hidden="true" />
          <span>{storageStatus.message}</span>
        </div>
      </aside>

      <main className="main-panel">
        {section === "inicio" && (
          <section className="page-section" aria-label="Inicio">
            <div className="section-header">
              <div>
                <p className="eyebrow">Inicio</p>
                <h1>Bienvenido a SimuPaso Studio</h1>
              </div>
              <div className="help-actions">
                <button type="button" className="secondary-button" onClick={() => setSection("guia")}>
                  Simu Paso a paso
                </button>
                <button type="button" className="primary-button" onClick={() => setSection("crear")}>
                  Crear simulador
                </button>
              </div>
            </div>

            <div className="hero-grid">
              <div className="status-card">
                <h3>Estado del almacenamiento</h3>
                <p>{storageStatus.message}</p>
              </div>
              <div className="status-card info-card">
                <h3>Proyectos recientes</h3>
                {recentProjects.length === 0 ? (
                  <p>No hay borradores creados todavía.</p>
                ) : (
                  <ul className="mini-list">
                    {recentProjects.map((project) => (
                      <li key={project.id}>
                        <span>{project.name}</span>
                        <small>{new Date(project.updatedAt).toLocaleDateString("es-CL")}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {section === "guia" && (
          <StepByStepGuide
            onStart={() => setSection("crear")}
            onOpenManual={() => setSection("acerca")}
          />
        )}

        {section === "acerca" && (
          <AboutPage
            onStart={() => setSection("crear")}
            onOpenGuide={() => setSection("guia")}
          />
        )}

        {section === "proyectos" && (
          <section className="page-section" aria-label="Mis proyectos">
            <div className="section-header compact-header">
              <div>
                <p className="eyebrow">Mis proyectos</p>
                <h1>Borradores locales</h1>
              </div>
            </div>

            {deleteError && (
              <div className="storage-warning" role="alert">
                {deleteError}
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setDeleteError("")}
                >
                  Cerrar aviso
                </button>
              </div>
            )}

            <div className="toolbar">
              <label className="search-field">
                <span>Buscar</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre, cliente o autor"
                />
              </label>

              <label className="filter-field">
                <span>Cliente</span>
                <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                  <option value="todos">Todos</option>
                  {clients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Orden</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "updatedAt" | "name") }>
                  <option value="updatedAt">Última actualización</option>
                  <option value="name">Nombre</option>
                </select>
              </label>

              <button
                type="button"
                className="secondary-button import-button"
                onClick={() => importInputRef.current?.click()}
                disabled={importState === "importing"}
              >
                {importState === "importing"
                  ? "Importando…"
                  : "Importar SCORM o respaldo"}
              </button>
            </div>

            <input
              ref={importInputRef}
              className="visually-hidden"
              type="file"
              accept=".simpaso,.zip,application/zip"
              aria-label="Importar SCORM o respaldo"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleImportFile(file);
              }}
            />

            {importState === "error" && (
              <div className="storage-warning" role="alert">
                <strong>No se pudo importar.</strong> {importError}
              </div>
            )}

            {importState === "success" && (
              <div className="export-success" role="status">
                Proyecto importado. Ya aparece en Mis proyectos.
                {importWarnings.length > 0 && (
                  <ul>
                    {importWarnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {filteredDrafts.length === 0 ? (
              <div className="empty-card">
                <h3>No hay proyectos que coincidan</h3>
                <p>Prueba con otro texto o crea un borrador nuevo.</p>
              </div>
            ) : (
              <div className="project-list" role="list">
                {filteredDrafts.map((draft) => (
                  <article key={draft.id} className="project-card" role="listitem">
                    <div>
                      <div className="project-headline">
                        <h3>{draft.name}</h3>
                        <span className="draft-tag">Borrador</span>
                      </div>
                      <p className="meta-line">
                        {draft.client ? `Cliente: ${draft.client}` : "Cliente: sin definir"}
                      </p>
                      <p className="meta-line">
                        {draft.industry ? `Rubro: ${draft.industry}` : "Rubro: sin definir"}
                      </p>
                    </div>
                    <div className="project-footer">
                      <small>{new Date(draft.updatedAt).toLocaleString("es-CL")}</small>
                      <div className="project-actions">
                        <button
                          type="button"
                          className="primary-button approve-button"
                          onClick={() => setOpenEditorId(draft.id)}
                        >
                          Abrir editor
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setDeleteTargetId(draft.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {deleteTargetId && (
              <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
                <div className="confirm-card">
                  <h3>Eliminar borrador</h3>
                  <p>¿Deseas quitar este proyecto de la lista local? También se eliminarán su documento y sus capturas guardadas.</p>
                  {deleteError && <p className="field-error">{deleteError}</p>}
                  <div className="confirm-actions">
                    <button type="button" className="ghost-button" onClick={() => setDeleteTargetId(null)}>
                      Cancelar
                    </button>
                    <button type="button" className="danger-button" onClick={() => void handleDeleteDraft(deleteTargetId)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {section === "crear" && (
          <section className="page-section" aria-label="Crear nuevo">
            <div className="section-header compact-header">
              <div>
                <p className="eyebrow">Crear nuevo</p>
                <h1>Datos básicos del proyecto</h1>
              </div>
            </div>

            <form
              className="creator-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveDraft();
              }}
            >
              <label className="field">
                <span>Nombre del proyecto *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleInputChange("name", event.target.value)}
                  placeholder="Ej. Revisión de alta de cliente"
                  aria-invalid={Boolean(nameError)}
                />
                {nameError && <small className="field-error">{nameError}</small>}
              </label>

              <div className="two-column-fields">
                <label className="field">
                  <span>Cliente</span>
                  <input
                    type="text"
                    value={form.client}
                    onChange={(event) => handleInputChange("client", event.target.value)}
                    placeholder="Ej. Banco del Sur"
                  />
                </label>

                <label className="field">
                  <span>Rubro</span>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(event) => handleInputChange("industry", event.target.value)}
                    placeholder="Ej. Banca"
                  />
                </label>
              </div>

              <label className="field">
                <span>Descripción</span>
                <textarea
                  value={form.description}
                  onChange={(event) => handleInputChange("description", event.target.value)}
                  placeholder="Objetivo del simulador, contexto o pasos clave"
                  rows={4}
                />
              </label>

              <label className="field">
                <span>Autor</span>
                <input
                  type="text"
                  value={form.author}
                  onChange={(event) => handleInputChange("author", event.target.value)}
                  placeholder="Nombre del trainer"
                />
              </label>

              <div className="form-actions">
                <span className={`save-indicator ${saveState}`} aria-live="polite">
                  {saveState === "saving" && "Guardando…"}
                  {saveState === "saved" && "Guardado localmente"}
                  {saveState === "error" && "Error al guardar localmente"}
                </span>
                <button type="submit" className="primary-button">
                  Guardar borrador
                </button>
              </div>
            </form>
          </section>
        )}

        {section === "historial" && (
          <section className="page-section" aria-label="Historial de SCORM">
            <div className="section-header compact-header">
              <div>
                <p className="eyebrow">Historial de SCORM</p>
                <h1>Sin exportaciones todavía</h1>
              </div>
            </div>

            <div className="empty-card large-empty">
              <h3>El historial local está vacío</h3>
              <p>
                Cuando exportes un paquete SCORM desde la app, aparecerá aquí un registro local. En esta
                etapa no se muestran demos externas ni paquetes importados desde otros sitios.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
