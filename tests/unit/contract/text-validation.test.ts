import { describe, expect, it } from "vitest";
import { validateTextInput } from "../../../src/contract/text-validation";

describe("validación de texto", () => {
  it("valida non_empty sin aplicar normalizaciones implícitas", () => {
    expect(validateTextInput("", { kind: "non_empty" })).toEqual({
      valid: false,
      reason: "empty",
    });
    expect(validateTextInput(" ", { kind: "non_empty" })).toEqual({ valid: true });
  });

  it("compara equals exactamente", () => {
    expect(
      validateTextInput("Codigo-7", { kind: "equals", expected: "Codigo-7" }),
    ).toEqual({ valid: true });
    expect(
      validateTextInput("codigo-7", { kind: "equals", expected: "Codigo-7" }),
    ).toEqual({ valid: false, reason: "incorrect" });
  });

  it("acepta solo los valores declarados por one_of", () => {
    const validation = { kind: "one_of" as const, values: ["correo", "teléfono"] };
    expect(validateTextInput("teléfono", validation)).toEqual({ valid: true });
    expect(validateTextInput("chat", validation)).toEqual({
      valid: false,
      reason: "incorrect",
    });
  });

  it.each(["87.654.321-4", "87654321-4", "87.654.3214", "876543214"])(
    "normaliza y valida el dígito verificador de RUT: %s",
    (value) => {
      expect(
        validateTextInput(value, { kind: "rut", normalize: true }),
      ).toEqual({ valid: true });
    },
  );

  it("distingue formato inválido de dígito verificador incorrecto", () => {
    expect(
      validateTextInput("87.654.321-X", { kind: "rut", normalize: true }),
    ).toEqual({ valid: false, reason: "format" });
    expect(
      validateTextInput("87.654.321-5", { kind: "rut", normalize: true }),
    ).toEqual({ valid: false, reason: "incorrect" });
  });

  it("no acepta formatos sin normalizar cuando la opción está desactivada", () => {
    expect(
      validateTextInput("876543214", { kind: "rut", normalize: false }),
    ).toEqual({ valid: false, reason: "format" });
    expect(
      validateTextInput("87.654.321-4", { kind: "rut", normalize: false }),
    ).toEqual({ valid: true });
  });
});
