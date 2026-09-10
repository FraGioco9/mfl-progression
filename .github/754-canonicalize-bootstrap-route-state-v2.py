from pathlib import Path

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
bootstrap = replace_once(bootstrap, "  const TABLE_VIEW_BY_SLUG = APP_CONFIG.routes.viewBySlug;\n  const TABLE_VIEW_SLUGS = new Set(Object.keys(TABLE_VIEW_BY_SLUG));\n", "", "Bootstrap local route-view aliases")
bootstrap = replace_once(bootstrap, "  function tableViewConfig() {\n    return APP_CONFIG.routes.tableViews;\n  }\n\n", "", "Bootstrap table-view config wrapper")
bootstrap = replace_once(bootstrap, '''  function routeParts(urlLike = window.location.href) {
    try {
      return new URL(String(urlLike || window.location.href), window.location.href).pathname.split("/").filter(Boolean);
    } catch {
      return window.location.pathname.split("/").filter(Boolean);
    }
  }
''', '''  function canonicalBootstrapRequest(urlLike = window.location.href) {
    try {
      const route = new URL(String(urlLike || window.location.href), window.location.href);
      return APP_CONFIG.routes.initialRequest(route.pathname);
    } catch {
      return APP_CONFIG.routes.initialRequest(window.location.pathname);
    }
  }
''', "Bootstrap route parser")
bootstrap = replace_once(bootstrap, '''  function decodedRoutePart(value) {
    try {
      return decodeURIComponent(String(value || ""));
    } catch {
      return String(value || "");
    }
  }

''', "", "Bootstrap decoded route helper")
bootstrap = replace_once(bootstrap, '''  function tableViewFromUrl(page, urlLike = window.location.href) {
    const normalizedPage = String(page || "").toLowerCase();
    const config = tableViewConfig()[normalizedPage];
    if (!config || !Array.isArray(config.order)) return "";

    const parts = routeParts(urlLike);
    const routeSlug = decodedRoutePart(parts[parts.length - 1]).toLowerCase();
    const routeView = TABLE_VIEW_BY_SLUG[routeSlug] || "";
    return config.order.includes(routeView) ? routeView : "";
  }
''', '''  function tableViewFromUrl(page, urlLike = window.location.href) {
    const normalizedPage = APP_CONFIG.routes.normalizePageName(page);
    const request = canonicalBootstrapRequest(urlLike);
    return request?.pageName === normalizedPage ? String(request.options?.view || "") : "";
  }
''', "Bootstrap table route-view derivation")
bootstrap = replace_once(bootstrap, '''  function firstPaintWatchlistIdentity(urlLike = window.location.href) {
    const parts = routeParts(urlLike);
    if (String(parts[0] || "").toLowerCase() !== "watchlist") {
      return { id: "", name: "Default" };
    }

    const firstSegment = decodedRoutePart(parts[1]);
    const routeWatchlistId = firstSegment && !TABLE_VIEW_SLUGS.has(firstSegment.toLowerCase())
      ? firstSegment
      : "";
''', '''  function firstPaintWatchlistIdentity(urlLike = window.location.href) {
    const request = canonicalBootstrapRequest(urlLike);
    if (request?.pageName !== "watchlist") {
      return { id: "", name: "Default" };
    }

    const routeWatchlistId = String(request.options?.watchlistId || "");
''', "Watchlist first-paint route parsing")
bootstrap = replace_once(bootstrap, '''  function firstPaintClubIdentity(urlLike = window.location.href) {
    const parts = routeParts(urlLike);
    const routeRoot = String(parts[0] || "").toLowerCase();
    const clubId = ["club", "clubs"].includes(routeRoot) ? decodedRoutePart(parts[1]).trim() : "";
''', '''  function firstPaintClubIdentity(urlLike = window.location.href) {
    const request = canonicalBootstrapRequest(urlLike);
    const clubId = request?.pageName === "club" ? String(request.options?.clubId || "").trim() : "";
''', "Club first-paint route parsing")
bootstrap = replace_once(bootstrap, '      const evaluationRoute = route.pathname === "/evaluation";\n', '      const evaluationRoute = canonicalBootstrapRequest(route.href)?.pageName === "evaluation";\n', "Evaluation first-paint route classification")
for retired in ["TABLE_VIEW_BY_SLUG", "TABLE_VIEW_SLUGS", "function tableViewConfig()", "function routeParts(", "function decodedRoutePart("]:
    if retired in bootstrap:
        raise RuntimeError(f"Retired Bootstrap route parser remains: {retired}")
write(bootstrap_path, bootstrap)

app_config_validator = SITE / "validate-app-config.mjs"
text = read(app_config_validator)
text = replace_once(text, '  "const TABLE_VIEW_BY_SLUG = APP_CONFIG.routes.viewBySlug;",\n', '', "app-config Bootstrap route alias assertion")
text = replace_once(text, '  "return APP_CONFIG.routes.tableViews;",\n', '  "return APP_CONFIG.routes.initialRequest(route.pathname);",\n', "app-config Bootstrap route owner assertion")
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
    text = replace_once(text, 'for (const retiredOwner of [\n', route_guard + 'for (const retiredOwner of [\n', "app-config retired Bootstrap route parser guard")
write(app_config_validator, text)

static_validator = SITE / "validate-static-route-ui.mjs"
lines = read(static_validator).splitlines()
output = []
seen_alias = seen_view = seen_route_view = False
for line in lines:
    if 'includes(bootstrap, "const TABLE_VIEW_BY_SLUG = APP_CONFIG.routes.viewBySlug;' in line:
        output.extend([
            'includes(bootstrap, "function canonicalBootstrapRequest(urlLike = window.location.href) {", "Bootstrap route identity must delegate to canonical app configuration.");',
            'includes(bootstrap, "return APP_CONFIG.routes.initialRequest(route.pathname);", "Bootstrap route identity must use the canonical route classifier.");',
        ])
        seen_alias = True
        continue
    if 'includes(bootstrap, "function tableViewFromUrl(page, urlLike = window.location.href) {' in line:
        output.append(line)
        seen_view = True
        continue
    if 'includes(bootstrap, "const routeView = TABLE_VIEW_BY_SLUG[routeSlug]' in line:
        output.extend([
            'includes(bootstrap, "return request?.pageName === normalizedPage ? String(request.options?.view || \\\"\\\") : \\\"\\\";", "Bootstrap table chrome must consume the canonical request view instead of parsing route slugs again.");',
            'excludes(bootstrap, "TABLE_VIEW_BY_SLUG", "Bootstrap must not retain a second route-view parser.");',
            'excludes(bootstrap, "function routeParts(", "Bootstrap must not retain a second path-segment parser.");',
        ])
        seen_route_view = True
        continue
    output.append(line)
if not (seen_alias and seen_view and seen_route_view):
    raise RuntimeError(f"Static route validator migration incomplete: alias={seen_alias} view={seen_view} routeView={seen_route_view}")
write(static_validator, "\n".join(output) + "\n")

print("Bootstrap now delegates route classification to APP_CONFIG.routes.initialRequest().")
