import fs from "node:fs";

const path = "site/validate-global-search-results.mjs";
let source = fs.readFileSync(path, "utf8");

const importAnchor = 'import { invariant } from "./validation/assertions.mjs";\nimport { readFile } from "node:fs/promises";';
const importReplacement = 'import { invariant } from "./validation/assertions.mjs";\nimport { readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";\nimport { readFile } from "node:fs/promises";';
if (!source.includes(importAnchor)) throw new Error("Global Search import anchor missing.");
source = source.replace(importAnchor, importReplacement);

const promiseAnchor = `const [runtime, styles, responsive, controls, core, appEntry, walletPreferencesApi, dataViews] = await Promise.all([\n  read("./global-search-runtime.js"),\n  read("./styles-base.css"),\n  read("./responsive.css"),\n  read("./controls.css"),\n  Promise.all([\n    read("./modules/core-sources/shared.js"),\n    read("./modules/core-sources/evaluation.js"),\n    read("./modules/core-sources/mfl-stats.js"),\n    read("./modules/core-sources/club.js"),\n    read("./modules/core-sources/settings.js"),\n    read("./modules/core-sources/player.js"),\n    read("./modules/core-sources/table.js"),\n    read("./modules/core-sources/wallet.js"),\n    read("./modules/core-sources/watchlist.js"),\n  ]).then((parts) => parts.join("\\n")),\n  read("./modules/app-entry.js"),\n  read("./api/wallet-preferences.js"),\n  read("./api/_data-views.js"),\n]);`;
const promiseReplacement = `const [runtime, styles, responsive, controls, appEntry, walletPreferencesApi, dataViews] = await Promise.all([\n  read("./global-search-runtime.js"),\n  read("./styles-base.css"),\n  read("./responsive.css"),\n  read("./controls.css"),\n  read("./modules/app-entry.js"),\n  read("./api/wallet-preferences.js"),\n  read("./api/_data-views.js"),\n]);\nconst core = readCombinedCanonicalCoreSource();`;
if (!source.includes(promiseAnchor)) throw new Error("Global Search manual-core anchor missing.");
source = source.replace(promiseAnchor, promiseReplacement);

fs.writeFileSync(path, source, "utf8");
