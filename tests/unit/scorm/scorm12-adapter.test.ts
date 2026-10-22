import { describe, expect, it } from "vitest";
import type { Scorm12Api } from "../../../src/scorm/scorm12-adapter";
import { createScorm12Adapter } from "../../../src/scorm/scorm12-adapter";

function createMockApi() {
  const calls: Array<[string, ...string[]]> = [];
  const api: Scorm12Api = {
    LMSInitialize: (argument) => {
      calls.push(["LMSInitialize", argument]);
      return "true";
    },
    LMSFinish: (argument) => {
      calls.push(["LMSFinish", argument]);
      return "true";
    },
    LMSGetValue: (key) => {
      calls.push(["LMSGetValue", key]);
      return "";
    },
    LMSSetValue: (key, value) => {
      calls.push(["LMSSetValue", key, value]);
      return "true";
    },
    LMSCommit: (argument) => {
      calls.push(["LMSCommit", argument]);
      return "true";
    },
    LMSGetLastError: () => {
      calls.push(["LMSGetLastError"]);
      return "000";
    },
  };
  return { api, calls };
}

describe("adaptador SCORM 1.2", () => {
  it("inicializa incompleto, reporta pasos y tiempo, completa y finaliza una vez", () => {
    const { api, calls } = createMockApi();
    let now = 100;
    const adapter = createScorm12Adapter(api, () => now);

    adapter.initialize("paso-ingreso");
    adapter.initialize("paso-ingreso");
    adapter.setLessonLocation("paso-consulta");
    now = 12_450;
    adapter.complete();
    adapter.finish();

    expect(calls).toEqual([
      ["LMSInitialize", ""],
      ["LMSSetValue", "cmi.core.lesson_status", "incomplete"],
      ["LMSSetValue", "cmi.core.lesson_location", "paso-ingreso"],
      ["LMSCommit", ""],
      ["LMSSetValue", "cmi.core.lesson_location", "paso-consulta"],
      ["LMSCommit", ""],
      ["LMSSetValue", "cmi.core.lesson_status", "completed"],
      ["LMSSetValue", "cmi.core.session_time", "0000:00:12.35"],
      ["LMSCommit", ""],
      ["LMSFinish", ""],
    ]);
  });

  it("no invoca la API cuando el paquete se ejecuta de forma autónoma", () => {
    const adapter = createScorm12Adapter(null, () => 0);

    adapter.initialize("paso-ingreso");
    adapter.setLessonLocation("paso-consulta");
    adapter.complete();
    adapter.finish();

    expect(adapter.connected).toBe(false);
  });

  it("propaga errores de API consultando el código SCORM en vez de simular éxito", () => {
    const { api, calls } = createMockApi();
    api.LMSSetValue = () => "false";
    api.LMSGetLastError = () => {
      calls.push(["LMSGetLastError"]);
      return "405";
    };
    const adapter = createScorm12Adapter(api, () => 0);

    expect(() => adapter.initialize("paso-ingreso")).toThrow(/LMSSetValue.*405/);
    expect(calls.at(-1)).toEqual(["LMSGetLastError"]);
  });
});
