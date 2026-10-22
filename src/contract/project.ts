import type { z } from "zod";
import type {
  actionSchema,
  clickActionSchema,
  feedbackMessagesSchema,
  inputActionSchema,
  informativeActionSchema,
  projectSchema,
  rectSchema,
  textValidationSchema,
} from "./project-schema";

export type Project = z.infer<typeof projectSchema>;
export type Rect = z.infer<typeof rectSchema>;
export type Action = z.infer<typeof actionSchema>;
export type ClickAction = z.infer<typeof clickActionSchema>;
export type InputAction = z.infer<typeof inputActionSchema>;
export type InformativeAction = z.infer<typeof informativeActionSchema>;
export type TextValidation = z.infer<typeof textValidationSchema>;
export type FeedbackMessages = z.infer<typeof feedbackMessagesSchema>;
