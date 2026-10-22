export type ProjectDraft = {
  id: string;
  name: string;
  client?: string;
  industry?: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  stepCount: number;
  status: "draft";
};

export type StorageStatus = {
  capability: "available" | "blocked" | "unavailable";
  message: string;
};

export const STORAGE_KEY = "simupaso-studio-projects-v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readDrafts(): ProjectDraft[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ProjectDraft => {
      return (
        typeof item?.id === "string" &&
        typeof item?.name === "string" &&
        typeof item?.createdAt === "string" &&
        typeof item?.updatedAt === "string" &&
        typeof item?.status === "string" &&
        item.status === "draft"
      );
    });
  } catch {
    return [];
  }
}

export function saveDrafts(drafts: ProjectDraft[]) {
  const storage = getStorage();
  if (!storage) {
    throw new Error("El navegador no permite guardar proyectos en este momento.");
  }

  const safeDrafts = drafts.map((draft) => ({
    ...draft,
    name: String(draft.name ?? "").trim(),
    client: draft.client ? String(draft.client).trim() : undefined,
    industry: draft.industry ? String(draft.industry).trim() : undefined,
    description: draft.description ? String(draft.description).trim() : undefined,
    author: draft.author ? String(draft.author).trim() : undefined,
    updatedAt: new Date(draft.updatedAt).toISOString(),
    createdAt: new Date(draft.createdAt).toISOString(),
  }));

  storage.setItem(STORAGE_KEY, JSON.stringify(safeDrafts));
  return safeDrafts;
}

export function validateDraftName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "El nombre del proyecto es obligatorio.";
  }

  return "";
}

export function buildDraft(input: {
  id?: string;
  name: string;
  client?: string;
  industry?: string;
  description?: string;
  author?: string;
  stepCount?: number;
}): ProjectDraft {
  const now = new Date().toISOString();

  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name.trim(),
    client: input.client?.trim() || undefined,
    industry: input.industry?.trim() || undefined,
    description: input.description?.trim() || undefined,
    author: input.author?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    stepCount: input.stepCount ?? 0,
    status: "draft",
  };
}

export async function requestPersistentStorage(): Promise<StorageStatus> {
  const storage = getStorage();
  if (!storage) {
    return {
      capability: "unavailable",
      message: "El almacenamiento local no está disponible en este navegador.",
    };
  }

  try {
    const storageManager = navigator.storage;
    if (storageManager && typeof storageManager.persist === "function") {
      const persisted = await storageManager.persist();
      if (!persisted) {
        return {
          capability: "blocked",
          message:
            "El navegador denegó la persistencia. Los borradores solo se mantendrán mientras la pestaña esté abierta.",
        };
      }
    }

    storage.setItem("simupaso-storage-check", "ok");
    storage.removeItem("simupaso-storage-check");
    return {
      capability: "available",
      message: "La persistencia local está disponible y los borradores pueden mantenerse entre sesiones.",
    };
  } catch {
    return {
      capability: "blocked",
      message:
        "No se pudo confirmar almacenamiento persistente; el trabajo puede quedar temporalmente limitado a la sesión actual.",
    };
  }
}
