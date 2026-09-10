from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


def read(path):
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def write(path, text):
    path.write_text(text, encoding="utf-8", newline="\n")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one {label}, found {count}")
    return text.replace(old, new, 1)

bootstrap_path = SITE / "bootstrap.js"
bootstrap = read(bootstrap_path)
bootstrap = replace_once(
    bootstrap,
    "  const TABLE_VIEW_BY_SLUG = APP_CONFIG.routes.viewBySlug;\n  const TABLE_VIEW_SLUGS = new Set(Object.keys(TABLE_VIEW_BY_SLUG));\n",
    "",
    "Bootstrap local route-view aliases",
)
bootstrap = replace_once(
    bootstrap,
    "  function tableViewConfig() {\n    return APP_CONFIG.routes.tableViews;\n  }\n\n",
    "",
    "Bootstrap table-view config wrapper",
)
old_route_parts = '''  function routeParts(urlLike = window.location.href) {
    try {
      return new URL(String(urlLike || window.location.href), window.location.href).pathname.split("/").filter(Boolean);
    } catch {
      return window.location.pathname.split("/").filter(Boolean);
    }
  }
'''
new_route_request = '''  function canonicalBootstrapRequest(urlLike = window.location.href) {
    try {
      const route = new URL(String(urlLike || window.location.href), window.location.href);
      return APP_CONFIG.routes.initialRequest(route.pathname);
    } catch {
      return APP_CONFIG.routes.initialRequest(window.location.pathname);
    }
  }
'''
bootstrap = replace_once(bootstrap, old_route_parts, new_route_request, "Bootstrap route parser")
old_decoded = '''  function decodedRoutePart(value) {
    try {
      return decodeURIComponent(String(value || ""));
    } catch {
      return String(value || "");
    }
  }

'''
bootstrap = replace_once(bootstrap, old_decoded, "", "Bootstrap decoded route helper")
old_view = '''  function tableViewFromUrl(page, urlLike = window.location.href) {
    const normalizedPage = String(page || "").toLowerCase();
    const config = tableViewConfig()[normalizedPage];
    if (!config || !Array.isArray(config.order)) return "";

    const parts = routeParts(urlLike);
    const routeSlug = decodedRoutePart(parts[parts.length - 1]).toLowerCase();
    const routeView = TABLE_VIEW_BY_SLUG[routeSlug] || "";
    return config.order.includes(routeView) ? routeView : "";
  }
'''
new_view = '''  function tableViewFromUrl(page, urlLike = window.location.href) {
    const normalizedPage = APP_CONFIG.routes.normalizePageName(page);
    const request = canonicalBootstrapRequest(urlLike);
    return request?.pageName === normalizedPage ? String(request.options?.view || "") : "";
  }
'''
bootstrap = replace_once(bootstrap, old_view, new_view, "Bootstrap table route-view derivation")
old_watchlist = '''  function firstPaintWatchlistIdentity(urlLike = window.location.href) {
    const parts = routeParts(urlLike);
    if (String(parts[0] || "").toLowerCase() !== "watchlist") {
      return { id: "", name: "Default" };
    }

    const firstSegment = decodedRoutePart(parts[1]);
    const routeWatchlistId = firstSegment && !TABLE_VIEW_SLUGS.has(firstSegment.toLowerCase())
      ? firstSegment
      : "";
'''
new_watchlist = '''  function firstPaintWatchlistIdentity(urlLike = window.location.href) {
    const request = canonicalBootstrapRequest(urlLike);
    if (request?.pageName !== "watchlist") {
      return { id: "", name: "Default" };
    }

    const routeWatchlistId = String(request.options?.watchlistId || "");
'''
bootstrap = replace_once(bootstrap, old_watchlist, new_watchlist, "Watchlist first-paint route parsing")
old_club = '''  function firstPaintClubIdentity(urlLike = window.location.href) {
    const parts = routeParts(urlLike);
    const routeRoot = String(parts[0] || "").toLowerCase();
    const clubId = ["club", "clubs"].includes(routeRoot) ? decodedRoutePart(parts[1]).trim() : "";
'''
new_club = '''  function firstPaintClubIdentity(urlLike = window.location.href) {
    const request = canonicalBootstrapRequest(urlLike);
    const clubId = request?.pageName === "club" ? String(request.options?.clubId || "").trim() : "";
'''
bootstrap = replace_once(bootstrap, old_club, new_club, "Club first-paint route parsing")
bootstrap = replace_once(
    bootstrap,
    '      const evaluationRoute = route.pathname === "/evaluation";\n',
    '      const evaluationRoute = canonicalBootstrapRequest(route.href)?.pageName === "evaluation";\n',
    "Evaluation first-paint route classification",
)
for retired in [
    "TABLE_VIEW_BY_SLUG",
    "TABLE_VIEW_SLUGS",
    "function tableViewConfig()",
    "function routeParts(",
    "function decodedRoutePart(",
]:
    if retired in bootstrap:
        raise RuntimeError(f"Retired Bootstrap route parser remains: {retired}")
