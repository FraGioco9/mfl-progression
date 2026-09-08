import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), "utf8");

const pageHtml = read("html-sources/my-clubs.html");
const firstPaintHtml = read("html-sources/first-paint.html");
const bootstrap = read("bootstrap.js");
const coreSource = read("modules/core-sources/my-clubs.js");
const sharedCore = read("modules/core-sources/shared.js");
const dataApi = read("api/data.js");
const clubsApi = read("api/_clubs.js");
const pageStyles = read("my-clubs.css");
const styleBundle = read("style-bundle.mjs");
const responsiveManifest = read("responsive-sources/manifest.json");
const tabletStyles = read("responsive-sources/my-clubs-tablet.css.inc");
const phoneStyles = read("responsive-sources/my-clubs-phone.css.inc");
const titleRuntime = read("document-title-runtime.js");

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
assert.match(clubsApi, /CASE WHEN division BETWEEN 1 AND 10 THEN division ELSE 999 END/u, "My Clubs API must preserve the full canonical Diamond-through-Flint division order before unknown divisions.");
assert.match(coreSource, /leftDivision >= 1 && leftDivision <= 10/u, "My Clubs client sorting must recognize every canonical division from Diamond through Flint.");
assert.match(coreSource, /rightDivision >= 1 && rightDivision <= 10/u, "My Clubs client sorting must rank every canonical division consistently.");
assert.match(titleRuntime, /"my-clubs": "My Clubs"/u, "Document title ownership must recognize the canonical My Clubs page identifier.");

console.log("My Clubs route validation passed with direct-refresh shell ownership, full canonical division sorting, canonical logo CDN, and foundation-native UI ownership.");

assert.match(coreSource, /validClubs\.sort/u, "My Clubs must sort cards by division before rendering.");
assert.match(coreSource, /myClubId/u, "My Clubs must place the club ID beside the club name.");
assert.doesNotMatch(clubsApi, /mfl_points|nbMflPoints/u, "My Clubs API must not fetch or expose MFL points.");
assert.match(clubsApi, /country AS nation/u, "My Clubs API must expose country using the Nation terminology.");
assert.match(coreSource, /function firstLetterCaps\(value\)/u, "My Clubs must normalize Nation to first-letter capitalization only.");
assert.match(coreSource, /primeClubDestinationTitle\(clubId, name, divisionInfo\)/u, "My Clubs must prime the known club identity before route navigation.");
assert.match(coreSource, /localStorage\.setItem\(CLUB_DISPLAY_DATA_STORAGE_KEY/u, "My Clubs must share its known club identity with the Club route title cache.");
assert.match(titleRuntime, /cachedClubTitleLabel\(request\?\.options\?\.clubId\)/u, "Document titles must consume the primed Club identity even while the destination route is busy.");
assert.match(pageStyles, /\.myClubLogo \{[\s\S]*?max-width: 100px;[\s\S]*?max-height: 108px;/u, "Desktop My Clubs logos must use the enlarged canonical geometry.");
