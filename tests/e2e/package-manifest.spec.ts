import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { createScorm12Package } from "../../src/exporter/create-scorm12-package";
import { samplePackageInput } from "../helpers/package-fixture";

test("el manifiesto SCORM es XML válido, declara un SCO y todos sus recursos existen", async ({
  page,
}) => {
  const packageBytes = createScorm12Package(samplePackageInput()).bytes;
  const files = unzipSync(packageBytes);
  const manifest = new TextDecoder().decode(files["imsmanifest.xml"]);

  await page.goto("/");
  const result = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const resources = [...document.getElementsByTagName("resource")];
    const scoResources = resources.filter(
      (resource) => resource.getAttribute("adlcp:scormtype") === "sco",
    );
    const paths = [...document.getElementsByTagName("file")].map((file) =>
      file.getAttribute("href"),
    );

    return {
      hasParserError: document.getElementsByTagName("parsererror").length > 0,
      resourceCount: resources.length,
      scoCount: scoResources.length,
      paths,
    };
  }, manifest);

  expect(result.hasParserError).toBe(false);
  expect(result.scoCount).toBe(1);
  expect(result.paths.length).toBeGreaterThan(0);
  for (const path of result.paths) {
    expect(path).not.toBeNull();
    expect(files[path!]).toBeDefined();
  }
});
