import path from "node:path";
import process from "node:process";
import ts from "typescript";

const configPath = path.resolve("jsconfig.core.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
}

const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath),
  undefined,
  configPath,
);
if (parsed.errors.length) {
  throw new Error(parsed.errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n"));
}

const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
const diagnostics = ts.getPreEmitDiagnostics(program)
  .filter((diagnostic) => diagnostic.file?.fileName.includes(`${path.sep}modules${path.sep}core-sources${path.sep}`));

const counts = Object.create(null);
for (const diagnostic of diagnostics) {
  const relative = path.relative(process.cwd(), diagnostic.file.fileName).replaceAll(path.sep, "/");
  const key = `${relative}:TS${diagnostic.code}`;
  counts[key] = (counts[key] || 0) + 1;
}

const sortedCounts = Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
console.log(`Canonical core TypeScript baseline discovery: ${diagnostics.length} diagnostics.`);
console.log(JSON.stringify(sortedCounts));
