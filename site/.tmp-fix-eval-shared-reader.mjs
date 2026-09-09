import { readFile, writeFile } from "node:fs/promises";
const path = "site/validate-eval-ownership.mjs";
const source = await readFile(path, "utf8");
const oldText = `] = await Promise.all([\n  read("./modules/core-sources/shared.js"),\n  read("./modules/core-sources/evaluation.js"),`;
const newText = `] = await Promise.all([\n  readCombinedCanonicalCoreSource(),\n  read("./modules/core-sources/evaluation.js"),`;
if (!source.includes(oldText)) throw new Error("Evaluation sharedCore reader anchor missing");
await writeFile(path, source.replace(oldText, newText), "utf8");
