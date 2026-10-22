import { afterEach, describe, expect, it } from "vitest";
import {
  buildDraft,
  readDrafts,
  requestPersistentStorage,
  saveDrafts,
  validateDraftName,
} from "../../../src/app/storage";

function installStorageStore(initial: Record<string, string> = {}) {
  const store = { ...initial };
  const storage: Storage = {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    key: (index) => Object.keys(store)[index] ?? null,
    removeItem: (key) => {
      delete store[key];
    },
    setItem: (key, value) => {
      store[key] = String(value);
    },
  } as Storage;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
    writable: true,
  });

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      storage: {
        persist: async () => true,
      },
    },
    writable: true,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "navigator");
});

describe("persistencia local de borradores", () => {
  it("guarda y lee borradores en localStorage", () => {
    installStorageStore();

    const draft = buildDraft({ name: "Alta de cliente", client: "Banco del Sur" });
    saveDrafts([draft]);

    expect(readDrafts()).toHaveLength(1);
    expect(readDrafts()[0]).toMatchObject({
      name: "Alta de cliente",
      client: "Banco del Sur",
      status: "draft",
    });
  });

  it("rechaza nombres vacíos o con solo espacios", () => {
    expect(validateDraftName("   ")).toBe("El nombre del proyecto es obligatorio.");
    expect(validateDraftName("Trámite de cliente")).toBe("");
  });

  it("solicita persistencia y reporta estado real", async () => {
    installStorageStore();

    await expect(requestPersistentStorage()).resolves.toMatchObject({
      capability: "available",
    });
  });

  it("reporta error si el navegador no ofrece almacenamiento local", () => {
    expect(readDrafts()).toEqual([]);
    expect(() => saveDrafts([])).toThrow("El navegador no permite guardar proyectos");
  });
});
