import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const siteDirectory = resolve(fileURLToPath(new URL("../", import.meta.url)));
const generatedAt = "2026-09-09T00:00:00.000Z";
const searchColumns = [
  "player_id",
  "name",
  "positions",
  "age",
  "nationality",
  "overall",
  "wallet_address",
  "wallet_name",
  "active_contract_club_id",
  "active_contract_club_name",
];
const publicColumns = [
  ...searchColumns,
  "retirement_years",
  "owned_since",
  "player_seasons",
  "goalkeeping",
];

const browserTestSource = String.raw`(() => {
  "use strict";

  const errors = [];
  const originalConsoleError = console.error.bind(console);
  console.error = (...args) => {
    errors.push(args.map((value) => String(value)).join(" "));
    originalConsoleError(...args);
  };
  window.addEventListener("error", (event) => {
    errors.push(String(event.error?.stack || event.message || "window error"));
  });
  window.addEventListener("unhandledrejection", (event) => {
    errors.push(String(event.reason?.stack || event.reason || "unhandled rejection"));
  });

  const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const finish = (status, detail) => {
    const result = document.createElement("pre");
    result.id = "mflBrowserRoutingRegression";
    result.dataset.status = status;
    result.textContent = detail;
    document.body.appendChild(result);
  };

  async function run() {
    try {
      const runPageTransition = window.__mflRunPageTransition;
      const transitionIsCurrent = window.__mflNavigationTransitionIsCurrent;
      const timeline = window.__mflClientPerformance;
      assert(typeof runPageTransition === "function", "Canonical page transition runner is unavailable.");
      assert(typeof transitionIsCurrent === "function", "Canonical transition identity check is unavailable.");
      assert(timeline && typeof timeline.snapshot === "function", "Client performance timeline is unavailable.");

      await delay(80);
      const baselineSequence = timeline.snapshot().at(-1)?.sequence || 0;
      let staleCommitted = false;

      const staleTransition = runPageTransition("changelog", true, {}, async (transition) => {
        await delay(180);
        if (transitionIsCurrent(transition)) {
          staleCommitted = true;
          document.documentElement.dataset.browserRouteCommit = "changelog";
        }
        return "stale";
      });

      await delay(60);
      const currentTransition = runPageTransition("privacy", true, {}, async (transition) => {
        assert(transitionIsCurrent(transition), "Latest transition was stale before its authoritative commit.");
        document.documentElement.dataset.browserRouteCommit = "privacy";
        return "current";
      });

      const [staleResult, currentResult] = await Promise.all([staleTransition, currentTransition]);
      await delay(100);

      assert(staleResult === null, "Superseded transition did not resolve as stale.");
      assert(currentResult === "current", "Latest transition did not complete normally.");
      assert(staleCommitted === false, "Superseded transition committed after a newer route won.");
      assert(window.location.pathname === "/privacy", `Expected /privacy, got ${window.location.pathname}.`);
      assert(document.documentElement.dataset.browserRouteCommit === "privacy", "Latest route content did not remain authoritative.");

      const recentEntries = timeline.snapshot().filter((entry) => entry.sequence > baselineSequence);
      const phases = recentEntries.map((entry) => entry.phase);
      const startIndex = phases.lastIndexOf("route-transition-start");
      const commitIndex = phases.indexOf("content-commit", startIndex + 1);
      const completeIndex = phases.indexOf("route-transition-complete", commitIndex + 1);
      const settledIndex = phases.indexOf("route-visually-settled", completeIndex + 1);
      assert(startIndex >= 0, "Latest route transition start timing is missing.");
      assert(commitIndex > startIndex, "SPA content commit timing is missing after transition start.");
      assert(completeIndex > commitIndex, "Route completion timing must follow content commit.");
      assert(settledIndex > completeIndex, "Visually-settled timing must follow route completion.");
      assert(recentEntries[commitIndex]?.detail?.source === "navigation-release", "SPA content commit has the wrong canonical source.");
      assert(errors.length === 0, `Console/runtime errors occurred: ${errors.join(" | ")}`);

      finish("passed", `stale-result=null; current-result=current; phases=${phases.join(",")}`);
    } catch (error) {
      finish("failed", String(error?.stack || error));
    }
  }

  if (document.documentElement.dataset.mflReady === "true") {
    queueMicrotask(run);
  } else {
    window.addEventListener("mfl:ready", () => void run(), { once: true });
  }
})();`;

function browserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { stdio: "ignore" });
    if (!probe.error && probe.status === 0) return candidate;
  }
  throw new Error("Browser routing regression requires Chrome or Chromium on PATH.");
}

function contentType(pathname) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
  })[extname(pathname).toLowerCase()] || "application/octet-stream";
}

function writeJson(response, data) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function dataStub(url) {
  const mode = String(url.searchParams.get("mode") || "bootstrap");
  if (mode === "bootstrap") {
    return {
      manifest: {
        generated_at: generatedAt,
        row_count: 1,
        wallet_count: 1,
        source: "browser-regression",
        columns: publicColumns,
        progression_columns: [],
        search_player_columns: searchColumns,
      },
      summary: { playerCount: 1, walletCount: 1, generatedAt },
      players: { columns: searchColumns, rows: [] },
      agents: { columns: ["wallet_address", "wallet_name", "player_count"], rows: [] },
      clubs: [],
      searchMode: "sqlite-runtime",
    };
  }
  if (mode === "search") {
    return {
      players: { columns: searchColumns, rows: [] },
      agents: { columns: ["wallet_address", "wallet_name", "player_count"], rows: [] },
      clubs: [],
    };
  }
  if (mode === "page") {
    return {
      columns: publicColumns,
      rows: [],
      page: 1,
      pageSize: 100,
      totalRows: 0,
      sourceRows: 0,
      generatedAt,
    };
  }
  return {};
}

async function responseForStaticPath(pathname) {
  const routePath = pathname === "/" || !extname(pathname) ? "/index.html" : pathname;
  const candidate = resolve(siteDirectory, `.${routePath}`);
  if (candidate !== siteDirectory && !candidate.startsWith(`${siteDirectory}${sep}`)) return null;
  try {
    return { path: candidate, content: await readFile(candidate) };
  } catch {
    return null;
  }
}

async function createRegressionServer() {
  const indexPath = resolve(siteDirectory, "index.html");
  const indexHtml = await readFile(indexPath, "utf8");
  const injectedIndexHtml = indexHtml.replace(
    "<head>",
    '<head>\n    <script src="/__browser-routing-test.js"></script>',
  );

  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/__browser-routing-test.js") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
      response.end(browserTestSource);
      return;
    }
    if (url.pathname === "/api/data") {
      writeJson(response, dataStub(url));
      return;
    }
    if (url.pathname === "/api/marketplace") {
      writeJson(response, { generatedAt, prices: {} });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      writeJson(response, {});
      return;
    }
    if (!extname(url.pathname)) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(injectedIndexHtml);
      return;
    }

    const asset = await responseForStaticPath(url.pathname);
    if (!asset) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": contentType(asset.path), "Cache-Control": "no-store" });
    response.end(asset.content);
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  return server;
}

function runChrome(executable, url) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=8000",
      "--dump-dom",
      url,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error("Headless browser regression timed out."));
    }, 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

const server = await createRegressionServer();
try {
  const address = server.address();
  assert(address && typeof address === "object", "Browser regression server did not expose a TCP address.");
  const executable = browserExecutable();
  const url = `http://127.0.0.1:${address.port}/privacy?browser-regression=1`;
  const result = await runChrome(executable, url);
  assert.equal(result.code, 0, `Headless browser exited with ${result.code}: ${result.stderr.slice(-2000)}`);
  assert.match(
    result.stdout,
    /id="mflBrowserRoutingRegression" data-status="passed"/,
    `Browser routing regression failed or did not finish.\n${result.stdout.slice(-4000)}\n${result.stderr.slice(-2000)}`,
  );
  console.log("Browser routing regression passed: rapid stale navigation cannot win, SPA timing order is canonical, and no application console/runtime errors were observed.");
} finally {
  await new Promise((resolvePromise) => server.close(resolvePromise));
}
