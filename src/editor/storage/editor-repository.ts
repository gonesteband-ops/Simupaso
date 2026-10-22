import { editorProjectSchema } from "../model/editor-schema";
import { isAcceptedImageMime, validateImageCandidate } from "../model/image-rules";
import type { EditorAsset, EditorProject } from "../model/editor-types";
import {
  ASSET_STORE,
  PROJECT_STORE,
  getIndexedDbFactory,
  openEditorDatabase,
  requestResult,
  transactionComplete,
} from "./indexeddb";

export type StoredEditorProject = {
  id: string;
  document: EditorProject;
  updatedAt: string;
};

export interface EditorRepository {
  loadProject(projectId: string): Promise<EditorProject | null>;
  saveProject(document: EditorProject): Promise<void>;
  saveAsset(asset: EditorAsset): Promise<void>;
  loadAssets(projectId: string): Promise<EditorAsset[]>;
  deleteProjectData(projectId: string): Promise<void>;
  close(): void;
}

export class EditorRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorRepositoryError";
  }
}

export function storageErrorMessage(error: unknown): string {
  if (error instanceof EditorRepositoryError) {
    return error.message;
  }
  if (
    error instanceof Error &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  ) {
    return "No hay espacio suficiente en el navegador para guardar este proyecto. Libera espacio o elimina capturas e inténtalo de nuevo.";
  }
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "No hay espacio suficiente en el navegador para guardar este proyecto. Libera espacio o elimina capturas e inténtalo de nuevo.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "No se pudo acceder al almacenamiento local del navegador.";
}

function assertValidDocument(document: EditorProject): void {
  const result = editorProjectSchema.safeParse(document);
  if (!result.success) {
    throw new EditorRepositoryError(
      `El documento del editor no es válido o usa una versión desconocida: ${result.error.issues[0]?.message ?? "sin detalle"}.`,
    );
  }
}

function assertValidAsset(asset: EditorAsset): void {
  if (!isAcceptedImageMime(asset.mime)) {
    throw new EditorRepositoryError(
      `El archivo «${asset.name}» debe ser PNG, JPG o WebP.`,
    );
  }
  const problem = validateImageCandidate({
    name: asset.name,
    type: asset.mime,
    size: asset.sizeBytes,
  });
  if (problem) {
    throw new EditorRepositoryError(problem);
  }
  if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height)) {
    throw new EditorRepositoryError("Las dimensiones de la captura no son válidas.");
  }
  if (asset.width <= 0 || asset.height <= 0) {
    throw new EditorRepositoryError("Las dimensiones de la captura deben ser positivas.");
  }
}

export function createEditorRepository(factory?: IDBFactory): EditorRepository {
  let databasePromise: Promise<IDBDatabase> | null = null;

  const getDatabase = (): Promise<IDBDatabase> => {
    if (!databasePromise) {
      const resolvedFactory = factory ?? getIndexedDbFactory();
      databasePromise = openEditorDatabase(resolvedFactory).catch((error) => {
        databasePromise = null;
        throw new EditorRepositoryError(storageErrorMessage(error));
      });
    }
    return databasePromise;
  };

  const close = () => {
    const current = databasePromise;
    databasePromise = null;
    if (current) {
      void current.then((db) => db.close()).catch(() => undefined);
    }
  };

  return {
    async loadProject(projectId: string): Promise<EditorProject | null> {
      try {
        const db = await getDatabase();
        const transaction = db.transaction(PROJECT_STORE, "readonly");
        const stored = await requestResult<StoredEditorProject | undefined>(
          transaction.objectStore(PROJECT_STORE).get(projectId),
        );
        await transactionComplete(transaction);
        if (!stored) return null;
        const result = editorProjectSchema.safeParse(stored.document);
        if (!result.success) {
          throw new EditorRepositoryError(
            "El proyecto guardado no es válido; no se cargó para evitar dañar tus datos.",
          );
        }
        return result.data;
      } catch (error) {
        throw new EditorRepositoryError(storageErrorMessage(error));
      }
    },

    async saveProject(document: EditorProject): Promise<void> {
      assertValidDocument(document);
      try {
        const db = await getDatabase();
        const transaction = db.transaction(PROJECT_STORE, "readwrite");
        const stored: StoredEditorProject = {
          id: document.id,
          document,
          updatedAt: document.meta.updatedAt,
        };
        transaction.objectStore(PROJECT_STORE).put(stored);
        await transactionComplete(transaction);
      } catch (error) {
        throw new EditorRepositoryError(storageErrorMessage(error));
      }
    },

    async saveAsset(asset: EditorAsset): Promise<void> {
      assertValidAsset(asset);
      try {
        const db = await getDatabase();
        const transaction = db.transaction(ASSET_STORE, "readwrite");
        const store = transaction.objectStore(ASSET_STORE);
        const existing = await requestResult<EditorAsset | undefined>(store.get(asset.id));
        if (existing && existing.projectId !== asset.projectId) {
          transaction.abort();
          throw new EditorRepositoryError(
            "El identificador de la captura ya pertenece a otro proyecto.",
          );
        }
        store.put(asset);
        await transactionComplete(transaction);
      } catch (error) {
        throw new EditorRepositoryError(storageErrorMessage(error));
      }
    },

    async loadAssets(projectId: string): Promise<EditorAsset[]> {
      try {
        const db = await getDatabase();
        const transaction = db.transaction(ASSET_STORE, "readonly");
        const store = transaction.objectStore(ASSET_STORE);
        const assets = await requestResult<EditorAsset[]>(
          store.index("projectId").getAll(projectId),
        );
        await transactionComplete(transaction);
        return [...assets].sort((left, right) => {
          const byDate = left.createdAt.localeCompare(right.createdAt);
          return byDate !== 0 ? byDate : left.id.localeCompare(right.id);
        });
      } catch (error) {
        throw new EditorRepositoryError(storageErrorMessage(error));
      }
    },

    async deleteProjectData(projectId: string): Promise<void> {
      try {
        const db = await getDatabase();
        const transaction = db.transaction([PROJECT_STORE, ASSET_STORE], "readwrite");
        transaction.objectStore(PROJECT_STORE).delete(projectId);
        const assetStore = transaction.objectStore(ASSET_STORE);
        const keys = await requestResult<IDBValidKey[]>(
          assetStore.index("projectId").getAllKeys(projectId),
        );
        for (const key of keys) {
          assetStore.delete(key);
        }
        await transactionComplete(transaction);
      } catch (error) {
        throw new EditorRepositoryError(storageErrorMessage(error));
      }
    },

    close,
  };
}
