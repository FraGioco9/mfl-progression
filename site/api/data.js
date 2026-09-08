const { performance } = require("node:perf_hooks");
const {
  signedWalletFromRequest,
  walletAllowed,
  sendJson,
} = require("./_data-auth");
const { pagedData } = require("./_data-page");
const {
  bootstrapData,
  searchData,
  summaryData,
  mflStatsData,
} = require("./_data-views");
const { filterOptionsData } = require("./_filter-options");
const { databaseStatsData } = require("./_database-stats");
const { mflStatsSummaryData } = require("./_mfl-stats-summary");

module.exports = async function handler(request, response) {
  const startedAt = performance.now();
  const timings = {};
  if (request.method && request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Method not allowed." }, startedAt, timings);
    return;
  }

  try {
    const query = request.query || {};
    const mode = String(query.mode || "");
    const accessMode = String(query.access || "");
    const scope = String(query.scope || "").toLowerCase();
    const view = String(query.view || "").toLowerCase();
    const playerEntityProgression = scope === "player";
    const publicEntityProgression = playerEntityProgression
      || (["agent", "club"].includes(scope) && ["current", "all"].includes(view));
    const publicWatchlistProgression = scope === "watchlist"
      && ["current", "all"].includes(view);

    const authStartedAt = performance.now();
    const signedWallet = await signedWalletFromRequest(request);
    timings.auth = performance.now() - authStartedAt;

    let permissionAllowed = false;
    if (
      accessMode === "full-progression"
      && Boolean(signedWallet)
      && !publicEntityProgression
      && !publicWatchlistProgression
    ) {
      const permissionStartedAt = performance.now();
      permissionAllowed = await walletAllowed(signedWallet);
      timings.permission = performance.now() - permissionStartedAt;
    }

    const fullAccess = publicEntityProgression || publicWatchlistProgression || permissionAllowed;
    const ownedProgression = accessMode === "owned-progression" && Boolean(signedWallet);
    const pageRequest = mode === "page" && playerEntityProgression
      ? { ...request, query: { ...query, includeProgression: "1" } }
      : request;

    const queryStartedAt = performance.now();
    let data;
    if (mode === "bootstrap") data = bootstrapData();
    else if (mode === "page") data = await pagedData(pageRequest, signedWallet, fullAccess, ownedProgression);
    else if (mode === "search") data = searchData(request);
    else if (mode === "summary") data = summaryData();
    else if (mode === "filter-options") data = filterOptionsData();
    else if (mode === "database-stats") data = databaseStatsData();
    else if (mode === "mfl-stats-summary") data = mflStatsSummaryData();
    else if (mode === "mfl-stats") data = mflStatsData(request, false);
    else if (mode === "mfl-stats-all") data = mflStatsData(request, true);
    else {
      timings.query = performance.now() - queryStartedAt;
      sendJson(response, 400, { error: "Invalid database request." }, startedAt, timings);
      return;
    }
    timings.query = performance.now() - queryStartedAt;

    sendJson(response, 200, data, startedAt, timings);
  } catch (error) {
    console.error("Could not query MFL database.", error);
    sendJson(
      response,
      500,
      { error: `Could not query database: ${error?.message || "Unknown database error."}` },
      startedAt,
      timings,
    );
  }
};
