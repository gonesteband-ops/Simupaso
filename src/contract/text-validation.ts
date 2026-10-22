import type { TextValidation } from "./project";

export type TextValidationResult =
  | { valid: true }
  | { valid: false; reason: "empty" | "format" | "incorrect" };

function rutVerifier(number: string): string {
  let sum = 0;
  let factor = 2;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    sum += Number(number[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

function validateRut(value: string, normalize: boolean): TextValidationResult {
  const candidate = normalize
    ? value.trim().replace(/[.\-\s]/g, "").toUpperCase()
    : value;
  if (candidate.length === 0) {
    return { valid: false, reason: "empty" };
  }

  const match = normalize
    ? candidate.match(/^(\d{1,8})([\dK])$/)
    : candidate.match(/^(?:(\d{1,8})|(\d{1,2}(?:\.\d{3}){1,2}))-([\dKk])$/);
  if (!match) {
    return { valid: false, reason: "format" };
  }

  const number = normalize ? match[1] : (match[1] ?? match[2]).replaceAll(".", "");
  const verifier = (normalize ? match[2] : match[3]).toUpperCase();
  return rutVerifier(number) === verifier
    ? { valid: true }
    : { valid: false, reason: "incorrect" };
}

export function validateTextInput(
  value: string,
  validation: TextValidation,
): TextValidationResult {
  if (value.length === 0) {
    return { valid: false, reason: "empty" };
  }

  switch (validation.kind) {
    case "non_empty":
      return { valid: true };
    case "equals":
      return value === validation.expected
        ? { valid: true }
        : { valid: false, reason: "incorrect" };
    case "one_of":
      return validation.values.includes(value)
        ? { valid: true }
        : { valid: false, reason: "incorrect" };
    case "rut":
      return validateRut(value, validation.normalize ?? false);
  }
}
