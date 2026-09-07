import { readFile, writeFile } from "node:fs/promises";

const path = new URL("./validate-footer-redesign.mjs", import.meta.url);
let source = String(await readFile(path, "utf8")).replace(/\r\n?/g, "\n");

const oldToken = `  'outline: 2px solid var(--primary);',`;
const newTokens = `  'outline: var(--mfl-focus-ring-width) solid var(--mfl-focus-ring-color);',
  'outline-offset: var(--mfl-focus-ring-offset);',`;

if (!source.includes(newTokens)) {
  const matches = source.split(oldToken).length - 1;
  if (matches !== 1) throw new Error(`Footer focus validation migration expected one source match, found ${matches}.`);
  source = source.replace(oldToken, newTokens);
}

await writeFile(path, source, "utf8");
console.log("One-time footer foundation validator migration applied idempotently.");
