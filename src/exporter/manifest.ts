import type { Project } from "../contract/project";

const manifestNamespace = "http://www.imsproject.org/xsd/imscp_rootv1p1p2";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildManifest(project: Project, packagePaths: string[]): string {
  const files = [...new Set(packagePaths)].sort((a, b) => a.localeCompare(b, "en"));
  const fileElements = files
    .map((path) => `      <file href="${escapeXml(path)}"/>`)
    .join("\n");
  const title = escapeXml(project.meta.title);
  const identifier = escapeXml(`simupaso-${project.id}`);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<manifest identifier="${identifier}" version="1.0" xmlns="${manifestNamespace}" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${manifestNamespace} http://www.imsproject.org/xsd/imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 http://www.adlnet.org/xsd/adlcp_rootv1p2.xsd">`,
    "  <organizations default=\"ORG-1\">",
    "    <organization identifier=\"ORG-1\">",
    `      <title>${title}</title>`,
    '      <item identifier="ITEM-1" identifierref="RES-1">',
    `        <title>${title}</title>`,
    "      </item>",
    "    </organization>",
    "  </organizations>",
    "  <resources>",
    '    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">',
    fileElements,
    "    </resource>",
    "  </resources>",
    "</manifest>",
  ].join("\n");
}
