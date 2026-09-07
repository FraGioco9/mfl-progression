import { readFile, writeFile } from "node:fs/promises";

const path = new URL("./validation/responsive-chrome.mjs", import.meta.url);
let source = String(await readFile(path, "utf8")).replace(/\r\n?/g, "\n");

const replaceOnce = (label, from, to) => {
  if (source.includes(to)) return;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one source match, found ${count}.`);
  source = source.replace(from, to);
};

replaceOnce(
  "Desktop navigation icon contract",
  `  includes(controls, "#sidebar .navEmoji {\\n  flex: 0 0 18px;\\n  width: 18px;\\n  min-width: 18px;\\n  max-width: 18px;\\n  height: 18px;", "Desktop navigation icons must share one 18px geometry contract.");`,
  `  includes(controls, "#sidebar .navEmoji {\\n  flex: 0 0 var(--mfl-icon-size-navigation);\\n  width: var(--mfl-icon-size-navigation);\\n  min-width: var(--mfl-icon-size-navigation);\\n  max-width: var(--mfl-icon-size-navigation);\\n  height: var(--mfl-icon-size-navigation);", "Desktop navigation icons must consume the shared navigation-icon geometry contract.");`,
);

replaceOnce(
  "Desktop jersey icon contract",
  `  includes(controls, "#sidebar .navJerseyIcon {\\n  width: 18px;\\n  height: 18px;\\n  color: inherit;\\n  fill: none;\\n  stroke: currentColor;\\n  stroke-width: 2;\\n  stroke-linecap: round;\\n  stroke-linejoin: round;", "My Players must render the Lucide shirt as an outline-only currentColor icon.");`,
  `  includes(controls, "#sidebar .navJerseyIcon {\\n  width: var(--mfl-icon-size-navigation);\\n  height: var(--mfl-icon-size-navigation);\\n  color: inherit;\\n  fill: none;\\n  stroke: currentColor;\\n  stroke-width: 2;\\n  stroke-linecap: round;\\n  stroke-linejoin: round;", "My Players must render the Lucide shirt as an outline-only currentColor navigation icon.");`,
);

await writeFile(path, source, "utf8");
console.log("Responsive icon regression contracts migrated to shared semantic sizing.");
