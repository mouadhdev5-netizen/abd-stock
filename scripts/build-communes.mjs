// Download the upstream source datasets and regenerate src/data/algeria-communes.ts
// Run with: node scripts/build-communes.mjs

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = join(__dirname, ".cache");
const OUT = join(__dirname, "..", "src", "data", "algeria-communes.ts");
mkdirSync(CACHE, { recursive: true });

const SOURCES = [
  {
    name: "communes.raw.json",
    url: "https://raw.githubusercontent.com/Kenandarabeh/algeria-wilayas-communes-2026/main/src/data/Communes.json",
  },
  {
    name: "wilayas.raw.json",
    url: "https://raw.githubusercontent.com/Kenandarabeh/algeria-wilayas-communes-2026/main/src/data/Wilaya.json",
  },
];

for (const s of SOURCES) {
  process.stdout.write(`Fetching ${s.name} ... `);
  const res = await fetch(s.url);
  if (!res.ok) {
    console.log(`FAILED (${res.status})`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(join(CACHE, s.name), await res.text());
  console.log("ok");
}

// Parse and transform
const communes = JSON.parse(readFileSync(join(CACHE, "communes.raw.json"), "utf8"));
const wilayas = JSON.parse(readFileSync(join(CACHE, "wilayas.raw.json"), "utf8"));

// Build a map: wilayaCode -> array of commune names (fr)
const map = {};

for (const c of communes) {
  // The Kenandarabeh dataset uses wilaya_id or code
  const code = String(c.wilaya_id || c.wilaya_code || c.code_wilaya || "").padStart(2, "0");
  if (!code || code === "00") continue;
  if (!map[code]) map[code] = [];
  const name = c.name || c.commune_name || c.nom || c.name_fr || "";
  if (name && !map[code].includes(name)) {
    map[code].push(name);
  }
}

// Sort commune names within each wilaya
for (const code of Object.keys(map)) {
  map[code].sort((a, b) => a.localeCompare(b, "fr"));
}

const ts = `// AUTO-GENERATED — run \`node scripts/build-communes.mjs\` to regenerate
// Source: https://github.com/Kenandarabeh/algeria-wilayas-communes-2026

export const algeriaCommunes: Record<string, string[]> = ${JSON.stringify(map, null, 2)}
`;

writeFileSync(OUT, ts, "utf8");
console.log(`\nWrote ${Object.keys(map).length} wilayas → ${OUT}`);
