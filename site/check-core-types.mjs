import { spawnSync } from "node:child_process";
import process from "node:process";

const tscCommand = process.platform === "win32" ? "tsc.cmd" : "tsc";
const result = spawnSync(tscCommand, ["-p", "jsconfig.core.json", "--noEmit", "--pretty", "false"], {
  cwd: process.cwd(),
  encoding: "utf8",
  windowsHide: true,
});

if (result.error) throw result.error;
const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const counts = Object.create(null);
let total = 0;
for (const line of output.split(/\r?\n/)) {
  const match = /^(modules\/core-sources\/[^(:]+\.js)\(\d+,\d+\): error TS(\d+):/.exec(line.trim());
  if (!match) continue;
  total += 1;
  const key = `${match[1]}:TS${match[2]}`;
  counts[key] = (counts[key] || 0) + 1;
}

if (result.status === 0 && total === 0) {
  console.log("Canonical core TypeScript check passed without diagnostics.");
  process.exit(0);
}
if (!total) {
  process.stderr.write(output);
  throw new Error(`Canonical core TypeScript process failed with status ${result.status} without parseable diagnostics.`);
}

const sortedCounts = Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
console.log(`Canonical core TypeScript baseline discovery: ${total} diagnostics.`);
console.log(JSON.stringify(sortedCounts));
