import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

import { browserConfigRuntimeSource } from "./modules/app-config.js";
import { coreSourceByDomain } from "./modules/core-source-manifest.js";

const read = async (path) => String(await readFile(new URL(path, import.meta.url), "utf8")).replace(/\r\n?/g, "\n");
const release = JSON.parse(await read("./release.json"));
const sandbox = {
  window: {},
  location: { pathname: "/", search: "", hash: "" },
  history: { replaceState() {} },
  console,
};
vm.runInNewContext(browserConfigRuntimeSource(release), sandbox);
const routes = sandbox.window.__mflAppConfig?.routes;
assert.ok(routes, "Canonical route config must be available.");

assert.equal(routes.normalizePageName("my-clubs"), "my-clubs", "My Clubs must use the canonical hyphenated page identifier.");
const canonical = routes.canonicalRequest("/my-clubs");
assert.equal(canonical.pageName, "my-clubs", "/my-clubs must resolve to My Clubs.");
assert.equal(canonical.canonicalPath, "/my-clubs", "My Clubs must keep its canonical hyphenated path.");
const alias = routes.canonicalRequest("/myclubs");
assert.equal(alias.pageName, "my-clubs", "/myclubs must resolve to My Clubs.");
assert.equal(alias.options.replaceUrl, "/my-clubs", "Legacy unhyphenated My Clubs URLs must canonicalize.");
const dependencies = routes.routeDependencyPlan("my-clubs");
assert.deepEqual([...dependencies.core], ["my-clubs"], "My Clubs must load only its lightweight route core.");
assert.equal(dependencies.table, false, "My Clubs must not load player-table infrastructure.");
assert.equal(routes.corePaths["my-clubs"], "/modules/app-core-my-clubs-runtime.js", "My Clubs must own a generated route core.");

const manifest = coreSourceByDomain["my-clubs"];
assert.ok(manifest, "Core source manifest must register My Clubs.");
assert.equal(manifest.source, "my-clubs.js");
assert.equal(manifest.runtime, "app-core-my-clubs-runtime.js");

const [
  pageHtml,
  firstPaintHtml,
  bootstrap,
  accessHtml,
  chromeHtml,
  htmlManifest,
  sharedCore,
  coreSource,
  dataApi,
  clubsApi,
  titleRuntime,
  pageStyles,
  tabletStyles,
  phoneStyles,
  responsiveManifest,
  styleBundle,
] = await Promise.all([
  read("./html-sources/my-clubs.html"),
  read("./html-sources/first-paint.html"),
  read("./bootstrap.js"),
  read("./html-sources/access.html"),
  read("./html-sources/chrome.html"),
  read("./html-sources/manifest.json"),
  read("./modules/core-sources/shared.js"),
  read("./modules/core-sources/my-clubs.js"),
  read("./api/data.js"),
  read("./api/_clubs.js"),
  read("./document-title-runtime.js"),
  read("./my-clubs.css"),
  read("./responsive-sources/my-clubs-tablet.css.inc"),
  read("./responsive-sources/my-clubs-phone.css.inc"),
  read("./responsive-sources/manifest.json"),
  read("./style-bundle.mjs"),
]);

