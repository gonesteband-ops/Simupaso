import { z } from "zod";
import { projectSchema } from "./project-schema";

export const projectJsonSchema = z.toJSONSchema(projectSchema, {
  target: "draft-2020-12",
  unrepresentable: "any",
});
