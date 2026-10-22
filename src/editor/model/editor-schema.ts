import { z } from "zod";
import { INPUT_FONT_SIZE_MAX, INPUT_FONT_SIZE_MIN } from "../../contract/text-style";

const identifierSchema = z.string().min(1).max(128);

const feedbackMessagesSchema = z
  .object({
    error: z.string().min(1).max(500).optional(),
    success: z.string().min(1).max(500).optional(),
  })
  .strict();

export const editorRectSchema = z
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

export const editorTextValidationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("non_empty") }).strict(),
  z
    .object({
      kind: z.literal("equals"),
      expected: z.string().max(500),
    })
    .strict(),
  z
    .object({
      kind: z.literal("one_of"),
      values: z.array(z.string().max(500)),
    })
    .strict(),
  z
    .object({
      kind: z.literal("rut"),
      normalize: z.boolean(),
    })
    .strict(),
]);

export const editorClickZoneSchema = z
  .object({
    id: identifierSchema,
    label: z.string().max(200).optional(),
    rect: editorRectSchema,
  })
  .strict();

export const editorTextZoneSchema = z
  .object({
    id: identifierSchema,
    rect: editorRectSchema,
    label: z.string().max(200),
    placeholder: z.string().max(200).optional(),
    masked: z.boolean(),
    validation: editorTextValidationSchema,
    fontSize: z
      .number()
      .int()
      .min(INPUT_FONT_SIZE_MIN)
      .max(INPUT_FONT_SIZE_MAX)
      .optional(),
    errorMessage: z.string().min(1).max(500).optional(),
    successMessage: z.string().min(1).max(500).optional(),
  })
  .strict();

export const editorCheckboxZoneSchema = z
  .object({
    id: identifierSchema,
    rect: editorRectSchema,
    label: z.string().max(200).optional(),
    expected: z.boolean(),
  })
  .strict();

export const editorRedactionSchema = z
  .object({
    id: identifierSchema,
    rect: editorRectSchema,
    style: z.enum(["blur", "pixelate", "solid"]),
    intensity: z.number().int().min(10).max(100),
  })
  .strict();

export const editorRedactionGroupSchema = z
  .object({
    assetId: identifierSchema,
    items: z.array(editorRedactionSchema),
  })
  .strict();

export const editorStepSchema = z
  .object({
    id: identifierSchema,
    title: z.string().max(200),
    instruction: z.string().max(2000),
    hint: z.string().min(1).max(1000).optional(),
    assetId: identifierSchema,
    mode: z.enum(["interactive", "informative"]),
    informativeButtonLabel: z.string().max(40).optional(),
    messages: feedbackMessagesSchema.optional(),
    clickZones: z.array(editorClickZoneSchema),
    clickMatch: z.enum(["any", "all"]),
    textZones: z.array(editorTextZoneSchema),
    checkboxZones: z.array(editorCheckboxZoneSchema).optional(),
  })
  .strict();

export const editorProjectSchema = z
  .object({
    schemaVersion: z.literal("editor-1"),
    id: identifierSchema,
    meta: z
      .object({
        title: z.string().min(1).max(200),
        client: z.string().max(200).optional(),
        description: z.string().max(2000).optional(),
        author: z.string().max(200).optional(),
        language: z.literal("es-CL"),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        createdAt: z.string().min(1),
        updatedAt: z.string().min(1),
      })
      .strict(),
    steps: z.array(editorStepSchema),
    redactions: z.array(editorRedactionGroupSchema).optional(),
    completion: z
      .object({
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(2000),
      })
      .strict(),
  })
  .strict()
  .superRefine((project, context) => {
    const redactionAssets = new Set<string>();
    for (const [groupIndex, group] of (project.redactions ?? []).entries()) {
      if (redactionAssets.has(group.assetId)) {
        context.addIssue({
          code: "custom",
          path: ["redactions", groupIndex, "assetId"],
          message: `El asset "${group.assetId}" tiene más de un grupo de difuminado.`,
        });
      }
      redactionAssets.add(group.assetId);
      const redactionIds = new Set<string>();
      for (const [itemIndex, item] of group.items.entries()) {
        if (redactionIds.has(item.id)) {
          context.addIssue({
            code: "custom",
            path: ["redactions", groupIndex, "items", itemIndex, "id"],
            message: `El identificador de difuminado "${item.id}" está duplicado.`,
          });
        }
        redactionIds.add(item.id);
      }
    }

    const stepIds = new Set<string>();
    project.steps.forEach((step, stepIndex) => {
      if (stepIds.has(step.id)) {
        context.addIssue({
          code: "custom",
          path: ["steps", stepIndex, "id"],
          message: `El identificador de paso "${step.id}" está duplicado.`,
        });
      }
      stepIds.add(step.id);

      const zoneIds = new Set<string>();
      for (const [zoneIndex, zone] of step.clickZones.entries()) {
        if (zoneIds.has(zone.id)) {
          context.addIssue({
            code: "custom",
            path: ["steps", stepIndex, "clickZones", zoneIndex, "id"],
            message: `El identificador de zona "${zone.id}" está duplicado.`,
          });
        }
        zoneIds.add(zone.id);
      }
      for (const [zoneIndex, zone] of step.textZones.entries()) {
        if (zoneIds.has(zone.id)) {
          context.addIssue({
            code: "custom",
            path: ["steps", stepIndex, "textZones", zoneIndex, "id"],
            message: `El identificador de zona "${zone.id}" está duplicado.`,
          });
        }
        zoneIds.add(zone.id);
      }
    });
  });

export type EditorProject = z.infer<typeof editorProjectSchema>;
export type EditorStep = z.infer<typeof editorStepSchema>;
export type EditorClickZone = z.infer<typeof editorClickZoneSchema>;
export type EditorTextZone = z.infer<typeof editorTextZoneSchema>;
export type EditorCheckboxZone = z.infer<typeof editorCheckboxZoneSchema>;
export type EditorRect = z.infer<typeof editorRectSchema>;
export type EditorTextValidation = z.infer<typeof editorTextValidationSchema>;
export type EditorRedaction = z.infer<typeof editorRedactionSchema>;
export type EditorRedactionGroup = z.infer<typeof editorRedactionGroupSchema>;
export type EditorFeedbackMessages = z.infer<typeof feedbackMessagesSchema>;
