export const EDITOR_DB_NAME = "simupaso-studio";
export const EDITOR_DB_VERSION = 1;
export const PROJECT_STORE = "editorProjects";
export const ASSET_STORE = "editorAssets";
export const PROJECT_ID_INDEX = "projectId";

export function getIndexedDbFactory(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("El navegador no ofrece IndexedDB en este contexto.");
  }
  return indexedDB;
}

export function openEditorDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(EDITOR_DB_NAME, EDITOR_DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        const store = db.createObjectStore(ASSET_STORE, { keyPath: "id" });
        store.createIndex(PROJECT_ID_INDEX, "projectId", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("No se pudo abrir el almacenamiento local."));
    };

    request.onblocked = () => {
      reject(
        new Error(
          "El almacenamiento local está bloqueado por otra pestaña. Cierra las demás pestañas e inténtalo de nuevo.",
        ),
      );
    };
  });
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falló una operación local."));
  });
}

export function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("No se pudo completar la operación local."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("La operación local fue cancelada."));
  });
}
