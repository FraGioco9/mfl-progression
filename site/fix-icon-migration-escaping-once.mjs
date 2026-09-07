import { readFile, writeFile } from "node:fs/promises";

const path = new URL("./migrate-icon-foundations-once.mjs", import.meta.url);
let source = String(await readFile(path, "utf8"));
const from = "foundation: ${token}";
const to = "foundation: \\${token}";
if (!source.includes(to)) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`Expected one temporary icon migration interpolation, found ${count}.`);
  source = source.replace(from, to);
  await writeFile(path, source, "utf8");
}
console.log("Temporary icon migration template escaping fixed.");