assert.match(pageHtml, /id="myClubsPage" class="pageView myClubsPage"/u, "My Clubs must expose a dedicated page shell.");
assert.match(pageHtml, /<h2 class="tablePageTitle">My Clubs<\/h2>/u, "My Clubs must consume the shared page-title component instead of owning a parallel header.");
assert.match(pageHtml, /id="myClubsGrid"/u, "My Clubs must expose a card grid.");
assert.doesNotMatch(pageHtml, /<style\b|<script\b|@media/u, "My Clubs HTML must remain markup-only; first-paint and visual ownership belong to canonical owners.");
assert.doesNotMatch(pageHtml, /myClubsHeader/u, "My Clubs must not recreate a page-specific title/header component.");
assert.doesNotMatch(pageHtml, /MutationObserver/u, "My Clubs must not keep a page-local observer workaround for refresh ownership.");
assert.match(firstPaintHtml, /firstPart === "my-clubs" \|\| firstPart === "myclubs"[\s\S]*?\? "my-clubs"/u, "First-paint route classification must preserve My Clubs as the protected route identity.");
assert.match(firstPaintHtml, /data-initial-page="my-clubs"[^\n]*#sidebar \.navButton\[data-page="my-clubs"\]/u, "My Clubs navigation must be active on the refresh first paint.");
assert.match(firstPaintHtml, /data-initial-page="my-clubs"[\s\S]*?data-initial-page="myclubs"[\s\S]*?#myPlayersLockedPage/u, "Opted-out My Clubs refreshes must select the shared locked shell before route resolution.");
assert.match(bootstrap, /\["my-clubs", "myclubs", "settings"\]\.includes\(initialPage\)/u, "Bootstrap must classify My Clubs as a protected non-table route.");
assert.match(bootstrap, /initialPage === "my-clubs" \|\| initialPage === "myclubs"\) return document\.getElementById\("myClubsPage"\)/u, "Bootstrap must select the My Clubs shell rather than Home on direct refresh.");

assert.match(pageStyles, /\.myClubCard \{[\s\S]*?border-radius: var\(--mfl-radius-panel\);/u, "Club cards must consume the shared ordinary-panel radius.");
assert.match(pageStyles, /\.myClubCard:focus-visible \{[\s\S]*?outline: var\(--mfl-focus-ring-width\) solid var\(--mfl-focus-ring-color\);[\s\S]*?outline-offset: var\(--mfl-focus-ring-offset\);/u, "Club cards must consume the shared keyboard-focus contract.");
assert.match(pageStyles, /\.myClubName \{[\s\S]*?font-size: var\(--mfl-section-title-font-size\);[\s\S]*?font-weight: var\(--mfl-section-title-font-weight\);[\s\S]*?line-height: var\(--mfl-section-title-line-height\);/u, "Club names must consume shared section-title typography.");
assert.match(pageStyles, /\.myClubMeta \{[\s\S]*?font-size: var\(--mfl-metadata-font-size\);[\s\S]*?font-weight: var\(--mfl-metadata-font-weight\);[\s\S]*?line-height: var\(--mfl-metadata-line-height\);/u, "Club metadata must consume shared metadata typography.");
assert.match(pageStyles, /\.myClubId \{[\s\S]*?font-size: var\(--mfl-metadata-compact-font-size\);/u, "Club IDs beside names must consume compact shared metadata sizing.");
assert.doesNotMatch(pageStyles, /max-width:\s*1180px|border-radius:\s*14px|outline:\s*2px solid currentColor|!important/u, "My Clubs must not retain its pre-foundation page width, radius, focus, or override layer.");
const pageRule = pageStyles.match(/\.myClubsPage \{[^}]*\}/u)?.[0] || "";
assert.ok(pageRule, "My Clubs must retain one domain page rule for width/min-width geometry.");
assert.doesNotMatch(pageRule, /max-width:/u, "My Clubs must inherit the shared page gutter instead of owning a route-level content cap.");
assert.match(styleBundle, /DEFAULT_STYLE_ENTRIES = Object\.freeze\(\["styles\.css", "my-clubs\.css"\]\)/u, "The canonical production stylesheet graph must include the My Clubs domain stylesheet.");

const responsiveOrder = JSON.parse(responsiveManifest);
assert.ok(responsiveOrder.includes("my-clubs-tablet.css.inc"), "Responsive assembly must include My Clubs tablet geometry.");
assert.ok(responsiveOrder.includes("my-clubs-phone.css.inc"), "Responsive assembly must include My Clubs phone geometry.");
assert.match(tabletStyles, /@media \(max-width: 900px\)[\s\S]*?\.myClubsGrid/u, "Tablet My Clubs geometry must live in the canonical responsive source tree.");
assert.match(phoneStyles, /@media \(max-width: 640px\)[\s\S]*?\.myClubsGrid/u, "Phone My Clubs geometry must live in the canonical responsive source tree.");
assert.doesNotMatch(pageStyles, /@media/u, "Viewport-specific My Clubs geometry must not live in the base domain stylesheet.");

assert.match(accessHtml, /"my-clubs": \["My Clubs", "In order to see your clubs, you need to opt in\."\]/u, "My Clubs must use the shared opt-in locked shell.");
assert.match(chromeHtml, /href="\/my-clubs" data-page="my-clubs"[\s\S]*?<path d="M20 13c0 5-3\.5 7\.5-7\.66 8\.95a1 1 0 0 1-\.67-\.01C7\.5 20\.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4\.5-1\.2 6\.24-2\.72a1\.17 1\.17 0 0 1 1\.52 0C14\.51 3\.81 17 5 19 5a1 1 0 0 1 1 1z"><\/path>/u, "My Clubs must use the requested Lucide Shield icon.");
const fragmentOrder = JSON.parse(htmlManifest);
assert.ok(fragmentOrder.includes("my-clubs.html"), "My Clubs HTML fragment must be assembled into the site.");
assert.ok(fragmentOrder.indexOf("my-clubs.html") < fragmentOrder.indexOf("access.html"), "My Clubs first-paint state must be available before locked-copy hydration.");

new Function(coreSource);
assert.match(coreSource, /const PAGE = "my-clubs";/u, "My Clubs runtime state must use the canonical hyphenated page identifier.");
assert.match(sharedCore, /cleanPath === "\/my-clubs" \|\| cleanPath === "\/myclubs"/u, "Shared startup routing must classify My Clubs on refresh instead of falling back to Home.");
assert.match(sharedCore, /pageName: "my-clubs"/u, "Shared startup routing must hand direct My Clubs refreshes to the My Clubs route core.");
assert.match(coreSource, /fetch\("\/api\/data\?mode=my-clubs"/u, "My Clubs must fetch the signed canonical data endpoint.");
assert.match(coreSource, /cacheWallet && cacheWallet !== wallet/u, "My Clubs cache must invalidate on wallet changes.");
assert.match(coreSource, /clearCache\(\);\n\s*void renderRoute\(false/u, "Opt-out must clear old clubs immediately.");
assert.match(coreSource, /No clubs found for this wallet\./u, "My Clubs must define an empty state.");
assert.doesNotMatch(coreSource, /myClubLogoPlaceholder|Global #|MFL points|nbMflPoints/u, "My Clubs must not render logo placeholders, global rank, or MFL points.");
assert.match(coreSource, /contractDivisionInfo\(division\)/u, "My Clubs must render canonical named/colored divisions.");
assert.match(coreSource, /\[city, nation\]\.filter\(Boolean\)\.join\(", "\)/u, "My Clubs must render City, Nation from canonical runtime club location data.");
assert.match(coreSource, /`\/clubs\/\$\{encodeURIComponent\(clubId\)\}\/squad`/u, "Club cards must link through the canonical Club Squad route.");
assert.match(dataApi, /mode === "my-clubs"/u, "The database API must expose My Clubs mode.");
assert.match(clubsApi, /https:\/\/d13e14gtps4iwl\.cloudfront\.net\/u\/clubs/u, "Club logos must use MFL's canonical club-logo CDN host.");
assert.match(clubsApi, /runtimeClubColumns[\s\S]*?citySelect[\s\S]*?nationSelect/u, "My Clubs API must expose City/Nation when available while staying compatible with pre-location runtime databases.");
assert.match(clubsApi, /CASE WHEN division BETWEEN 1 AND 5 THEN division ELSE 999 END/u, "My Clubs API must sort Diamond through Bronze before unknown divisions.");
assert.match(titleRuntime, /"my-clubs": "My Clubs"/u, "Document title ownership must recognize the canonical My Clubs page identifier.");

console.log("My Clubs route validation passed with direct-refresh shell ownership, canonical logo CDN, and foundation-native UI ownership.");

assert.match(coreSource, /validClubs\.sort/u, "My Clubs must sort cards by division before rendering.");
assert.match(coreSource, /myClubId/u, "My Clubs must place the club ID beside the club name.");
assert.doesNotMatch(clubsApi, /mfl_points|nbMflPoints/u, "My Clubs API must not fetch or expose MFL points.");
assert.match(clubsApi, /country AS nation/u, "My Clubs API must expose country using the Nation terminology.");
