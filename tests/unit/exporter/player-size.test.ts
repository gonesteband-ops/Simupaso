import { describe, expect, it } from "vitest";
import { compiledPlayerBundle, samplePackageInput } from "../../helpers/package-fixture";
import { createScorm12Package } from "../../../src/exporter/create-scorm12-package";

function compressedRuntimeBytes(zip: Uint8Array): number {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let endRecord = -1;
  for (let offset = zip.length - 22; offset >= Math.max(0, zip.length - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endRecord = offset;
      break;
    }
  }
  if (endRecord < 0) {
    throw new Error("El ZIP no contiene el registro final.");
  }

  const directorySize = view.getUint32(endRecord + 12, true);
  const directoryOffset = view.getUint32(endRecord + 16, true);
  const directoryEnd = directoryOffset + directorySize;
  let offset = directoryOffset;
  let total = 0;

  while (offset < directoryEnd) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Entrada inválida en la tabla central del ZIP.");
    }
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const fileName = new TextDecoder().decode(
      zip.subarray(offset + 46, offset + 46 + fileNameLength),
    );
    const isImage = /\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(fileName);
    if (fileName === "index.html" || (fileName.startsWith("player/") && !isImage)) {
      total += compressedSize;
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return total;
}

describe("presupuesto de peso del reproductor", () => {
  it("mantiene index.html y el runtime comprimidos bajo 250 KiB, excluyendo datos e imágenes", () => {
    const input = samplePackageInput();
    input.playerBundle = compiledPlayerBundle();

    const output = createScorm12Package(input);
    expect(compressedRuntimeBytes(output.bytes)).toBeLessThan(250 * 1024);
  });
});
