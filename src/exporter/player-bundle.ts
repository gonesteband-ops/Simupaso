import { z } from "zod";

export type PlayerBundle = Array<{
  path: string;
  bytes: Uint8Array;
}>;

const storedPlayerBundleSchema = z
  .array(
    z
      .object({
        path: z.string().min(1),
        bytesBase64: z.string().min(1),
      })
      .strict(),
  )
  .min(1);

export function decodePlayerBundle(value: unknown): PlayerBundle {
  const result = storedPlayerBundleSchema.safeParse(value);
  if (!result.success) {
    throw new Error("El bundle compilado del reproductor tiene un formato inválido.");
  }
  return result.data.map((entry) => {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.bytesBase64)) {
      throw new Error(`El contenido base64 de "${entry.path}" está dañado.`);
    }
    const binary = atob(entry.bytesBase64);
    return {
      path: entry.path,
      bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    };
  });
}
