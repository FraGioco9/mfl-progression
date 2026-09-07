import { readFile, writeFile } from "node:fs/promises";

const path = new URL("./migrate-icon-foundations-once.mjs", import.meta.url);
let source = String(await readFile(path, "utf8"));

const replaceExactly = (label, from, to, expectedCount = 1) => {
  if (!source.includes(from) && source.includes(to)) return;
  const count = source.split(from).length - 1;
  if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} source matches, found ${count}.`);
  source = source.split(from).join(to);
};

replaceExactly(
  "Validator template interpolation",
  "foundation: ${token}",
  "foundation: \\${token}",
);

replaceExactly(
  "Current helper/status normalization wording",
  "10. Ordinary helper/status feedback uses a narrow shared 12px / 1.25 contract, with soft 400-weight status text and danger-derived 700-weight error text; search hints, empty/loading states, table states, and Player/Evaluation data messages remain specialist-owned.",
  "10. Ordinary form/status feedback uses one 12px/1.25 helper contract with soft normal text and stronger danger-derived error feedback; search hints, empty states, table states, and domain-specific data messages remain separate.",
  2,
);

await writeFile(path, source, "utf8");
console.log("Temporary semantic icon migration compatibility fixes applied.");
