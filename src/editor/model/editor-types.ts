export type {
  EditorClickZone,
  EditorFeedbackMessages,
  EditorProject,
  EditorRect,
  EditorRedaction,
  EditorRedactionGroup,
  EditorStep,
  EditorTextValidation,
  EditorTextZone,
} from "./editor-schema";

import type { EditorProject } from "./editor-schema";

export type EditorTool = "select" | "click" | "text" | "redact" | "hand";

export type EditorZoneSelection =
  | { kind: "click"; id: string }
  | { kind: "text"; id: string }
  | { kind: "redaction"; id: string }
  | null;

export type EditorSaveState = "idle" | "saving" | "saved" | "error";

export type EditorAssetMime = "image/png" | "image/jpeg" | "image/webp";

export type EditorAsset = {
  id: string;
  projectId: string;
  blob: Blob;
  mime: EditorAssetMime;
  width: number;
  height: number;
  sizeBytes: number;
  name: string;
  createdAt: string;
};

export type EditorHistory = {
  present: EditorProject;
  past: EditorProject[];
  future: EditorProject[];
};

export type EditorIssue = {
  stepId?: string;
  zoneId?: string;
  field: string;
  message: string;
};