for required in [
    "function canonicalBootstrapRequest(urlLike = window.location.href) {",
    "return APP_CONFIG.routes.initialRequest(route.pathname);",
    "const request = canonicalBootstrapRequest(urlLike);",
    'const evaluationRoute = canonicalBootstrapRequest(route.href)?.pageName === "evaluation";',
]:
    if required not in bootstrap:
        raise RuntimeError(f"Missing canonical Bootstrap route-state contract: {required}")
write(bootstrap_path, bootstrap)

app_config_validator = SITE / "validate-app-config.mjs"
text = read(app_config_validator)
text = replace_once(text, '  "const TABLE_VIEW_BY_SLUG = APP_CONFIG.routes.viewBySlug;",\n', '', "app-config Bootstrap route alias assertion")
text = replace_once(text, '  "return APP_CONFIG.routes.tableViews;",\n', '  "return APP_CONFIG.routes.initialRequest(route.pathname);",\n', "app-config Bootstrap route owner assertion")
anchor = 'for (const retiredOwner of [\n'
route_guard = '''for (const retiredRouteParser of [
  "const TABLE_VIEW_BY_SLUG = APP_CONFIG.routes.viewBySlug;",
  "const TABLE_VIEW_SLUGS = new Set(",
  "function tableViewConfig()",
  "function routeParts(",
  "function decodedRoutePart(",
]) {
  invariant(!bootstrapSource.includes(retiredRouteParser), `Bootstrap must not duplicate canonical route parsing through: ${retiredRouteParser}`);
}

'''
if route_guard not in text:
    text = replace_once(text, anchor, route_guard + anchor, "app-config retired Bootstrap route parser guard")
write(app_config_validator, text)

static_validator = SITE / "validate-static-route-ui.mjs"
text = read(static_validator)
old_assertions = '''includes(bootstrap, "const TABLE_VIEW_BY_SLUG = APP_CONFIG.routes.viewBySlug;", "Bootstrap table chrome must consume canonical route-view configuration.");
includes(bootstrap, "function tableViewFromUrl(page, urlLike = window.location.href) {", "Bootstrap table chrome must resolve its view from the destination URL.");
includes(bootstrap, "const routeView = TABLE_VIEW_BY_SLUG[routeSlug] || \"\";", "Bootstrap table chrome must resolve destination slugs through the canonical route-view map.");
'''
new_assertions = '''includes(bootstrap, "function canonicalBootstrapRequest(urlLike = window.location.href) {", "Bootstrap route identity must delegate to canonical app configuration.");
includes(bootstrap, "return APP_CONFIG.routes.initialRequest(route.pathname);", "Bootstrap route identity must use the canonical route classifier.");
includes(bootstrap, "function tableViewFromUrl(page, urlLike = window.location.href) {", "Bootstrap table chrome must resolve its view from the destination URL.");
includes(bootstrap, "return request?.pageName === normalizedPage ? String(request.options?.view || \"\") : \"\";", "Bootstrap table chrome must consume the canonical request view instead of parsing route slugs again.");
excludes(bootstrap, "TABLE_VIEW_BY_SLUG", "Bootstrap must not retain a second route-view parser.");
excludes(bootstrap, "function routeParts(", "Bootstrap must not retain a second path-segment parser.");
'''
text = replace_once(text, old_assertions, new_assertions, "static-route Bootstrap parser assertions")
write(static_validator, text)

print("Bootstrap now delegates route classification to APP_CONFIG.routes.initialRequest().")
