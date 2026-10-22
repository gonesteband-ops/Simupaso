export type Scorm12Api = {
  LMSInitialize: (argument: string) => string;
  LMSFinish: (argument: string) => string;
  LMSGetValue: (key: string) => string;
  LMSSetValue: (key: string, value: string) => string;
  LMSCommit: (argument: string) => string;
  LMSGetLastError: () => string;
};

type Scorm12Window = Window & { API?: unknown };

function isScorm12Api(value: unknown): value is Scorm12Api {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Scorm12Api>;
  return (
    typeof candidate.LMSInitialize === "function" &&
    typeof candidate.LMSFinish === "function" &&
    typeof candidate.LMSGetValue === "function" &&
    typeof candidate.LMSSetValue === "function" &&
    typeof candidate.LMSCommit === "function" &&
    typeof candidate.LMSGetLastError === "function"
  );
}

function isCrossOriginAccessError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "SecurityError";
}

function searchWindowChain(start: Window): Scorm12Api | null {
  let current: Window = start;
  for (let depth = 0; depth < 8; depth += 1) {
    let api: unknown;
    let parent: Window;
    try {
      api = (current as Scorm12Window).API;
      parent = current.parent;
    } catch (error) {
      if (isCrossOriginAccessError(error)) return null;
      throw error;
    }
    if (isScorm12Api(api)) return api;
    if (parent === current) return null;
    current = parent;
  }
  return null;
}

export function findScorm12Api(hostWindow: Window = window): Scorm12Api | null {
  const parentApi = searchWindowChain(hostWindow);
  if (parentApi) return parentApi;

  let opener: Window | null;
  try {
    opener = hostWindow.opener;
  } catch (error) {
    if (isCrossOriginAccessError(error)) return null;
    throw error;
  }
  return opener ? searchWindowChain(opener) : null;
}

export function formatScorm12Time(milliseconds: number): string {
  const centisecondsTotal = Math.floor(Math.max(0, milliseconds) / 10);
  const secondsTotal = Math.floor(centisecondsTotal / 100);
  const centiseconds = centisecondsTotal % 100;
  const seconds = secondsTotal % 60;
  const minutesTotal = Math.floor(secondsTotal / 60);
  const minutes = minutesTotal % 60;
  const hours = Math.min(9999, Math.floor(minutesTotal / 60));
  return `${String(hours).padStart(4, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

export type Scorm12Adapter = {
  readonly connected: boolean;
  initialize: (initialLocation: string) => void;
  setLessonLocation: (location: string) => void;
  complete: () => void;
  finish: () => void;
};

export function createScorm12Adapter(
  api: Scorm12Api | null,
  now: () => number = () => performance.now(),
): Scorm12Adapter {
  let initialized = false;
  let finished = false;
  let completed = false;
  let startedAt = 0;

  const checkResult = (method: string, result: string): void => {
    if (result === "true") return;
    const code = api?.LMSGetLastError() ?? "desconocido";
    throw new Error(`${method} falló en la API SCORM (código ${code}).`);
  };

  const setValue = (key: string, value: string): void => {
    if (!api || !initialized) return;
    checkResult("LMSSetValue", api.LMSSetValue(key, value));
  };

  const commit = (): void => {
    if (!api || !initialized) return;
    checkResult("LMSCommit", api.LMSCommit(""));
  };

  const finish = (): void => {
    if (!api || !initialized || finished) return;
    checkResult("LMSFinish", api.LMSFinish(""));
    finished = true;
  };

  return {
    get connected() {
      return api !== null;
    },
    initialize(initialLocation) {
      if (!api || initialized) return;
      checkResult("LMSInitialize", api.LMSInitialize(""));
      initialized = true;
      startedAt = now();
      setValue("cmi.core.lesson_status", "incomplete");
      setValue("cmi.core.lesson_location", initialLocation);
      commit();
    },
    setLessonLocation(location) {
      if (!api || !initialized || finished) return;
      setValue("cmi.core.lesson_location", location);
      commit();
    },
    complete() {
      if (!api || !initialized || completed || finished) return;
      setValue("cmi.core.lesson_status", "completed");
      setValue("cmi.core.session_time", formatScorm12Time(now() - startedAt));
      commit();
      finish();
      completed = true;
    },
    finish,
  };
}
