import { z } from "zod";
import { INPUT_FONT_SIZE_MAX, INPUT_FONT_SIZE_MIN } from "./text-style";

const identifierSchema = z.string().min(1).max(128);

const relativePathSchema = z
  .string()
  .min(1)
  .refine((path) => {
    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      /^[a-z][a-z\d+.-]*:/i.test(path)
    ) {
      return false;
    }
    return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
  }, "La ruta debe ser relativa y segura.");

export const feedbackMessagesSchema = z
  .object({
    error: z.string().min(1).optional(),
    success: z.string().min(1).optional(),
  })
  .strict();

export const rectSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    w: z.number().finite().positive().max(1),
    h: z.number().finite().positive().max(1),
  })
  .strict()
  .refine((rect) => rect.x + rect.w <= 1 && rect.y + rect.h <= 1, {
    message: "La zona debe permanecer dentro de la imagen.",
  });

export const textValidationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("non_empty") }).strict(),
  z
    .object({
      kind: z.literal("equals"),
      expected: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("one_of"),
      values: z.array(z.string().min(1)).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("rut"),
      normalize: z.boolean().optional(),
    })
    .strict(),
]);

export const clickActionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("click"),
    rects: z.array(rectSchema).min(1),
    match: z.enum(["any", "all"]).optional(),
  })
  .strict();

export const inputActionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("input"),
    rect: rectSchema,
    label: z.string().min(1),
    placeholder: z.string().optional(),
    masked: z.boolean().optional(),
    validation: textValidationSchema,
    fontSize: z
      .number()
      .int()
      .min(INPUT_FONT_SIZE_MIN)
      .max(INPUT_FONT_SIZE_MAX)
      .optional(),
    messages: feedbackMessagesSchema.optional(),
  })
  .strict();

export const checkboxItemSchema = z
  .object({
    id: identifierSchema,
    rect: rectSchema,
    label: z.string().min(1).optional(),
    expected: z.boolean(),
  })
  .strict();

export const checkboxActionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("checkbox"),
    items: z.array(checkboxItemSchema).min(1),
    rule: z.literal("exact").optional(),
  })
  .strict();

export const informativeActionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("informative"),
    text: z.string().min(1),
    buttonLabel: z.string().min(1).optional(),
  })
  .strict();

export const actionSchema = z.discriminatedUnion("type", [
  clickActionSchema,
  inputActionSchema,
  checkboxActionSchema,
  informativeActionSchema,
]);

const assetSchema = z
  .object({
    id: identifierSchema,
    file: relativePathSchema,
    mime: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

const stepSchema = z
  .object({
    id: identifierSchema,
    title: z.string().min(1),
    instruction: z.string().min(1),
    assetId: identifierSchema,
    hint: z.string().min(1).optional(),
    messages: feedbackMessagesSchema.optional(),
    formMode: z.boolean().optional(),
    actions: z.array(actionSchema).min(1),
    annotations: z.array(z.json()).optional(),
  })
  .strict();

export const projectSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    meta: z
      .object({
        title: z.string().min(1),
        language: z.literal("es-CL"),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        description: z.string().optional(),
        author: z.string().optional(),
      })
      .strict(),
    settings: z
      .object({
        allowedModes: z.array(z.literal("guided")).min(1),
        defaultMode: z.literal("guided"),
      })
      .strict(),
    assets: z.array(assetSchema).min(1),
    steps: z.array(stepSchema).min(1),
    completion: z
      .object({
        title: z.string().min(1),
        message: z.string().min(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((project, context) => {
    const assetIds = new Set<string>();
    for (const [index, asset] of project.assets.entries()) {
      if (assetIds.has(asset.id)) {
        context.addIssue({
          code: "custom",
          path: ["assets", index, "id"],
          message: `El identificador de recurso "${asset.id}" está duplicado.`,
        });
      }
      assetIds.add(asset.id);
    }

    const stepIds = new Set<string>();
    for (const [stepIndex, step] of project.steps.entries()) {
      if (stepIds.has(step.id)) {
        context.addIssue({
          code: "custom",
          path: ["steps", stepIndex, "id"],
          message: `El identificador del paso "${step.id}" está duplicado.`,
        });
      }
      stepIds.add(step.id);

      if (!assetIds.has(step.assetId)) {
        context.addIssue({
          code: "custom",
          path: ["steps", stepIndex, "assetId"],
          message: `El recurso "${step.assetId}" no existe.`,
        });
      }

      const actionIds = new Set<string>();
      for (const [actionIndex, action] of step.actions.entries()) {
        if (actionIds.has(action.id)) {
          context.addIssue({
            code: "custom",
            path: ["steps", stepIndex, "actions", actionIndex, "id"],
            message: `El identificador de acción "${action.id}" está duplicado.`,
          });
        }
        actionIds.add(action.id);
      }
    }
  });
