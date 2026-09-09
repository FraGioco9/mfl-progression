function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function normalizeSettingsDateFormat(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized === "MDY" || normalized === "MM/DD/YYYY" ? "MDY" : "DMY";
}

function dateFormatLabel(value = state.settingsDateFormat) {
  return normalizeSettingsDateFormat(value) === "MDY" ? "MM/DD/YYYY" : "DD/MM/YYYY";
}

function normalizeSettingsTimeFormat(value) {
  return String(value || "").trim().toLowerCase() === "12h" ? "12h" : "24h";
}

function formatOwnedSinceTime(date) {
  if (normalizeSettingsTimeFormat(state.settingsTimeFormat) === "12h") {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const suffix = hours >= 12 ? "PM" : "AM";
    hours %= 12;
    if (hours === 0) {
      hours = 12;
    }
    return `${hours}:${minutes} ${suffix}`;
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseEpochMillis(value) {
  if (value === null || value === undefined || value === "" || String(value).toUpperCase() === "NULL") {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number < 100000000000 ? number * 1000 : number;
}

function formatOwnedSinceDate(row) {
  const timestamp = parseEpochMillis(getValue(row, joinedAgencyColumn));
  if (timestamp === null) {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const dateText = normalizeSettingsDateFormat(state.settingsDateFormat) === "MDY"
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
  return `${dateText} ${formatOwnedSinceTime(date)}`;
}

function joinedAgencyTooltip(row) {
  const date = formatOwnedSinceDate(row);
  return date ? `Since ${date}` : "";
}


function parseFilterDateDay(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
  ) {
    return null;
  }
  return Math.floor(Date.UTC(year, month, day) / 86400000);
}

function filterDateEpochBounds(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const start = new Date(year, month, day, 0, 0, 0, 0);
  if (
    Number.isNaN(start.getTime())
    || start.getFullYear() !== year
    || start.getMonth() !== month
    || start.getDate() !== day
  ) {
    return null;
  }
  const nextDay = new Date(year, month, day + 1, 0, 0, 0, 0);
  return {
    startEpochSeconds: Math.floor(start.getTime() / 1000),
    nextDayStartEpochSeconds: Math.floor(nextDay.getTime() / 1000),
  };
}

function serializeFilterRulesForRequest(rules) {
  return rules.map((rule) => {
    if (rule?.column !== joinedAgencyColumn) {
      return rule;
    }

    const fromBounds = filterDateEpochBounds(rule.value);
    const toBounds = rule.operator === "during"
      ? filterDateEpochBounds(rule.valueTo)
      : null;
    return {
      ...rule,
      ...(fromBounds ? {
        valueDayStartEpochSeconds: fromBounds.startEpochSeconds,
        valueNextDayStartEpochSeconds: fromBounds.nextDayStartEpochSeconds,
      } : {}),
      ...(toBounds ? {
        valueToDayStartEpochSeconds: toBounds.startEpochSeconds,
        valueToNextDayStartEpochSeconds: toBounds.nextDayStartEpochSeconds,
      } : {}),
    };
  });
}

function ownedSinceDay(row) {
  const timestamp = parseEpochMillis(getValue(row, joinedAgencyColumn));
  if (timestamp === null) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? null
    : Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}













function rebuildColumnIndexMap() {
  const map = Object.create(null);
  state.columns.forEach((column, index) => {
    map[column] = index;
  });
  state.columnIndexMap = map;
}

function columnIndex(column) {
  if (!state.columnIndexMap) {
    rebuildColumnIndexMap();
  }

  const index = state.columnIndexMap[column];
  return Number.isInteger(index) ? index : -1;
}

function getValue(row, column) {
  const index = columnIndex(column);
  return index >= 0 ? row[index] : null;
}

function getProgressionColumn(statColumn) {
  const suffix = views[state.view].progressionSuffix;
  return suffix ? `${statColumn}_${suffix}` : null;
}

function formatPlainValue(value, column) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  if (column === "player_id") {
    return String(value);
  }

  if (typeof value === "number") {
    return formatCount(value);
  }

  return String(value);
}



function formatNationality(value) {
  const text = formatPlainValue(value, "nationality");

  if (text === "NULL") {
    return text;
  }

  return text
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
const contractDivisionNames = {
  1: "Diamond",
  2: "Platinum",
  3: "Gold",
  4: "Silver",
  5: "Bronze",
  6: "Iron",
  7: "Stone",
  8: "Ice",
  9: "Spark",
  10: "Flint",
};

const contractDivisionColors = {
  1: "#3be9f8",
  2: "#13d389",
  3: "#ffd23e",
  4: "#dbe4eb",
  5: "#fd7a00",
  6: "#865e3f",
  7: "#b7b09c",
  8: "#b0cce1",
  9: "#ffb136",
  10: "#757061",
};

function contractDivisionInfo(value) {
  const division = Number(value);

  if (!Number.isFinite(division) || !contractDivisionNames[division]) {
    return null;
  }

  return {
    name: contractDivisionNames[division],
    color: contractDivisionColors[division],
  };
}

function isBlankValue(value) {
  return value === null || value === undefined || value === "" || String(value).toUpperCase() === "NULL";
}

function isDevelopmentCenterClubName(value) {
  return String(value || "").trim().toLowerCase() === "development center";
}

function rowHasActiveContract(row) {
  const clubName = getValue(row, "active_contract_club_name");
  if (isDevelopmentCenterClubName(clubName)) {
    return false;
  }

  return !isBlankValue(clubName) || !isBlankValue(getValue(row, "active_contract_club_id"));
}

function formatContractRevenueShare(value) {
  if (isBlankValue(value)) {
    return "";
  }

  const percentage = Number(value) / 100;

  if (!Number.isFinite(percentage)) {
    return "";
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(percentage)}%`;
}



function formatContractClubName(row) {
  const clubName = getValue(row, "active_contract_club_name");
  return isBlankValue(clubName) ? "Free Agent" : String(clubName);
}

function formatContractDivision(value) {
  const division = contractDivisionInfo(value);
  return division ? division.name : "";
}

function contractDivisionSortValue(value) {
  const division = Number(value);
  return Number.isFinite(division) && contractDivisionNames[division] ? division : null;
}

function formatStatValue(row, statColumn) {
  const value = getValue(row, statColumn);
  const progressionColumn = getProgressionColumn(statColumn);

  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  if (!progressionColumn) {
    return String(value);
  }

  const progression = Number(getValue(row, progressionColumn) || 0);

  if (progression === 0) {
    return String(value);
  }

  const sign = progression > 0 ? "+" : "";
  return `${value} (${sign}${progression})`;
}

function hasColumn(column) {
  return columnIndex(column) >= 0;
}



function clearRowSortCache() {
  state.rowSortCache = new WeakMap();
}



function formatCellValue(row, column) {
  if (column === linkColumn) {
    return `https://app.playmfl.com/players/${getValue(row, "player_id")}`;
  }

  if (column === flagColumn) {
    return "";
  }

  if (column === "nationality") {
    return formatNationality(getValue(row, column));
  }

  if (column === "active_contract_revenue_share") {
    return rowHasActiveContract(row) ? formatContractRevenueShare(getValue(row, column)) : "";
  }

  if (column === "active_contract_club_name") {
    return formatContractClubName(row);
  }

  if (column === "active_contract_club_division") {
    return rowHasActiveContract(row) ? formatContractDivision(getValue(row, column)) : "";
  }

  if (statColumns.includes(column)) {
    return formatStatValue(row, column);
  }

  if (column === joinedAgencyColumn) {
    return formatOwnedSinceDate(row) || "NULL";
  }

  if (column === agentColumn) {
    const walletName = getValue(row, agentColumn);

    if (walletName === null || walletName === undefined || walletName === "" || String(walletName).toUpperCase() === "NULL") {
      return formatPlainValue(getValue(row, "wallet_address"), "wallet_address");
    }
  }

  return formatPlainValue(getValue(row, column), column);
}

function retirementMarker(row) {
      const rawRetirementYears = getValue(row, "retirement_years");
      const retirementYears = rawRetirementYears === null
        || rawRetirementYears === undefined
        || String(rawRetirementYears).trim() === ""
        ? null
        : Number(rawRetirementYears);

  if (retirementYears === 0) {
    return {
      icon: "calendar-x-2",
      label: "Retired",
      status: "retired",
    };
  }

  if ([1, 2, 3].includes(retirementYears)) {
    return {
      icon: "calendar-clock",
      label: `${retirementYears} year${retirementYears === 1 ? "" : "s"} left`,
      status: `retiring-${retirementYears}`,
    };
  }

  return null;
}



function playerRoute(playerId) {
  return `/players/${encodeURIComponent(playerId)}`;
}

function agentRoute(walletAddress) {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress).toLowerCase();
  if (normalizedWalletAddress === mflWalletAddress) {
    return pagePath("mfl", { view: preferredViewForPage("mfl") });
  }

  return normalizedWalletAddress ? pagePath("agents", { walletAddress: normalizedWalletAddress, view: "attributes" }) : "#";
}

function openAgentPage(walletAddress, agentName = "") {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress).toLowerCase();
  if (!normalizedWalletAddress) return;
  const knownName = [agentName, agentSearchResultByWallet(normalizedWalletAddress)?.name, savedAgentNameForWallet(normalizedWalletAddress)]
    .map(normalizedAgentName)
    .find((name) => name && name.toLowerCase() !== normalizedWalletAddress) || "";
  if (knownName) saveAgentNameForWallet(normalizedWalletAddress, knownName);
  removePlayerNoteTooltip();
  window.__mflStaticUiRuntime?.hideTooltips?.({ immediate: true });
  if (normalizedWalletAddress === normalizeWalletAddress(state.linkedWalletAddress).toLowerCase()) {
    setPage("myplayers", true);
    return;
  }
  if (normalizedWalletAddress === mflWalletAddress) {
    setPage("mfl", true);
    return;
  }
  setPage("agents", true, { walletAddress: normalizedWalletAddress, view: "attributes", agentName: knownName });
}

const listingPriceFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function listingPriceBadgeHtml(row) {
  const rawValue = getValue(row, "listing_price");
  const numericValue = rawValue === null || rawValue === undefined || rawValue === "" ? NaN : Number(rawValue);
  if (!Number.isFinite(numericValue)) return "";
  const priceText = `$${listingPriceFormatter.format(numericValue)}`;
  return `<span class="listingCellContent" aria-label="For Sale at ${escapeHtml(priceText)}"><img class="listingCellIcon" src="/listing-shopping-bag.svg" width="12" height="12" alt="" aria-hidden="true"><span class="listingCellPrice">${escapeHtml(priceText)}</span></span>`;
}

function rowByPlayerId(playerId) {
  const key = String(playerId);
  return state.rows.find((row) => String(getValue(row, "player_id")) === key) || null;
}

function playerSearchAgeDisplay(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const numericAge = Number(value);
  return Number.isFinite(numericAge) ? formatPlainValue(numericAge, "age") : "";
}

function buildPlayerSearchEntryFromRow(row) {
  const playerId = String(getValue(row, "player_id") ?? "");
  const nameDisplay = formatCellValue(row, "name");
  const nationalityRaw = getValue(row, "nationality");
  const nationalityDisplay = formatCellValue(row, "nationality");
  const positionsDisplay = formatCellValue(row, "positions");

  return {
    type: "player",
    row: [...row],
    columns: [...state.columns],
    playerId,
    id: normalizeSearchText(playerId),
    name: normalizeSearchText(nameDisplay),
    nameDisplay,
    ageDisplay: playerSearchAgeDisplay(getValue(row, "age")),
    nationalityRaw,
    nationalityDisplay,
    positionsDisplay,
    overall: Number(statDisplayValue(row, "overall") || 0),
    retired: getValue(row, "retirement_years") === 0,
  };
}

function compactSearchValue(row, columns, column) {
  const index = columns.indexOf(column);
  return index >= 0 ? row[index] : null;
}

function buildPlayerSearchEntryFromCompactRow(row, columns) {
  const playerId = String(compactSearchValue(row, columns, "player_id") ?? "");
  const nameDisplay = String(compactSearchValue(row, columns, "name") || "NULL");
  const nationalityRaw = compactSearchValue(row, columns, "nationality");
  const nationalityDisplay = formatNationality(nationalityRaw);
  const positionsDisplay = String(compactSearchValue(row, columns, "positions") || "NULL");

  return {
    type: "player",
    row: [...row],
    columns: [...columns],
    playerId,
    id: normalizeSearchText(playerId),
    name: normalizeSearchText(nameDisplay),
    nameDisplay,
    ageDisplay: playerSearchAgeDisplay(compactSearchValue(row, columns, "age")),
    nationalityRaw,
    nationalityDisplay,
    positionsDisplay,
    overall: Number(compactSearchValue(row, columns, "overall") || 0),
    retired: compactSearchValue(row, columns, "retirement_years") !== null
      && Number(compactSearchValue(row, columns, "retirement_years")) === 0,
  };
}

function playerSearchMetadataHtml(entry, playerId) {
  const metadata = [
    `OVR ${formatPlainValue(entry.overall, "overall")}`,
    entry.ageDisplay ? `${entry.ageDisplay} yo` : "",
    `#${playerId}`,
    entry.nationalityDisplay,
    entry.positionsDisplay,
  ].filter((value) => String(value || "").trim());
  return metadata.map((value) => escapeHtml(value)).join(" &middot; ");
}

function buildAgentSearchEntry(walletAddress, name, playerCount = 0) {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress).toLowerCase();
  if (!normalizedWalletAddress) {
    return null;
  }

  const agentName = normalizedAgentName(name) || normalizedWalletAddress;
  return {
    type: "agent",
    walletAddress: normalizedWalletAddress,
    name: agentName,
    nameText: normalizeSearchText(agentName),
    walletText: normalizeSearchText(normalizedWalletAddress),
    playerCount: Number(playerCount || 0),
  };
}

function buildSearchIndex(options = {}) {
  if (state.searchIndexesLoaded && state.searchIndex.length && !options.force) {
    return;
  }

  state.searchIndex = state.rows.map((row) => buildPlayerSearchEntryFromRow(row));
  if (!state.evaluationSearchIndex.length || options.force) {
    state.evaluationSearchIndex = [...state.searchIndex];
  }

  const agentsByWallet = new Map();
  const addAgent = (walletAddress, name) => {
    const entry = buildAgentSearchEntry(walletAddress, name);
    if (!entry || agentsByWallet.has(entry.walletAddress)) {
      return;
    }

    agentsByWallet.set(entry.walletAddress, entry);
    if (entry.name) saveAgentNameForWallet(entry.walletAddress, entry.name);
  };

  state.walletRows.forEach((wallet) => addAgent(wallet.wallet_address, wallet.wallet_name));
  state.rows.forEach((row) => addAgent(getValue(row, "wallet_address"), getValue(row, "wallet_name")));
  state.agentSearchIndex = Array.from(agentsByWallet.values());
  state.searchIndexesLoaded = true;
  if (state.currentPage === "agents" && tablePageTitle) {
      renderAgentPageTitle(state.currentAgentWalletAddress || agentWalletAddressFromUrl());
  }
}

const databaseSearchSequences = new Map();
const databaseSearchAbortControllers = new Map();
const databaseSearchResponseCache = new Map();
const DATABASE_SEARCH_RESPONSE_CACHE_LIMIT = 80;

function cacheDatabaseSearchResponse(key, payload) {
  databaseSearchResponseCache.delete(key);
  databaseSearchResponseCache.set(key, payload);
  while (databaseSearchResponseCache.size > DATABASE_SEARCH_RESPONSE_CACHE_LIMIT) {
    databaseSearchResponseCache.delete(databaseSearchResponseCache.keys().next().value);
  }
}

function databaseSearchIdentifiers() {
  const playerIds = new Set();
  const walletAddresses = new Set();
  const clubIds = new Set();
  (Array.isArray(state.recentSearchItems) ? state.recentSearchItems : []).forEach((item) => {
    const value = String(item || "");
    if (value.startsWith("player:")) playerIds.add(value.slice(7));
    else if (value.startsWith("agent:")) walletAddresses.add(value.slice(6));
    else if (value.startsWith("club:")) clubIds.add(value.slice(5));
  });
  (state.recentSearchPlayerIds || []).forEach((value) => playerIds.add(String(value || "")));
  (state.recentSearchAgentWallets || []).forEach((value) => walletAddresses.add(String(value || "")));
  (state.recentEvaluationPlayerIds || []).forEach((value) => playerIds.add(String(value || "")));
  return {
    playerIds: [...playerIds].filter(Boolean).slice(0, 20),
    walletAddresses: [...walletAddresses].filter(Boolean).slice(0, 20),
    clubIds: [...clubIds].filter(Boolean).slice(0, 20),
  };
}

function applyDatabaseSearchPayload(payload, type = "all") {
  const players = type === "players" ? payload : (payload?.players || { columns: [], rows: [] });
  const agents = type === "players" ? { columns: [], rows: [] } : (payload?.agents || { columns: [], rows: [] });
  const playerColumns = Array.isArray(players?.columns) ? players.columns : [];
  const agentColumns = Array.isArray(agents?.columns) ? agents.columns : [];
  const playerEntries = Array.isArray(players?.rows)
    ? players.rows.map((row) => buildPlayerSearchEntryFromCompactRow(row, playerColumns)).filter(Boolean)
    : [];
  if (type === "players") {
    state.evaluationSearchIndex = playerEntries;
  } else {
    state.searchIndex = playerEntries;
    state.agentSearchIndex = Array.isArray(agents?.rows)
      ? agents.rows.map((row) => buildAgentSearchEntry(
        compactSearchValue(row, agentColumns, "wallet_address"),
        compactSearchValue(row, agentColumns, "wallet_name"),
        compactSearchValue(row, agentColumns, "player_count"),
      )).filter(Boolean)
      : [];
    state.clubSearchIndex = (Array.isArray(payload?.clubs) ? payload.clubs : []).map((club) => ({
      clubId: String(club?.clubId || ""),
      name: String(club?.name || ""),
      division: Number.isFinite(Number(club?.division)) ? Number(club.division) : null,
      searchText: normalizeSearchText(`${club?.name || ""} ${club?.clubId || ""}`),
    })).filter((club) => club.clubId && club.name);
    state.walletRows = state.agentSearchIndex.map((entry) => ({
      wallet_address: entry.walletAddress,
      wallet_name: entry.name,
    }));
    state.walletNamesLoaded = true;
  }
  state.searchIndexesLoaded = true;
}

async function requestDatabaseSearch(rawQuery = "", type = "all", options = {}) {
  const query = String(rawQuery || "").trim();
  const normalizedQuery = normalizeSearchText(query);
  const sequence = (databaseSearchSequences.get(type) || 0) + 1;
  databaseSearchSequences.set(type, sequence);
  const cacheKey = `${type}:${normalizedQuery}`;
  if (options.force) databaseSearchResponseCache.delete(cacheKey);
  const cachedPayload = databaseSearchResponseCache.get(cacheKey);
  const activeInput = () => type === "players" ? evaluationSearchInput?.value : playerSearchInput?.value;

  databaseSearchAbortControllers.get(type)?.abort();
  if (cachedPayload) {
    if (normalizeSearchText(activeInput()) !== normalizedQuery) return false;
    applyDatabaseSearchPayload(cachedPayload, type);
    return true;
  }

  const controller = new AbortController();
  databaseSearchAbortControllers.set(type, controller);
  const parameters = new URLSearchParams({ mode: "search", type, limit: "20" });
  if (query) parameters.set("q", query);
  else {
    const recent = databaseSearchIdentifiers();
    parameters.set("type", "recent");
    if (recent.playerIds.length) parameters.set("playerIds", recent.playerIds.join(","));
    if (recent.walletAddresses.length) parameters.set("walletAddresses", recent.walletAddresses.join(","));
    if (recent.clubIds.length) parameters.set("clubIds", recent.clubIds.join(","));
  }

  try {
    const response = await window.__mflDataClient.fetch(`/api/data?${parameters}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not search the database.");
    if (sequence !== databaseSearchSequences.get(type) || normalizeSearchText(activeInput()) !== normalizedQuery) return false;
    const searchPayload = !query && type === "players" ? (payload?.players || {}) : payload;
    cacheDatabaseSearchResponse(cacheKey, searchPayload);
    applyDatabaseSearchPayload(searchPayload, type);
    return true;
  } catch (error) {
    if (error?.name === "AbortError") return false;
    throw error;
  } finally {
    if (databaseSearchAbortControllers.get(type) === controller) {
      databaseSearchAbortControllers.delete(type);
    }
  }
}

let globalSearchPrimePromise = null;

function primeGlobalSearchIndexes() {
  if (globalSearchPrimePromise) return globalSearchPrimePromise;
  databaseSearchResponseCache.delete("all:");
  const promise = requestDatabaseSearch("", "all")
    .then(() => true)
    .catch((error) => {
      console.error(error?.message || "Could not load recent database search results.");
      return false;
    });
  globalSearchPrimePromise = promise;
  window.__mflGlobalSearchReadyPromise = promise;
  void promise.then((loaded) => {
    if (!loaded && globalSearchPrimePromise === promise) globalSearchPrimePromise = null;
  });
  return promise;
}

async function ensureSearchIndexes() {
  return primeGlobalSearchIndexes();
}

const DEFAULT_EVALUATION_MFL_PER_USD = 400;
const EVALUATION_MFL_PER_USD_STORAGE_KEY = "mfl-evaluation-mfl-per-usd";
const DEFAULT_EVALUATION_LATE_SEASON_REWARD_RATES = [80, 80, 60];
const EVALUATION_LATE_SEASON_REWARD_RATES_STORAGE_KEY = "mfl-evaluation-late-season-reward-rates";


const evaluationTeamEarningsByOverall = {
  99: 1400000,
  98: 1200000,
  97: 1200000,
  96: 1000000,
  95: 1000000,
  94: 800000,
  93: 500000,
  92: 400000,
  91: 300000,
  90: 250000,
  89: 200000,
  88: 175000,
  87: 150000,
  86: 125000,
  85: 100000,
  84: 80000,
  83: 60000,
  82: 50000,
  81: 40000,
  80: 30000,
  79: 25000,
  78: 20000,
  77: 15000,
  76: 10000,
  75: 7500,
  74: 6000,
  73: 5000,
  72: 4000,
  71: 3000,
  70: 2700,
  69: 2400,
  68: 2200,
  67: 2000,
  66: 1800,
  65: 1600,
  64: 1400,
  63: 1000,
  62: 800,
  61: 650,
  60: 550,
  59: 550,
  58: 550,
  57: 550,
  56: 550,
  55: 550,
  54: 550,
  53: 550,
  52: 550,
  51: 550,
  50: 550,
  49: 0,
  48: 0,
  47: 0,
  46: 0,
  45: 0,
  44: 0,
  43: 0,
  42: 0,
  41: 0,
  40: 0,
  39: 0,
  38: 0,
  37: 0,
  36: 0,
  35: 0,
  34: 0,
  33: 0,
};




function evaluationDiscountFactor(rate, season) {
  return Number.isFinite(rate) ? 1 / Math.pow(1 + rate, season) : null;
}

function formatEvaluationNumber(value, decimals = 2) {
  return Number.isFinite(value) ? value.toFixed(decimals) : "";
}

function formatEvaluationCurrency(value) {
  return Number.isFinite(value) ? "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) : "";
}

function parseEvaluationMflPerUsd(value) {
  const parsedValue = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.round(parsedValue * 100) / 100 : null;
}



function saveEvaluationMflPerUsd(value) {
  state.evaluationMflPerUsd = value;

  try {
    if (value === DEFAULT_EVALUATION_MFL_PER_USD) {
      localStorage.removeItem(EVALUATION_MFL_PER_USD_STORAGE_KEY);
    } else {
      localStorage.setItem(EVALUATION_MFL_PER_USD_STORAGE_KEY, value.toFixed(2));
    }
  } catch {
    // Evaluation still recalculates for this page if the browser blocks storage.
  }
}

function commitEvaluationMflPerUsdValue(value) {
  const previousMflPerUsd = state.evaluationMflPerUsd;
  saveEvaluationMflPerUsd(value);
  state.evaluationMflPerUsdRevision += 1;
  if (state.currentPage === "evaluation" && state.evaluationMflPerUsd !== previousMflPerUsd) {
    void window.__mflEvaluationDiscountRateRuntime?.refresh?.();
  }
}

function loadEvaluationMflPerUsd() {
  try {
    const savedValue = parseEvaluationMflPerUsd(localStorage.getItem(EVALUATION_MFL_PER_USD_STORAGE_KEY));
    state.evaluationMflPerUsd = savedValue || DEFAULT_EVALUATION_MFL_PER_USD;
  } catch {
    state.evaluationMflPerUsd = DEFAULT_EVALUATION_MFL_PER_USD;
  }
}

function periodDecimalString(value) {
  return String(value ?? "").replace(/,/g, ".");
}

function parseEvaluationRewardRate(value) {
  const normalizedValue = periodDecimalString(value).trim();
  const parsedValue = Number.parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 100 ? Math.round(parsedValue * 100) / 100 : null;
}





function normalizeEvaluationLateSeasonRewardRates(value) {
  const source = Array.isArray(value) ? value : [];
  return DEFAULT_EVALUATION_LATE_SEASON_REWARD_RATES.map((defaultRate, index) => {
    const parsedRate = parseEvaluationRewardRate(source[index]);
    return parsedRate === null ? defaultRate : parsedRate;
  });
}



function saveEvaluationLateSeasonRewardRates(rates) {
  const normalizedRates = normalizeEvaluationLateSeasonRewardRates(rates);
  state.evaluationLateSeasonRewardRates = normalizedRates;

  try {
    if (normalizedRates.every((rate, index) => rate === DEFAULT_EVALUATION_LATE_SEASON_REWARD_RATES[index])) {
      localStorage.removeItem(EVALUATION_LATE_SEASON_REWARD_RATES_STORAGE_KEY);
    } else {
      localStorage.setItem(EVALUATION_LATE_SEASON_REWARD_RATES_STORAGE_KEY, JSON.stringify(normalizedRates));
    }
  } catch {
    // Evaluation still recalculates for this page if the browser blocks storage.
  }
}

function loadEvaluationLateSeasonRewardRates() {
  try {
    const savedRates = JSON.parse(localStorage.getItem(EVALUATION_LATE_SEASON_REWARD_RATES_STORAGE_KEY) || "null");
    state.evaluationLateSeasonRewardRates = normalizeEvaluationLateSeasonRewardRates(savedRates);
  } catch {
    state.evaluationLateSeasonRewardRates = [...DEFAULT_EVALUATION_LATE_SEASON_REWARD_RATES];
  }
}

function evaluationLateSeasonRewardRatesFromPayload(data) {
  return normalizeEvaluationLateSeasonRewardRates(
    data.lateSeasonRewardRates
      ?? data.late_season_reward_rates
      ?? data.lateCareerRewardRates
      ?? data.late_career_reward_rates
  );
}

function currentEvaluationSettingsPayload() {
  return {
    mflPerUsd: state.evaluationMflPerUsd || DEFAULT_EVALUATION_MFL_PER_USD,
    ignoreDiscountRate: Boolean(state.evaluationIgnoreDiscountRate),
    ignoreFirstSeason: Boolean(state.evaluationIgnoreFirstSeason),
    lateSeasonRewardRates: normalizeEvaluationLateSeasonRewardRates(state.evaluationLateSeasonRewardRates),
  };
}

function applyEvaluationSettingsPayload(settings = {}) {
  const data = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  const mflPerUsd = parseEvaluationMflPerUsd(data.mflPerUsd ?? data.mfl_per_usd);

  state.evaluationMflPerUsd = mflPerUsd || DEFAULT_EVALUATION_MFL_PER_USD;
  state.evaluationIgnoreDiscountRate = Boolean(data.ignoreDiscountRate ?? data.ignore_discount_rate);
  state.evaluationIgnoreFirstSeason = Boolean(data.ignoreFirstSeason ?? data.ignore_first_season);
  state.evaluationLateSeasonRewardRates = evaluationLateSeasonRewardRatesFromPayload(data);
}

function saveEvaluationSettingsLocally() {
  saveEvaluationMflPerUsd(state.evaluationMflPerUsd || DEFAULT_EVALUATION_MFL_PER_USD);
  saveEvaluationLateSeasonRewardRates(state.evaluationLateSeasonRewardRates);
}



function evaluationMflMultiplierForSeason(rowIndex, expectedSeasons, rates = state.evaluationLateSeasonRewardRates) {
  const seasonsFromEnd = expectedSeasons - rowIndex;
  const normalizedRates = normalizeEvaluationLateSeasonRewardRates(rates);

  if (seasonsFromEnd >= 1 && seasonsFromEnd <= 3) {
    return normalizedRates[3 - seasonsFromEnd] / 100;
  }

  return 1;
}

function evaluationMflValueForOverall(overall, position, rowIndex, expectedSeasons, rates = state.evaluationLateSeasonRewardRates) {
  const roundedOverall = Math.round(Number(overall));
  const positionValues = evaluationContractsTable[roundedOverall] || {};
  const contractValue = positionValues[position] || 0;
  return contractValue * evaluationMflMultiplierForSeason(rowIndex, expectedSeasons, rates);
}

function formatEvaluationMfl(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "";
}

function expectedEvaluationSeasons(row) {
  const playerId = Number(getValue(row, "player_id") || 0);
  const age = Number(getValue(row, "age"));
  const retirementYears = Number(getValue(row, "retirement_years"));

  if (Number.isFinite(retirementYears) && retirementYears > 0) {
    return retirementYears;
  }

  if (!Number.isFinite(age)) {
    return 0;
  }

  const averageRetirementAge = playerId <= 77848 ? 37 : 35;
  const yearsToAverageRetirement = averageRetirementAge - age;

  if (yearsToAverageRetirement <= 3) {
    return 4;
  }

  return Math.max(0, yearsToAverageRetirement);
}

function evaluationSearchMatches(query) {
  if (!query) {
    return [];
  }

  if (!state.evaluationSearchIndex.length && state.rows.length) {
    buildSearchIndex();
  }

  const results = [];

  state.evaluationSearchIndex.forEach((entry) => {
    if (entry.retired || (!entry.id.includes(query) && !entry.name.includes(query))) {
      return;
    }

    results.push(entry);
  });

  return results
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 5);
}

function recentEvaluationRows() {
  return state.recentEvaluationPlayerIds
    .map((playerId) => state.evaluationSearchIndex.find((entry) => String(entry.playerId) === String(playerId)) || null)
    .filter((entry) => entry && !entry.retired);
}

function rememberEvaluationResult(playerId) {
  const key = String(playerId);
  state.recentEvaluationPlayerIds = mergeRecentIdLists([key], state.recentEvaluationPlayerIds);
  persistRecentSearchStates();
  saveTableState();
}

function renderEmptyEvaluationSelection(showRecentResults = true, forcePlain = false) {
  const evaluationRouteParams = new URLSearchParams(window.location.search);
  const pendingEvaluationRoute = !forcePlain && window.location.pathname === "/evaluation" && Boolean(
    evaluationRouteParams.get("player") || evaluationRouteParams.get("saved") || evaluationRouteParams.get("share")
  );

  if (pendingEvaluationRoute) {
    evaluationSearchInput.placeholder = "";
    evaluationButtons.hidden = false;
    evaluationResetButton.hidden = false;
    if (evaluationLoadButton) {
      evaluationLoadButton.hidden = true;
    }
    evaluationPlayerPageButton.hidden = false;
    return;
  }

  evaluationSearchInput.placeholder = "Search ID or player name";
  evaluationPanel.hidden = true;
  evaluationSummaryBody.replaceChildren();
  evaluationTableBody.replaceChildren();
  evaluationButtons.hidden = !hasWalletOptIn();
  evaluationResetButton.hidden = true;
  if (evaluationLoadButton) {
    evaluationLoadButton.hidden = !hasWalletOptIn();
  }
  evaluationPlayerPageButton.hidden = true;
  evaluationOptionFilters.hidden = true;
  updateEvaluationFooterActions();

  if (showRecentResults) {
    renderEvaluationSearchResults();
  } else {
    evaluationSearchResults.hidden = true;
  }
}

function resetEvaluationSelection() {
  state.evaluationShareId = "";
  state.evaluationSavedId = "";
  updateEvaluationFooterActions();
  state.evaluationPlayerId = null;
  syncEvaluationPlayerUrl(null);
  renderEmptyEvaluationSelection(true);
}

function clearEvaluationSearchFocus() {
  evaluationSearchInput.blur();
  evaluationSearchResults.hidden = true;
  evaluationSearchResults.replaceChildren();
}

function syncEvaluationSearchClearButton() {
  evaluationSearchClearButton.hidden = !evaluationSearchInput.value.trim();
}

const EVALUATION_SEARCH_FAST_COLUMNS = Object.freeze([
  "player_id",
  "name",
  "overall",
  "age",
  "positions",
  "retirement_years",
]);

function evaluationSearchRoutePayload(entry) {
  const columns = Array.isArray(entry?.columns) ? entry.columns : [];
  const row = Array.isArray(entry?.row) ? entry.row : null;
  if (!row || !columns.length || !EVALUATION_SEARCH_FAST_COLUMNS.every((column) => columns.includes(column))) {
    return null;
  }

  const playerIdIndex = columns.indexOf("player_id");
  if (playerIdIndex < 0 || String(row[playerIdIndex] ?? "") !== String(entry?.playerId ?? "")) {
    return null;
  }

  return {
    columns: [...columns],
    rows: [[...row]],
    page: 1,
    pageSize: 1,
    totalRows: 1,
    sourceRows: 1,
    generatedAt: state.manifest?.generated_at || null,
  };
}

function renderEvaluationSearchEntryImmediately(entry, route) {
  if (!route) return false;
  const payload = evaluationSearchRoutePayload(entry);
  if (!payload) return false;

  const { requestKey, cacheKey } = incrementalRequestDetails(route, 1);
  state.incrementalPayloadCache.set(cacheKey, payload);
  applyIncrementalPayload(route, payload);
  state.incrementalLastKey = requestKey;
  state.incrementalLastLoadedAt = Date.now();

  const row = rowByPlayerId(entry.playerId);
  if (!row) return false;
  renderEvaluationTable(row);
  return true;
}

function renderEvaluationSearchResults(options = {}) {
  syncEvaluationSearchClearButton();
  const query = normalizeSearchText(evaluationSearchInput.value.trim());
  const releaseRecentLoading = options.releaseRecentLoading === true;

  if (query && window.__mflEvaluationSearchStateRuntime?.shouldShowTypedResults?.() === false) {
    evaluationSearchResults.hidden = true;
    return false;
  }

  const evaluationRecentLoadingOwned = evaluationSearchResults.dataset.mflEvaluationRecentLoading === "true"
    || window.__mflEvaluationSearchStateRuntime?.ownsEmptyRecentResults?.();
  if (!query && evaluationRecentLoadingOwned && !releaseRecentLoading) {
    return false;
  }

  if (!query && !shouldShowEvaluationRecentResults()) {
    evaluationSearchResults.replaceChildren();
    evaluationSearchResults.hidden = true;
    return true;
  }

  const results = query ? evaluationSearchMatches(query) : recentEvaluationRows();
  const resultEntries = results.map((entry) => {
    const playerId = String(entry.playerId);
    return {
      entry,
      playerId,
      metadataHtml: playerSearchMetadataHtml(entry, playerId),
    };
  });
  const renderSignature = JSON.stringify([
    query,
    resultEntries.map(({ entry, playerId, metadataHtml }) => [
      playerId,
      String(entry.nameDisplay || ""),
      metadataHtml,
    ]),
  ]);
  const reusableResults = evaluationSearchResults.dataset.mflEvaluationRenderSignature === renderSignature
    && evaluationSearchResults.children.length === resultEntries.length
    && resultEntries.every(({ playerId }, index) => {
      const child = evaluationSearchResults.children[index];
      return child instanceof HTMLButtonElement
        && child.classList.contains("evaluationSearchResult")
        && child.dataset.playerId === playerId;
    });

  if (reusableResults) {
    evaluationSearchResults.hidden = resultEntries.length === 0;
    return true;
  }

  const fragment = document.createDocumentFragment();

  resultEntries.forEach(({ entry, playerId, metadataHtml }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "evaluationSearchResult";
    button.dataset.playerId = playerId;
    button.innerHTML = `<strong>${escapeHtml(entry.nameDisplay)}</strong><span>${metadataHtml}</span>`;
    button.addEventListener("click", async () => {
      state.evaluationShareId = "";
      state.evaluationSavedId = "";
      state.evaluationPlayerId = playerId;
      rememberEvaluationResult(playerId);
      evaluationSearchInput.value = entry.nameDisplay;
      try {
        sessionStorage.setItem(`mfl-evaluation-first-paint-name-v2:player:${playerId}`, entry.nameDisplay);
      } catch {
        // Session storage is an optional first-paint cache only.
      }
      evaluationSearchResults.hidden = true;
      syncEvaluationPlayerUrl(playerId);
      try {
        const route = incrementalRouteTarget("evaluation", { playerId });
        if (renderEvaluationSearchEntryImmediately(entry, route)) return;
        const loadAndRender = async () => {
          const payload = await requestIncrementalRoute(route, 1);
          if (!payload) return false;
          const row = rowByPlayerId(playerId);
          if (row) {
            renderEvaluationTable(row);
          }
        };
        if (incrementalRouteIsCached(route, 1)) {
          await loadAndRender();
        } else {
          await withInteractionBusy(loadAndRender);
        }
      } catch (error) {
        showToast(error?.message || "Could not load this player.");
      }
    });
    fragment.appendChild(button);
  });
  evaluationSearchResults.replaceChildren(fragment);
  evaluationSearchResults.hidden = resultEntries.length === 0;
  evaluationSearchResults.dataset.mflEvaluationRenderSignature = renderSignature;
  return true;
}




function primeEmptyEvaluationSearch() {
  const prime = window.__mflEvaluationSearchStateRuntime?.restoreEmptyRecentResults;
  if (typeof prime !== "function") return Promise.resolve(false);

  // Recent players are search chrome, not Evaluation page readiness. During the
  // initial direct refresh, the first authoritative hydration already comes from
  // the startup ownership chain, so do not schedule a second Supabase refresh.
  const initialRefreshPending = isPlainEvaluationUrl()
    && document.documentElement.classList.contains("mflSingleRenderPending");
  void prime(false, true, false);
  if (!initialRefreshPending) {
    queueMicrotask(() => {
      if (!isPlainEvaluationUrl() || state.evaluationPlayerId) return;
      void prime(false, false, true);
    });
  }
  return Promise.resolve(false);
}

function waitForEvaluationDiscountRate() {
  if (document.documentElement.dataset.mflEvaluationRateSettled === "true") {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let timeout = 0;
    const finish = () => {
      window.removeEventListener("mfl:evaluation-rate-settled", finish);
      if (timeout) window.clearTimeout(timeout);
      resolve(document.documentElement.dataset.mflEvaluationRateSettled === "true");
    };
    window.addEventListener("mfl:evaluation-rate-settled", finish, { once: true });
    timeout = window.setTimeout(finish, 15_000);
  });
}

function waitForEvaluationLayout() {
  const fontsReady = document.fonts?.ready || Promise.resolve();
  return Promise.resolve(fontsReady).then(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function finishEvaluationReadiness() {
  const dependencies = [primeGlobalSearchIndexes(), waitForEvaluationDiscountRate()];
  await Promise.allSettled(dependencies);
  await waitForEvaluationLayout();
}

// Evaluation rendering is loaded with its route; shared search/navigation retain these entry points.
let __mflEvaluationRenderTableOwner = null;
let __mflEvaluationRenderPageOwner = null;

function renderEvaluationTable(row) {
  if (typeof __mflEvaluationRenderTableOwner === "function") {
    return __mflEvaluationRenderTableOwner(row);
  }
}

async function renderEvaluationPage() {
  if (typeof __mflEvaluationRenderPageOwner !== "function") {
    await window.__mflEnsureRouteCore?.("evaluation");
  }
  if (typeof __mflEvaluationRenderPageOwner !== "function") {
    throw new Error("Evaluation rendering core is unavailable.");
  }
  return __mflEvaluationRenderPageOwner();
}

function playerFirstPaintKnownValues(row) {
  const knownValues = {};
  if (!Array.isArray(row) || !Array.isArray(state.columns)) return knownValues;
  state.columns.forEach((column, index) => {
    if (!column || index >= row.length) return;
    const rawValue = row[index];
    if (rawValue === null || rawValue === undefined || rawValue === "") return;
    const rawType = typeof rawValue;
    const serializedRaw = rawType === "string" || rawType === "number" || rawType === "boolean" ? rawValue : String(rawValue);
    const display = String(formatCellValue(row, column) || serializedRaw).trim();
    knownValues[column] = { raw: serializedRaw, display };
  });
  return knownValues;
}

function playerFirstPaintSearchEntry(playerId) {
  const key = String(playerId || "").trim();
  return [...state.searchIndex, ...state.evaluationSearchIndex]
    .find((entry) => String(entry?.playerId || "").trim() === key) || null;
}

function playerFirstPaintNavigationContext(playerId) {
  const key = String(playerId || "").trim();
  const searchEntry = playerFirstPaintSearchEntry(key);
  const directRow = rowByPlayerId(key);
  const indexedRow = !directRow && Array.isArray(searchEntry?.row) && searchEntry.row.length === state.columns.length
    ? searchEntry.row
    : null;
  const row = directRow || indexedRow;
  const knownValues = playerFirstPaintKnownValues(row);
  const rememberKnown = (column, raw, display) => {
    if (knownValues[column] || raw === null || raw === undefined || raw === "") return;
    const text = String(display ?? raw).trim();
    if (!text) return;
    knownValues[column] = { raw, display: text };
  };
  const searchPositionsText = String(searchEntry?.positionsDisplay || "").trim();
  const searchPositions = searchPositionsText
    ? searchPositionsText.split(",").map((position) => position.trim()).filter(Boolean)
    : [];
  const searchOverall = Number(searchEntry?.overall || 0);
  if (searchEntry) {
    rememberKnown("name", searchEntry.nameDisplay || "", searchEntry.nameDisplay || "");
    rememberKnown("positions", searchPositionsText, searchPositionsText);
    rememberKnown("nationality", searchEntry.nationalityRaw ?? searchEntry.nationalityDisplay ?? "", searchEntry.nationalityDisplay || "");
    if (searchOverall > 0) rememberKnown("overall", searchOverall, formatPlainValue(searchOverall, "overall"));
  }

  const knownAgentName = String(knownValues.wallet_name?.display || "").trim();
  if (knownAgentName && !knownValues.wallet_address) {
    const normalizedName = normalizeSearchText(knownAgentName);
    const matches = state.agentSearchIndex.filter((entry) => normalizeSearchText(entry?.name || "") === normalizedName);
    if (matches.length === 1) rememberKnown("wallet_address", matches[0].walletAddress || "", matches[0].walletAddress || "");
  }

  const knownClubName = String(knownValues.active_contract_club_name?.display || "").trim();
  if (knownClubName && !knownValues.active_contract_club_id) {
    const normalizedName = normalizeSearchText(knownClubName);
    const matches = state.clubSearchIndex.filter((entry) => normalizeSearchText(entry?.name || "") === normalizedName);
    if (matches.length === 1) rememberKnown("active_contract_club_id", matches[0].clubId || "", matches[0].clubId || "");
  }
  return {
    playerId: key,
    name: row ? formatCellValue(row, "name") : String(searchEntry?.nameDisplay || "").trim(),
    positions: row ? playerPositions(row) : searchPositions,
    overall: row ? statDisplayValue(row, "overall") : (searchOverall > 0 ? formatPlainValue(searchOverall, "overall") : ""),
    externalUrl: row ? formatCellValue(row, linkColumn) : "",
    knownValues,
  };
}

window.__mflBuildPlayerFirstPaintContext = playerFirstPaintNavigationContext;

function openPlayerPage(playerId) {
  const pendingContext = playerFirstPaintNavigationContext(playerId);
  const key = pendingContext.playerId;
  window.__mflPlayerFirstPaintPendingContext = pendingContext;
  setPage("player", true, { playerId: key, __mflPlayerFirstPaintContext: pendingContext });
}

function removePlayerIdFromAllWatchlists(playerId) {
  const key = String(playerId);
  const removedFrom = [];

  state.watchlists.forEach((watchlist) => {
    const ids = normalizeWatchlistIdList(watchlist.playerIds);
    if (!ids.includes(key)) {
      return;
    }
    watchlist.playerIds = ids.filter((item) => String(item) !== key);
    removedFrom.push(watchlist);
  });

  if (removedFrom.some((watchlist) => watchlist.id === state.currentWatchlistId)) {
    state.watchlistPlayerIds.delete(key);
    syncActiveWatchlistFromSet();
  }

  return removedFrom;
}

function toggleWatchlistPlayer(playerId, rerender = false) {
  const key = String(playerId);
  const playerName = rowByPlayerId(key) ? formatCellValue(rowByPlayerId(key), "name") : `Player ${key}`;
  const inAnyWatchlist = playerIsInAnyWatchlist(key);

  if (inAnyWatchlist) {
    const removedFrom = removePlayerIdFromAllWatchlists(key);
    state.watchlistPlayerIdsAdded.delete(key);
    state.watchlistPlayerIdsRemoved.add(key);
    saveTableState();
    if (removedFrom.length === 1) {
      showWatchlistToast(`${playerName} removed from`, removedFrom[0].id, removedFrom[0].name);
    } else if (removedFrom.length > 1) {
      showGenericToast(`${playerName} removed from ${removedFrom.length} watchlists.`);
    }
  } else {
    const watchlists = normalizeWatchlists(state.watchlists, Array.from(state.watchlistPlayerIds));
    state.watchlists = watchlists;
    if (hasWalletOptIn() && watchlists.length > 1) {
      openWatchlistChoiceModal("add", [key]);
      return;
    }
    const target = activeWatchlist() || ensureDefaultWatchlist();
    const result = addPlayerIdsToWatchlist(target?.id || "", [key]);
    if (result.addedCount) {
      state.watchlistPlayerIdsAdded.add(key);
      state.watchlistPlayerIdsRemoved.delete(key);
      saveTableState();
      showWatchlistToast(`${playerName} added to`, target.id, target.name);
    }
    if (result.skippedCount) {
      showWatchlistFullToast();
      return;
    }
  }

  syncActiveWatchlistFromSet();

  if (state.currentPage === "watchlist") {
    applyFilters();
  } else if (rerender && tablePageKey()) {
    renderTable();
  }

  if (state.currentPage === "player") {
    renderPlayerPage(key);
  }
}




function countryCodeForNationality(nationality) {
  const countryCodes = {
    ALBANIA: "AL", ALGERIA: "DZ", ARGENTINA: "AR", AUSTRALIA: "AU", AUSTRIA: "AT",
    BELGIUM: "BE", BOSNIA_AND_HERZEGOVINA: "BA", BRAZIL: "BR", CAMEROON: "CM",
    CANADA: "CA", CAPE_VERDE_ISLANDS: "CV", CHILE: "CL", COLOMBIA: "CO", CONGO_DR: "CD",
    COSTA_RICA: "CR", COTE_D_IVOIRE: "CI", CROATIA: "HR", CURACAO: "CW", CZECH_REPUBLIC: "CZ",
    CZECHIA: "CZ", DENMARK: "DK", ECUADOR: "EC", EGYPT: "EG",
    ENGLAND: "1f3f4-e0067-e0062-e0065-e006e-e0067-e007f", FINLAND: "FI", FRANCE: "FR",
    GEORGIA: "GE", GERMANY: "DE", GHANA: "GH", HAITI: "HT", HUNGARY: "HU", IRAN: "IR",
    IRAQ: "IQ", ITALY: "IT", IVORY_COAST: "CI", JAPAN: "JP", JORDAN: "JO",
    KOREA_REPUBLIC: "KR", MEXICO: "MX", MOROCCO: "MA", NETHERLANDS: "NL", NEW_ZEALAND: "NZ",
    NIGERIA: "NG", NORWAY: "NO", PANAMA: "PA", PARAGUAY: "PY", PERU: "PE", POLAND: "PL",
    PORTUGAL: "PT", QATAR: "QA", REPUBLIC_OF_IRELAND: "IE", ROMANIA: "RO", RUSSIA: "RU",
    SAUDI_ARABIA: "SA", SCOTLAND: "1f3f4-e0067-e0062-e0073-e0063-e0074-e007f", SENEGAL: "SN",
    SERBIA: "RS", SLOVAKIA: "SK", SLOVENIA: "SI", SOUTH_AFRICA: "ZA", SOUTH_KOREA: "KR",
    SPAIN: "ES", SWEDEN: "SE", SWITZERLAND: "CH", TUNISIA: "TN", TURKEY: "TR", UKRAINE: "UA",
    UNITED_KINGDOM: "GB", UNITED_STATES: "US", UNITED_STATES_OF_AMERICA: "US", URUGUAY: "UY",
    USA: "US", UZBEKISTAN: "UZ", WALES: "1f3f4-e0067-e0062-e0077-e006c-e0073-e007f"
  };
  const countryKey = String(nationality || "")
    .toUpperCase()
    .replaceAll("&", "AND")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return countryCodes[countryKey] || null;
}

function countryFlagHtml(nationality) {
  const code = countryCodeForNationality(nationality);
  const label = escapeHtml(formatNationality(nationality));

  if (!code) {
    return `<span class="flagText" data-tooltip="${label}" aria-label="${label}">-</span>`;
  }

  const codepoints = code.includes("-")
    ? code
    : code
      .toUpperCase()
      .split("")
      .map((character) => (127397 + character.charCodeAt(0)).toString(16))
      .join("-");
  return `<img class="flagImage" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg" alt="" data-tooltip="${label}" aria-label="${label}">`;
}

function rarityColorForOverall(overall) {
  const value = Number(overall || 0);

  if (value >= 95) return "#00ffe9";
  if (value >= 85) return "#fa53ff";
  if (value >= 75) return "#0077ff";
  if (value >= 65) return "#71ff30";
  if (value >= 55) return "#ecd17f";
  return "#bebebe";
}

function playerPositionSet(row) {
  return new Set(playerPositions(row));
}

function familiarityForPosition(row, position) {
  const positions = playerPositions(row);
  const primary = positions[0];

  if (!primary) {
    return null;
  }

  if (position === primary) {
    return "primary";
  }

  if (positions.includes(position)) {
    return "secondary";
  }

  return POSITION_FAMILIARITY[primary]?.[position] || null;
}

function weightedPositionOverall(row, position, familiarity = "primary") {
  const weights = POSITION_GROUP_WEIGHTS[position];

  if (!weights || !familiarity) {
    return null;
  }

  const penalty = FAMILIARITY_PENALTIES[familiarity] || 0;
  const weighted = Object.entries(weights).reduce((total, [attribute, weight]) => {
    const raw = Number(getValue(row, attribute) || 0);
    return total + ((raw + penalty) * weight) / 100;
  }, 0);
  return Math.max(0, weighted);
}

function displayedPrimaryOverall(row) {
  const displayed = Number(statDisplayValue(row, "overall") || 0);
  const precise = Math.round(primaryPreciseOverall(row) * 100) / 100;
  const baseTarget = Math.floor(displayed) + 0.5;

  if (Math.floor(displayed) === Math.floor(precise) && Math.abs(precise - baseTarget) < 0.000001) {
    return Math.floor(displayed);
  }

  return Math.round(precise);
}

function positionRating(row, position, familiarity) {
  if (familiarity === "primary" && position === playerPositions(row)[0]) {
    return displayedPrimaryOverall(row);
  }

  const weighted = weightedPositionOverall(row, position, familiarity);
  return weighted === null ? null : Math.round(weighted);
}

function playerPositions(row) {
  return String(getValue(row, "positions") || "")
    .split(",")
    .map((position) => position.trim())
    .filter(Boolean);
}

function playerIsGoalkeeper(row) {
  return playerPositions(row)[0] === "GK";
}

function statDisplayValue(row, statColumn) {
  if (statColumn === "overall" && playerIsGoalkeeper(row)) {
    const goalkeeping = getValue(row, "goalkeeping");
    if (goalkeeping !== null && goalkeeping !== undefined && goalkeeping !== "") {
      return goalkeeping;
    }
  }
  return getValue(row, statColumn);
}

function progressionValue(row, statColumn, suffix) {
  return Number(getValue(row, `${statColumn}_${suffix}`) || 0);
}

function primaryPreciseOverall(row) {
  const primary = playerPositions(row)[0];

  if (!primary) {
    return Number(statDisplayValue(row, "overall") || 0);
  }

  const weighted = weightedPositionOverall(row, primary, "primary");
  return weighted === null ? Number(statDisplayValue(row, "overall") || 0) : weighted;
}

function nextOverallTarget(row) {
  const displayedOverall = Math.floor(Number(statDisplayValue(row, "overall") || 0));
  const target = displayedOverall + 0.5;
  const preciseOverall = Math.round(primaryPreciseOverall(row) * 100) / 100;

  return displayedOverall === Math.floor(preciseOverall) && Math.abs(preciseOverall - target) < 0.000001
    ? Math.round((target + 0.01) * 100) / 100
    : target;
}

function nextOverallGap(row) {
  return Math.max(0, nextOverallTarget(row) - primaryPreciseOverall(row));
}

function formatDecimal(value, digits = 2) {
  return Number(value || 0).toFixed(digits);
}

function formatRoundedUpDecimal(value, digits = 1) {
  const multiplier = 10 ** digits;
  return (Math.ceil((Number(value || 0) - Number.EPSILON) * multiplier) / multiplier).toFixed(digits);
}



function nextOverallColorClass(neededStatGain) {
  if (neededStatGain <= 1) return "easy";
  if (neededStatGain <= 2) return "medium";
  if (neededStatGain <= 3) return "hard";
  return "veryHard";
}

async function copyPlayerId(id) {
  try {
    await navigator.clipboard.writeText(String(id));
    const content = document.createElement("span");
    content.className = "toastPlayerIdContent";
    content.textContent = `Player ID ${id} copied.`;
    showToast(content);
  } catch {
    showToast("Could not copy player ID.");
  }
}
function renderPlayerPage(playerId) {
  const owner = window.__mflRenderPlayerPageOwner;
  if (typeof owner !== "function") {
    throw new Error("Player route core is not loaded.");
  }
  return owner(playerId);
}
function showModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.remove("modalClosing", "modalOpen");
  modal.hidden = false;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      modal.classList.add("modalOpen");
    });
  });
}

function hideModal(modal, afterClose) {
  if (!modal || modal.hidden) {
    if (typeof afterClose === "function") {
      afterClose();
    }
    return;
  }

  modal.classList.remove("modalOpen");
  modal.classList.add("modalClosing");
  window.setTimeout(() => {
    modal.hidden = true;
    modal.classList.remove("modalClosing");
    if (typeof afterClose === "function") {
      afterClose();
    }
  }, 180);
}

function setupBackdropClickClose(modal, closeCallback) {
  if (!modal || typeof closeCallback !== "function") {
    return;
  }

  let pointerStartedOnBackdrop = false;

  modal.addEventListener("pointerdown", (event) => {
    pointerStartedOnBackdrop = event.target === modal;
  });

  modal.addEventListener("click", (event) => {
    if (pointerStartedOnBackdrop && event.target === modal) {
      closeCallback();
    }

    pointerStartedOnBackdrop = false;
  });
}

async function openSearch() {
  showModal(searchModal);
  playerSearchInput.value = "";

  const renderAuthoritativeRecentSearches = async () => {
    const renderRecent = window.__mflGlobalSearchRuntime?.recent;
    if (typeof renderRecent !== "function") return false;
    return Boolean(await renderRecent());
  };

  void renderAuthoritativeRecentSearches().then((rendered) => {
    if (!rendered && !playerSearchInput.value.trim()) renderSearchResultsNow();
  });
  window.setTimeout(() => playerSearchInput.focus(), 0);
  await ensureSearchIndexes();
  if (!await renderAuthoritativeRecentSearches()) renderSearchResultsNow();
}

function closeSearch() {
  hideModal(searchModal);
}

function playerSearchResult(row) {
  return { type: "player", row };
}

function searchMatchScore(query, primaryText, secondaryText = "") {
  if (primaryText === query || secondaryText === query) {
    return 100;
  }

  if (primaryText.startsWith(query)) {
    return 80;
  }

  if (secondaryText.startsWith(query)) {
    return 70;
  }

  if (primaryText.includes(query)) {
    return 50;
  }

  if (secondaryText.includes(query)) {
    return 40;
  }

  return 0;
}

function bestSearchResults(query) {
  if ((!state.searchIndex.length && state.rows.length) || (!state.agentSearchIndex.length && (state.rows.length || state.walletRows.length))) {
    buildSearchIndex();
  }

  const relevanceSort = (a, b) => (
    b.score - a.score
    || b.overall - a.overall
    || String(a.label).localeCompare(String(b.label))
  );

  const playerResults = state.searchIndex
    .map((entry) => ({
      type: "player",
      entry,
      row: entry.row || null,
      score: Math.max(searchMatchScore(query, entry.name, entry.id), searchMatchScore(query, entry.id, entry.name)),
      overall: entry.overall,
      label: entry.nameDisplay,
    }))
    .filter((result) => result.score > 0)
    .sort(relevanceSort);

  const agentPlayerCounts = new Map();
  state.rows.forEach((row) => {
    const walletAddress = normalizeWalletAddress(getValue(row, "wallet_address")).toLowerCase();
    if (!walletAddress) return;
    agentPlayerCounts.set(walletAddress, (agentPlayerCounts.get(walletAddress) || 0) + 1);
  });

  const agentResults = state.agentSearchIndex
    .map((entry) => ({
      ...entry,
      score: Math.max(searchMatchScore(query, entry.nameText, entry.walletText), searchMatchScore(query, entry.walletText, entry.nameText)),
      playerCount: agentPlayerCounts.get(entry.walletAddress) || entry.playerCount || 0,
      overall: -1,
      label: entry.name,
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => (
      b.score - a.score
      || b.playerCount - a.playerCount
      || String(a.label).localeCompare(String(b.label))
    ));

  // Keep category priority while giving typed Global Search one shared ten-result budget.
  // The club-search enhancer will insert clubs between players and agents before applying
  // the same overall cap.
  return [...playerResults, ...agentResults].slice(0, 10);
}

function agentSearchResultByWallet(walletAddress) {
  if (!state.agentSearchIndex.length && (state.rows.length || state.walletRows.length)) {
    buildSearchIndex();
  }

  const normalizedWalletAddress = normalizeWalletAddress(walletAddress).toLowerCase();
  return state.agentSearchIndex.find((entry) => entry.walletAddress === normalizedWalletAddress) || null;
}

function recentSearchRows() {
  const items = state.recentSearchItems.length
    ? state.recentSearchItems
    : recentSearchItemsFromLegacy(state.recentSearchPlayerIds, state.recentSearchAgentWallets);

  return items.map((item) => {
    if (item.startsWith("club:")) {
      return null;
    }

    if (item.startsWith("agent:")) {
      return agentSearchResultByWallet(item.slice(6));
    }

    const playerId = item.startsWith("player:") ? item.slice(7) : item;
    const entry = state.searchIndex.find((searchEntry) => String(searchEntry.playerId) === String(playerId));
    if (entry) {
      return { type: "player", entry, row: entry.row || null };
    }
    const row = rowByPlayerId(playerId);
    return row ? playerSearchResult(row) : null;
  }).filter(Boolean);
}

function rememberSearchResult(playerId) {
  const key = String(playerId);
  state.recentSearchPlayerIds = mergeRecentIdLists([key], state.recentSearchPlayerIds);
  state.recentSearchItems = mergeRecentIdLists([recentPlayerKey(key)], state.recentSearchItems);
  persistRecentSearchStates();
  saveTableState();
}

function rememberAgentSearchResult(walletAddress) {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress).toLowerCase();
  if (!normalizedWalletAddress) {
    return;
  }

  state.recentSearchAgentWallets = mergeRecentIdLists([normalizedWalletAddress], state.recentSearchAgentWallets);
  state.recentSearchItems = mergeRecentIdLists([recentAgentKey(normalizedWalletAddress)], state.recentSearchItems);
  const result = agentSearchResultByWallet(normalizedWalletAddress);
  if (result?.name) saveAgentDisplayName(normalizedWalletAddress, result.name);
  persistRecentSearchStates();
  saveTableState();
}

function navigateFromSearch(callback) {
  closeSearch();
  window.requestAnimationFrame(() => callback());
}

function syncPlayerSearchClearButton() {
  playerSearchClearButton.hidden = !playerSearchInput.value.trim();
}

function clearPlayerSearch() {
  playerSearchInput.value = "";
  renderSearchResultsNow();
  playerSearchInput.focus();
}

function renderSearchResultsNow() {
  syncPlayerSearchClearButton();
  const query = normalizeSearchText(playerSearchInput.value.trim());
  const results = query ? bestSearchResults(query) : recentSearchRows();
  playerSearchResults.classList.add("filledSearchResults");

  if (!results.length) {
    if (query) return;
    playerSearchResults.classList.remove("filledSearchResults");
    playerSearchResults.innerHTML = '<div class="searchHint">Recent searches will appear here.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "searchResult";

    if (result.type === "agent") {
      button.dataset.searchKey = recentAgentKey(result.walletAddress);
      button.innerHTML = `<strong>${escapeHtml(result.name)}</strong><span>${escapeHtml(result.walletAddress)}</span>`;
      button.addEventListener("click", () => {
        rememberAgentSearchResult(result.walletAddress);
        navigateFromSearch(() => openAgentPage(result.walletAddress, result.name));
      });
      fragment.appendChild(button);
      return;
    }

    const row = result.row;
    const entry = result.entry || (row ? buildPlayerSearchEntryFromRow(row) : null);
    if (!entry) {
      return;
    }
    const id = String(entry.playerId);
    button.dataset.searchKey = recentPlayerKey(id);
    button.innerHTML = `<strong>${escapeHtml(entry.nameDisplay)}</strong><span>${playerSearchMetadataHtml(entry, id)}</span>`;
    button.addEventListener("click", () => {
      rememberSearchResult(id);
      navigateFromSearch(() => openPlayerPage(id));
    });
    fragment.appendChild(button);
  });
  playerSearchResults.replaceChildren(fragment);
}

function renderSearchResults() {
  syncPlayerSearchClearButton();
  const query = String(playerSearchInput.value || "").trim();
  renderSearchResultsNow();
  void (async () => {
    try {
      if (await requestDatabaseSearch(query, "all", { force: Boolean(query) })) renderSearchResultsNow();
    } catch (error) {
      console.error(error?.message || "Could not search the database.");
      renderSearchResultsNow();
    }
  })();
}

function linkedWalletAddressesForOwnedPlayers() {
  return new Set([state.linkedWalletAddress, state.linkedWalletProof?.signingAddress, state.linkedWalletProof?.address]
    .map((address) => normalizeWalletAddress(address).toLowerCase())
    .filter(Boolean));
}



function rowIsMflWalletPlayer(row) {
  const walletAddress = normalizeWalletAddress(getValue(row, "wallet_address")).toLowerCase();
  const walletName = normalizedAgentName(getValue(row, "wallet_name")).toLowerCase();
  return walletAddress === mflWalletAddress || walletName === "mfl";
}

function rowHasHiddenMflJoinedAgencyDate(row) {
  if (state?.currentPage === "club" || /^\/(?:clubs|club)\/[^/]+(?:\/|$)/i.test(window.location.pathname)) return false;
  if (!rowIsMflWalletPlayer(row)) {
    return false;
  }

  const joinedDay = ownedSinceDay(row);
  return joinedDay !== null && [parseFilterDateDay("2025-10-09"), parseFilterDateDay("2025-10-10")].includes(joinedDay);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}


function mflChunkFromPublicData(chunk) {
  const columns = Array.isArray(chunk?.columns) ? chunk.columns : [];
  const rows = Array.isArray(chunk?.rows) ? chunk.rows : [];
  const walletAddressIndex = columns.indexOf("wallet_address");
  const walletNameIndex = columns.indexOf("wallet_name");
  if (walletAddressIndex < 0 && walletNameIndex < 0) {
    return { columns, rows: [] };
  }

  return {
    columns,
    rows: rows.filter((row) => {
      const walletAddress = walletAddressIndex >= 0 ? normalizeWalletAddress(row[walletAddressIndex]).toLowerCase() : "";
      const walletName = walletNameIndex >= 0 ? normalizedAgentName(row[walletNameIndex]).toLowerCase() : "";
      return walletAddress === mflWalletAddress || walletName === "mfl";
    }),
  };
}

function progressionDataColumns(manifest) {
  return manifest?.files?.progression?.columns || [];
}

function clubRouteTargetFromPath() {
  const route = window.__mflAppConfig?.routes?.clubRoute?.(window.location.pathname);
  return route
    ? { scope: "club", clubId: route.clubId, view: route.view }
    : null;
}

function incrementalWatchlistPlayerIds(options = {}) {
  const watchlistId = String(options.watchlistId || watchlistIdFromUrl() || state.currentWatchlistId || "");
  const watchlist = normalizeWatchlists(state.watchlists, Array.from(state.watchlistPlayerIds))
    .find((candidate) => candidate.id === watchlistId);
  return normalizeWatchlistIdList(watchlist?.playerIds || Array.from(state.watchlistPlayerIds));
}

function incrementalRouteTarget(pageName, options = {}) {
  const clubTarget = options.ignoreCurrentClubRoute ? null : clubRouteTargetFromPath();
  if (pageName === "club") {
    const requestedClubId = String(options.clubId || clubTarget?.clubId || "").trim();
    if (!requestedClubId) return null;
    const requestedClubView = String(options.view || clubTarget?.view || "attributes").toLowerCase();
    const clubView = ["attributes", "contracts", "current", "all"].includes(requestedClubView)
      ? requestedClubView
      : "attributes";
    return {
      pageName: "club",
      scope: "club",
      clubId: requestedClubId,
      view: clubView,
      access: "public",
    };
  }

  const view = normalizeViewForPage(options.view || state.view || defaultViewForPage(pageName), pageName);
  const base = {
    pageName,
    view,
    access: currentDataAccess(pageName),
  };

  if (pageName === "database") return { ...base, scope: "database" };
  if (pageName === "progression") return { ...base, scope: "progression" };
  if (pageName === "mfl") return { ...base, scope: view === "stats" ? "mflstats" : "mfl" };
  if (pageName === "agents") {
    return {
      ...base,
      scope: "agent",
      walletAddress: normalizeWalletAddress(options.walletAddress || state.currentAgentWalletAddress || agentWalletAddressFromUrl()).toLowerCase(),
    };
  }
  if (pageName === "watchlist" && hasWalletOptIn()) {
    return {
      ...base,
      scope: "watchlist",
      watchlistId: options.watchlistId || watchlistIdFromUrl() || state.currentWatchlistId || "",
      playerIds: incrementalWatchlistPlayerIds(options),
    };
  }
  if (pageName === "myplayers" && hasWalletOptIn()) return { ...base, scope: "myplayers" };
  if (pageName === "player") {
    return {
      ...base,
      scope: "player",
      playerId: String(options.playerId || playerIdFromUrl() || ""),
      view: "attributes",
    };
  }
  if (pageName === "evaluation") {
    const playerId = String(options.playerId || state.evaluationPlayerId || evaluationPlayerIdFromUrl() || "");
    return playerId
      ? { ...base, scope: "evaluation", playerId, view: "attributes" }
      : { ...base, scope: "empty", view: "attributes" };
  }
  return null;
}

function incrementalDataQuery(route, page = 1) {
  const query = new URLSearchParams({
    mode: "page",
    scope: route.scope,
    view: route.view || "attributes",
    page: String(page),
    pageSize: String(["player", "evaluation"].includes(route.scope)
      ? 1
      : ["club", "mflstats"].includes(route.scope)
        ? 5000
        : state.pageSize),
    sortKey: route.scope === "club" ? "positions" : state.sortKey,
    sortDirection: route.scope === "club" ? "asc" : state.sortDirection,
  });

  if (route.access === "owned") query.set("access", "owned-progression");
  else if (route.access === "full") query.set("access", "full-progression");
  else query.set("access", "public-database");

  if (["current", "all"].includes(route.view)) query.set("includeProgression", "1");
  if (route.playerId) query.set("playerId", route.playerId);
  if (route.clubId) query.set("clubId", route.clubId);
  if (route.walletAddress) query.set("walletAddress", route.walletAddress);
  if (route.playerIds?.length) query.set("playerIds", route.playerIds.join(","));

  const tableRoute = ["database", "progression", "mfl", "agent", "watchlist", "myplayers"].includes(route.scope);
  if (tableRoute) {
    if (hideRetiredInput.checked) query.set("hideRetired", "1");
    if (hideRetiringInput.checked) query.set("hideRetiring", "1");
    if (hideMflPlayersInput?.checked) query.set("hideMfl", "1");
    if (packablePlayersInput?.checked) query.set("packableOnly", "1");
    if (newMintsInput.checked) query.set("newMintsOnly", "1");
    const rules = Array.isArray(route.filterRules) ? route.filterRules : readFilterRules();
    if (rules.length) query.set("filters", JSON.stringify(serializeFilterRulesForRequest(rules)));
  }

  return query;
}

function incrementalRequestDetails(route, page = 1) {
  const query = incrementalDataQuery(route, page);
  const requestKey = query.toString();
  const walletKey = normalizeWalletAddress(state.linkedWalletAddress).toLowerCase() || "guest";
  return {
    query,
    requestKey,
    cacheKey: `${walletKey}:${requestKey}`,
  };
}

const clubViewPayloadCache = new Map();

function clubViewPayloadCacheKey(route) {
  if (!route || route.scope !== "club" || !route.clubId || !route.view) return "";
  return String(route.clubId) + ":" + String(route.view);
}

function rememberClubViewPayload(route, payload) {
  const key = clubViewPayloadCacheKey(route);
  if (!key || !payload || !Array.isArray(payload.rows)) return;
  clubViewPayloadCache.set(key, {
    ...payload,
    columns: Array.isArray(payload.columns) ? [...payload.columns] : [],
    rows: [...payload.rows],
  });
}

function cachedClubViewPayload(route) {
  const key = clubViewPayloadCacheKey(route);
  return key ? clubViewPayloadCache.get(key) || null : null;
}

function cachedIncrementalPayload(route, page = 1) {
  if (!route || route.scope === "empty") {
    return null;
  }
  if (route.scope === "club") {
    const clubPayload = cachedClubViewPayload(route);
    if (clubPayload) return clubPayload;
  }
  return state.incrementalPayloadCache.get(incrementalRequestDetails(route, page).cacheKey) || null;
}

function incrementalRouteIsCached(route, page = 1) {
  return Boolean(cachedIncrementalPayload(route, page));
}

function databaseStatsDataCacheReady() {
  const total = document.getElementById("databaseStatsTotalPlayers");
  if (!(total instanceof HTMLElement)) return false;
  const value = String(total.textContent || "").trim();
  return Boolean(value) && value !== "-";
}

function settingsDataCacheReady() {
  return false;
}

function routeDataCacheReady(pageName, options = {}) {
  const page = String(pageName || "home");
  const routeOptions = options && typeof options === "object" && !Array.isArray(options) ? options : {};

  if (page === "home") return homeSummaryCacheReady();
  if (page === "notfound" || page === "changelog") return true;
  if (page === "settings") return settingsDataCacheReady();
  if (page === "database" && normalizeViewForPage(routeOptions.view, "database") === "stats") {
    return databaseStatsDataCacheReady();
  }

  const route = incrementalRouteTarget(page, routeOptions);
  if (!route) return false;
  return route.scope === "empty" || incrementalRouteIsCached(route, 1);
}

function currentRouteDataCacheReady() {
  if (!document.documentElement.classList.contains("mflInitialRouteResolved")) return false;
  const target = pageTargetFromPath(window.location.pathname + window.location.search);
  if (!target?.pageName) return false;
  return routeDataCacheReady(target.pageName, target.options || {});
}

Reflect.set(globalThis, "__mflRouteDataCache", Object.freeze({
  isReady: routeDataCacheReady,
  isCurrentRouteReady: currentRouteDataCacheReady,
}));

function applyIncrementalPayload(route, payload) {
  rememberClubViewPayload(route, payload);
  const tableRoute = ["database", "progression", "mfl", "agent", "watchlist", "myplayers", "club"].includes(route.scope);
  state.columns = Array.isArray(payload.columns) ? payload.columns : [];
  rebuildColumnIndexMap();
  state.rows = Array.isArray(payload.rows) ? payload.rows : [];
  state.filteredRows = [...state.rows];
  state.page = Number(payload.page || 1);
  if (tableRoute && !["club"].includes(route.scope)) {
    state.pageSize = Number(payload.pageSize || state.pageSize);
    pageSizeSelect.value = String(state.pageSize);
  }
  state.incrementalMode = tableRoute;
  state.incrementalRoute = { ...route };
  state.incrementalTotalRows = Number(payload.totalRows || 0);
  state.incrementalSourceRows = Number(payload.sourceRows || 0);
  state.tableSourceRowsCount = state.incrementalSourceRows;
  state.dataAccess = route.access;
  state.dataLoaded = true;
  window.__mflPlayerFirstPaintRuntime?.markDetailPayloadReady?.(route, payload);
  clearRowSortCache();
  if (payload.generatedAt) {
    updateStatusDate(payload.generatedAt);
  }
}

const ROUTE_REQUEST_TIMEOUT_MS = 60_000;
let incrementalRouteRequestGeneration = 0;
let activeIncrementalNetworkRequest = null;

function stopActiveIncrementalNetworkRequest() {
  const active = activeIncrementalNetworkRequest;
  if (!active) return;
  activeIncrementalNetworkRequest = null;
  if (!active.controller.signal.aborted) active.controller.abort();
  if (state.incrementalRequestPromises.get(active.cacheKey) === active.promise) {
    state.incrementalRequestPromises.delete(active.cacheKey);
  }
}

function invalidateIncrementalRouteRequest() {
  incrementalRouteRequestGeneration += 1;
  stopActiveIncrementalNetworkRequest();
  return incrementalRouteRequestGeneration;
}

function beginIncrementalRouteRequest(cacheKey, force = false) {
  const generation = ++incrementalRouteRequestGeneration;
  const active = activeIncrementalNetworkRequest;
  if (active && (force || active.cacheKey !== cacheKey)) {
    stopActiveIncrementalNetworkRequest();
  }
  return generation;
}

function incrementalRouteRequestIsCurrent(generation) {
  return generation === incrementalRouteRequestGeneration;
}

window.__mflCancelIncrementalRouteRequest = invalidateIncrementalRouteRequest;

async function requestIncrementalRoute(route, page = 1, options = {}) {
  const force = Boolean(options.force);
  const navigationTransition = options.__mflNavigationTransition || null;
  const navigationRequestIsCurrent = () => !navigationTransition || navigationTransitionIsCurrent(navigationTransition);

  if (route.scope === "empty") {
    const generation = beginIncrementalRouteRequest("empty", force);
    const payload = {
      columns: state.manifest?.files?.public?.columns || state.columns || [],
      rows: [],
      page: 1,
      pageSize: 1,
      totalRows: 0,
      sourceRows: 0,
      generatedAt: state.manifest?.generated_at || null,
    };
    if (!incrementalRouteRequestIsCurrent(generation) || !navigationRequestIsCurrent()) return null;
    applyIncrementalPayload(route, payload);
    state.incrementalMode = false;
    return payload;
  }

  const { requestKey, cacheKey } = incrementalRequestDetails(route, page);
  const generation = beginIncrementalRouteRequest(cacheKey, force);
  if (force) state.incrementalPayloadCache.delete(cacheKey);

  const cachedPayload = !force ? state.incrementalPayloadCache.get(cacheKey) : null;
  const inheritedTableLoadingRequestToken = Number(options.tableLoadingRequestToken || 0);
  const cachedPayloadSupersedesActiveRequest = Boolean(cachedPayload && window.__mflTableLoadingRuntime?.requestActive?.());
  const tableLoadingRequestToken = inheritedTableLoadingRequestToken
    || (!cachedPayload || cachedPayloadSupersedesActiveRequest
      ? window.__mflTableLoadingRuntime?.beginRequest?.(route.scope, { loadingMode: options.loadingMode })
      : 0)
    || 0;

  if (cachedPayload) {
    if (!incrementalRouteRequestIsCurrent(generation) || !navigationRequestIsCurrent()) {
      finishOwnedTableLoadingRequest();
      return null;
    }
    try {
      applyIncrementalPayload(route, cachedPayload);
      state.incrementalLastKey = requestKey;
      state.incrementalLastLoadedAt = Date.now();
      return cachedPayload;
    } finally {
      finishOwnedTableLoadingRequest();
    }
  }

  let requestPromise = force ? null : state.incrementalRequestPromises.get(cacheKey);
  if (!requestPromise) {
    const controller = new AbortController();
    let timedOut = false;
    let timeout = 0;
    let requestRecord = null;
    const networkPromise = (async () => {
      timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, ROUTE_REQUEST_TIMEOUT_MS);
      try {
        const response = await window.__mflDataClient.fetch("/api/data?" + requestKey, {
          cache: "no-store",
          headers: walletProofHeaders(true),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Could not load this page.");
        }
        if (controller.signal.aborted) return null;
        state.incrementalPayloadCache.set(cacheKey, payload);
        return payload;
      } catch (error) {
        if (error?.name === "AbortError" && !timedOut) return null;
        if (timedOut) throw new Error("Could not load this page.");
        throw error;
      } finally {
        if (timeout) window.clearTimeout(timeout);
      }
    })();

    requestPromise = networkPromise.finally(() => {
      if (state.incrementalRequestPromises.get(cacheKey) === requestPromise) {
        state.incrementalRequestPromises.delete(cacheKey);
      }
      if (activeIncrementalNetworkRequest === requestRecord) {
        activeIncrementalNetworkRequest = null;
      }
    });
    requestRecord = { cacheKey, controller, promise: requestPromise };
    activeIncrementalNetworkRequest = requestRecord;
    state.incrementalRequestPromises.set(cacheKey, requestPromise);
  }

  let payload;
  try {
    payload = await requestPromise;
  } catch (error) {
    finishOwnedTableLoadingRequest();
    if (!incrementalRouteRequestIsCurrent(generation)) return null;
    throw error;
  }
  if (!payload || !incrementalRouteRequestIsCurrent(generation) || !navigationRequestIsCurrent()) {
    finishOwnedTableLoadingRequest();
  }
  if (!payload || !incrementalRouteRequestIsCurrent(generation) || !navigationRequestIsCurrent()) return null;
  try {
    applyIncrementalPayload(route, payload);
    state.incrementalLastKey = requestKey;
    state.incrementalLastLoadedAt = Date.now();
    return payload;
  } finally {
    finishOwnedTableLoadingRequest();
  }

function finishOwnedTableLoadingRequest() {
  if (inheritedTableLoadingRequestToken === 0 && tableLoadingRequestToken !== 0) {
    window.__mflTableLoadingRuntime?.finishRequest?.(tableLoadingRequestToken);
  }
}
}

async function withInteractionBusy(callback) { return callback(); }

async function reloadIncrementalPage(page = state.page, options = {}) {
  const route = incrementalRouteTarget(state.currentPage, {
    view: state.view,
    walletAddress: state.currentAgentWalletAddress,
    watchlistId: state.currentWatchlistId,
  }) || state.incrementalRoute;
  if (!route) {
    return false;
  }

  state.page = page;
  const reloadLoadingRequestToken = (!incrementalRouteIsCached(route, page) || window.__mflTableLoadingRuntime?.requestActive?.())
    ? window.__mflTableLoadingRuntime?.beginRequest?.(route.scope, { loadingMode: options.loadingMode }) || 0
    : 0;

  const loadAndRender = async () => {
    try {
      const payload = await requestIncrementalRoute(route, page, {
        loadingMode: options.loadingMode,
        tableLoadingRequestToken: reloadLoadingRequestToken,
      });
      if (!payload) return false;
      state.incrementalApplying = true;
      try {
        buildHeader();
        applyFilters({ save: options.save !== false });
      } finally {
        state.incrementalApplying = false;
      }
      return true;
    } catch (error) {
      showToast(error?.message || "Could not load this page.");
      return false;
    } finally {
      window.__mflTableLoadingRuntime?.finishRequest?.(reloadLoadingRequestToken);
    }
  };

  if (incrementalRouteIsCached(route, page)) {
    return loadAndRender();
  }

  return withInteractionBusy(loadAndRender, options.loadingReason);
}
window.mflReloadIncrementalPage = reloadIncrementalPage;

let pendingViewButtonPointer = null;
let pointerCommittedViewButton = null;
let pointerCommittedViewButtonTimer = 0;

function activateViewButton(button) {
  if (!(button instanceof HTMLButtonElement) || button.disabled || button.hidden) return;
  const pageName = pageNameForViewButton(button);
  const viewName = button.dataset.view;
  if (!viewName) return;

  const activePageName = state.currentPage === "mflstats" ? "mfl" : state.currentPage;
  const activeViewName = state.currentPage === "mflstats" ? "stats" : state.view;
  if (pageName === activePageName && viewName === activeViewName) return;

  if (pageName === activePageName && tablePages.has(pageName)) {
    saveTableStateLocally(currentTableState());
  }

  if (pageName === "mfl" && viewName === "stats") {
    void runViewTransition("mfl", "stats", { statePageName: "mflstats" }, async () => {
      await setPage("mfl", false, { view: "stats", skipNavigationTransition: true, skipNavigationLoading: true });
    });
    return;
  }
  if (state.currentPage === "mflstats" && pageName === "mfl" && viewName === "attributes") {
    void runViewTransition("mfl", "attributes", { statePageName: "mfl" }, async () => {
      await setPage("mfl", false, { view: "attributes", skipNavigationTransition: true, skipNavigationLoading: true });
    });
    return;
  }
  if (pageName === "database" && viewName === "stats") {
    void runViewTransition("database", "stats", {}, async () => {
      await setPage("database", false, { view: "stats", skipNavigationTransition: true, skipNavigationLoading: true });
    });
    return;
  }
  if (state.currentPage === "database"
      && state.view === "stats"
      && pageName === "database"
      && (viewName === "attributes" || viewName === "contracts")) {
    void runViewTransition("database", viewName, { statePageName: "database" }, async () => {
      await setPage("database", false, {
        view: viewName,
        skipNavigationTransition: true,
        skipNavigationLoading: true,
      });
    });
    return;
  }
  if (pageName !== state.currentPage && tablePages.has(pageName)) {
    state.currentPage = pageName;
    document.body.dataset.page = pageName;
  }
  const clubTarget = pageName === "club" ? clubRouteTargetFromPath() : null;
  if (pageName === "club" && !clubTarget?.clubId) return;
  const clubPath = clubTarget?.clubId
    ? window.__mflAppConfig?.routes?.clubPath?.(clubTarget.clubId, viewName) || ""
    : "";
  void runViewTransition(pageName, viewName, {
    walletAddress: state.currentAgentWalletAddress,
    watchlistId: state.currentWatchlistId,
    ...(clubTarget?.clubId ? {
      clubId: clubTarget.clubId,
      path: clubPath,
    } : {}),
  }, async () => {
    await setView(viewName);
  });
}

function clearPointerCommittedViewButton() {
  pointerCommittedViewButton = null;
  if (pointerCommittedViewButtonTimer) window.clearTimeout(pointerCommittedViewButtonTimer);
  pointerCommittedViewButtonTimer = 0;
}

function commitViewButtonOnPointerRelease(button, event) {
  const pending = pendingViewButtonPointer;
  pendingViewButtonPointer = null;
  if (!pending || pending.button !== button || pending.pointerId !== event.pointerId) return;
  if (event.isPrimary === false || event.button !== 0) return;

  // Commit on the button's own pointerup. This restores the real-pointer path
  // without bringing back the former document-wide table-loading interceptor,
  // synthetic popstate, or click swallowing that could freeze the site.
  pointerCommittedViewButton = button;
  if (pointerCommittedViewButtonTimer) window.clearTimeout(pointerCommittedViewButtonTimer);
  pointerCommittedViewButtonTimer = window.setTimeout(clearPointerCommittedViewButton, 0);
  activateViewButton(button);
}

viewButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    if (event.isPrimary === false || event.button !== 0 || button.disabled || button.hidden) {
      pendingViewButtonPointer = null;
      return;
    }
    pendingViewButtonPointer = { button, pointerId: event.pointerId };
  });
  button.addEventListener("pointerup", (event) => commitViewButtonOnPointerRelease(button, event));
  button.addEventListener("pointercancel", () => {
    if (pendingViewButtonPointer?.button === button) pendingViewButtonPointer = null;
  });
  button.addEventListener("click", (event) => {
    if (pointerCommittedViewButton === button) {
      // A normal mouse click follows pointerup in the same task. The view has
      // already been committed once, so suppress only the duplicate default
      // activation; keyboard-generated clicks still use this handler.
      event.preventDefault();
      clearPointerCommittedViewButton();
      return;
    }
    activateViewButton(button);
  });
});

watchlistButton?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleWatchlistDropdown();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  } else if (event.key === "Escape" && !searchModal.hidden) {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && searchModal.contains(document.activeElement)) document.activeElement.blur();
  } else if (event.key === "Escape" && !filtersModal.hidden) {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && filtersModal.contains(document.activeElement)) document.activeElement.blur();
  } else if (event.key === "Escape" && !watchlistChoiceModal?.hidden) {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && watchlistChoiceModal.contains(document.activeElement)) document.activeElement.blur();
  } else if (event.key === "Escape" && !addWatchlistModal.hidden) {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && addWatchlistModal.contains(document.activeElement)) document.activeElement.blur();
  } else if (event.key === "Escape" && !deleteWatchlistModal.hidden) {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && deleteWatchlistModal.contains(document.activeElement)) document.activeElement.blur();
  } else if (event.key === "Escape" && !advancedSettingsModal.hidden) {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && advancedSettingsModal.contains(document.activeElement)) document.activeElement.blur();
  } else if (event.key === "Escape" && !watchlistDropdown?.hidden) {
    closeWatchlistDropdown();
  } else if (event.key === "Escape" && !accountDropdown.hidden) {
    closeAccountMenu();
  } else if (event.key === "Enter" && !addWatchlistModal.hidden) {
    event.preventDefault();
    confirmAddWatchlist();
  } else if (event.key === "Enter" && !deleteWatchlistModal.hidden) {
    event.preventDefault();
    confirmDeleteWatchlist();
  } else if (event.key === "Enter" && !filtersModal.hidden) {
    event.preventDefault();
    applyAdvancedFilters();
  } else if (event.key === "Enter" && !advancedSettingsModal.hidden && [advancedMflUsdInput, advancedThirdLastRewardInput, advancedSecondLastRewardInput, advancedFinalRewardInput].includes(document.activeElement)) {
    event.preventDefault();
    applyAdvancedSettings();
  }
});

let accountPointerStartedOutside = false;
let watchlistPointerStartedOutside = false;
let suppressWatchlistDropdownCloseOnce = false;

document.addEventListener("pointerdown", (event) => {
  accountPointerStartedOutside = !accountMenu.contains(event.target);
  watchlistPointerStartedOutside = !watchlistSwitcher?.contains(event.target);
});

document.addEventListener("click", (event) => {
  if (accountPointerStartedOutside && !accountDropdown.hidden && !accountMenu.contains(event.target)) {
    closeAccountMenu();
  }

  const watchlistModalOpen = (addWatchlistModal && !addWatchlistModal.hidden) || (deleteWatchlistModal && !deleteWatchlistModal.hidden);
  if (suppressWatchlistDropdownCloseOnce) {
    suppressWatchlistDropdownCloseOnce = false;
  } else if (!watchlistModalOpen && watchlistPointerStartedOutside && watchlistDropdown && !watchlistDropdown.hidden && !watchlistSwitcher?.contains(event.target)) {
    closeWatchlistDropdown();
  }

  accountPointerStartedOutside = false;
  watchlistPointerStartedOutside = false;
});

setupBackdropClickClose(searchModal, closeSearch);

setupBackdropClickClose(watchlistChoiceModal, closeWatchlistChoiceModal);
setupBackdropClickClose(addWatchlistModal, closeAddWatchlistModal);
setupBackdropClickClose(deleteWatchlistModal, closeDeleteWatchlistModal);


discardAddWatchlistButton?.addEventListener("click", closeAddWatchlistModal);
closeAddWatchlistButton?.addEventListener("click", closeAddWatchlistModal);
confirmAddWatchlistButton?.addEventListener("click", confirmAddWatchlist);
cancelDeleteWatchlistButton?.addEventListener("click", closeDeleteWatchlistModal);
closeDeleteWatchlistButton?.addEventListener("click", closeDeleteWatchlistModal);
confirmDeleteWatchlistButton?.addEventListener("click", confirmDeleteWatchlist);
closeWatchlistChoiceButton?.addEventListener("click", closeWatchlistChoiceModal);
addWatchlistFromChoiceButton?.addEventListener("click", () => openAddWatchlistModal(state.pendingWatchlistChoiceAction === "move" ? "move-selected" : "add-selected"));
addWatchlistNameInput?.addEventListener("input", () => {
  if (addWatchlistError) {
    addWatchlistError.hidden = true;
    addWatchlistError.textContent = "";
  }
  addWatchlistNameInput.removeAttribute("aria-invalid");
  if (addWatchlistNameInput.value.length > 20) {
    addWatchlistNameInput.value = addWatchlistNameInput.value.slice(0, 20);
  }
});


themeButton.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
  queueThemePreferenceCloudSync();
});

menuButton.addEventListener("click", toggleMenu);
brandLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setPage("home");
  });
});

document.querySelectorAll("a[data-page=\"changelog\"]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setPage("changelog");
  });
});
openSearchButton.addEventListener("click", openSearch);
closeSearchButton.addEventListener("click", closeSearch);
playerSearchClearButton.addEventListener("click", clearPlayerSearch);
window.addEventListener("storage", syncRecentSearchStateFromStorage);
playerSearchInput.addEventListener("input", renderSearchResults);
const setPageWithoutRouteLoading = setPage;

navButtons.forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    const pageName = button.dataset.page;
    const reuseCachedEvaluationRoute = pageName === "evaluation" && evaluationPageCacheReady;
    const options = tablePages.has(pageName)
      ? { view: preferredViewForPage(pageName) }
      : pageName === "evaluation"
        ? { plain: true, reuseCachedRoute: reuseCachedEvaluationRoute }
        : {};
    const target = pagePath(pageName, options);
    if (button.classList.contains("active") && target === `${location.pathname}${location.search}`) return;
    if (pageName === "evaluation") preparePlainEvaluationReentry();
    if (reuseCachedEvaluationRoute) {
      await setPageWithoutRouteLoading(pageName, true, options);
      return;
    }
    await setPage(pageName, true, options);
  });
});


window.addEventListener("scroll", () => hidePlayerNoteTooltip({ immediate: true }), true);
window.addEventListener("resize", () => hidePlayerNoteTooltip({ immediate: true }));

window.addEventListener("popstate", () => {
  const target = pageTargetFromPath(`${window.location.pathname}${window.location.search}`);
  setPage(target.pageName, false, { ...target.options, preserveScroll: true });
});

accountButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleAccountMenu();
});
accountEmail.addEventListener("click", () => {
  if (!state.linkedWalletAddress || !hasWalletProof()) {
    return;
  }
  closeAccountMenu();
  setPage("myplayers");
});
linkWalletButton.addEventListener("click", linkWallet);
if (accountSettingsButton) {
  accountSettingsButton.addEventListener("click", () => {
    accountDropdown.hidden = true;
    accountButton.setAttribute("aria-expanded", "false");
    setPage("settings");
  });
}
if (homeOptInButton) {
  homeOptInButton.addEventListener("click", linkWallet);
}
if (myPlayersOptInButton) {
  myPlayersOptInButton.addEventListener("click", linkWallet);
}


function setupChangelogSections() {
  const list = document.querySelector(".changelogList");
  if (!list || list.dataset.sectioned === "true") {
    return;
  }

  const items = Array.from(list.querySelectorAll(":scope > li"));
  if (!items.length) {
    return;
  }

  const groupedItems = [];
  const groupsByMinor = new Map();

  items.forEach((item) => {
    const versionText = item.querySelector("span")?.textContent?.trim() || "Version";
    const versionMatch = versionText.match(/^v(\d+)\.(\d+)(?:\.|$)/i);
    const minorVersion = versionMatch ? `v${versionMatch[1]}.${versionMatch[2]}` : versionText;
    let group = groupsByMinor.get(minorVersion);
    if (!group) {
      group = { minorVersion, items: [] };
      groupsByMinor.set(minorVersion, group);
      groupedItems.push(group);
    }
    group.items.push(item);
  });

  list.textContent = "";
  list.dataset.sectioned = "true";

  groupedItems.forEach((group, index) => {
    const section = document.createElement("li");
    section.className = "changelogMinorSection";

    const toggle = document.createElement("button");
    toggle.className = "changelogMinorToggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", index === 0 ? "true" : "false");

    const title = document.createElement("span");
    title.className = "changelogMinorVersion";
    title.textContent = group.minorVersion;

    const meta = document.createElement("span");
    meta.className = "changelogMinorMeta";
    meta.textContent = `${group.items.length} ${group.items.length === 1 ? "patch" : "patches"}`;

    const chevron = document.createElement("span");
    chevron.className = "changelogMinorChevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = ">";

    toggle.append(title, meta, chevron);

    const panel = document.createElement("div");
    panel.className = "changelogMinorPanel";

    const panelInner = document.createElement("div");
    panelInner.className = "changelogMinorPanelInner";

    const patchList = document.createElement("ol");
    patchList.className = "changelogPatchList";
    group.items.forEach((item) => patchList.appendChild(item));
    panelInner.appendChild(patchList);
    panel.appendChild(panelInner);

    if (index === 0) {
      section.classList.add("is-expanded");
    }

    toggle.addEventListener("click", () => {
      const isExpanded = section.classList.toggle("is-expanded");
      toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    });

    section.append(toggle, panel);
    list.appendChild(section);
  });
}

async function startApp() {
  loadTheme();
  setupChangelogSections();
  loadSavedTableState();
  window.__mflCoreContracts?.installEvaluationRecentStateOwnership?.();
  const initialTarget = pageTargetFromPath(`${location.pathname}${location.search}`);
  commitPageTransition(initialTarget.pageName, false, initialTarget.options);
  const startupNavigationSequence = navigationTransitionSequence;
  const earlyGlobalSearch = primeGlobalSearchIndexes();
  const startupSummaryPromise = loadSummary();
  const startupWalletPreferencesPromise = loadWalletPreferences();
  window.__mflWalletPreferencesStartupPromise = Promise.resolve(startupWalletPreferencesPromise);
  Reflect.set(window, "__mflSettingsStartupWalletPreferencesPending", initialTarget.pageName === "settings");
  const startupProgressionPermissionPromise = (
    pageRequiresProgressionPermission(initialTarget.pageName)
    && hasWalletOptIn()
  )
    ? loadWalletPermissions({ force: true })
    : null;
  applyStoredWalletPermission();
  loadEvaluationMflPerUsd();
  loadEvaluationLateSeasonRewardRates();
  updateMenuVisibility();
  showAppShell();

  const startupDependencies = [earlyGlobalSearch];
  if (startupProgressionPermissionPromise) startupDependencies.push(startupProgressionPermissionPromise);
  if (initialTarget.pageName === "home") startupDependencies.push(startupSummaryPromise);
  if (["watchlist", "myplayers", "settings", "player", "evaluation"].includes(initialTarget.pageName)) {
    startupDependencies.push(startupWalletPreferencesPromise);
  }
  await Promise.allSettled(startupDependencies);
  applyStoredWalletPermission();
  updateAccountState();
  updateMenuVisibility();

  const initialRouteRuntimeReadyPromise = Reflect.get(window, "__mflInitialRouteRuntimeReadyPromise");
  if (!initialRouteRuntimeReadyPromise || typeof initialRouteRuntimeReadyPromise.then !== "function") {
    throw new Error("Initial route runtime readiness gate is unavailable.");
  }
  await initialRouteRuntimeReadyPromise;

  if (navigationTransitionSequence === startupNavigationSequence) {
    const authoritativeTarget = pageTargetFromPath(`${location.pathname}${location.search}`);
    await showHomeShell(authoritativeTarget.pageName, false, authoritativeTarget.options);
  }

  void Promise.allSettled([startupSummaryPromise, startupWalletPreferencesPromise]).then(() => {
    applyStoredWalletPermission();
    updateAccountState();
  });
}









;(() => {
  // Compatibility marker for legacy validation; route ownership lives in the Club chunk:
  // squad|contracts|current-season|all-time
  // Compatibility marker; the executable stale-payload guard is route-owned: if (!dataLoaded) return;
  if (typeof renderSearchResultsNow !== "function" || renderSearchResultsNow.__mflUniversalClubSearch) return;

  const CLUB_SEARCH_ID_COLUMNS = [
    "active_contract_club_id",
    "club_id",
    "current_club_id",
    "active_club_id",
  ];

  function clubSearchIdColumn() {
    return CLUB_SEARCH_ID_COLUMNS.find((column) => typeof hasColumn === "function" ? hasColumn(column) : state.columns.includes(column)) || "";
  }

  function universalClubSearchEntries(query) {
    const idColumn = clubSearchIdColumn();
    if (!query || !idColumn || !Array.isArray(state.rows)) return [];
    const normalizedQuery = typeof normalizeSearchText === "function" ? normalizeSearchText(query) : String(query).toLowerCase();
    const clubs = new Map();

    state.rows.forEach((row) => {
      const clubId = String(getValue(row, idColumn) || "").trim();
      const name = String(getValue(row, "active_contract_club_name") || "").trim();
      if (!clubId || !name || clubs.has(clubId)) return;
      const searchable = typeof normalizeSearchText === "function"
        ? normalizeSearchText(name + " " + clubId)
        : (name + " " + clubId).toLowerCase();
      if (!searchable.includes(normalizedQuery)) return;
      const divisionRank = typeof contractDivisionSortValue === "function"
        ? contractDivisionSortValue(getValue(row, "active_contract_club_division"))
        : null;
      clubs.set(clubId, {
        clubId,
        name,
        divisionRank: divisionRank ?? Number.POSITIVE_INFINITY,
      });
    });

    return Array.from(clubs.values())
      .sort((a, b) => a.divisionRank - b.divisionRank || a.name.localeCompare(b.name))
      .slice(0, 5);
  }

  function addUniversalClubSearchResults() {
    if (typeof playerSearchInput === "undefined" || typeof playerSearchResults === "undefined") return;
    const query = String(playerSearchInput.value || "").trim();
    const entries = universalClubSearchEntries(query);
    if (!entries.length) return;

    const fragment = document.createDocumentFragment();
    entries.forEach(({ clubId, name }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "searchResult clubSearchResult";
      button.dataset.clubId = clubId;
      button.dataset.searchKey = recentClubKey(clubId);
      const safeName = typeof escapeHtml === "function" ? escapeHtml(name) : name;
      const safeId = typeof escapeHtml === "function" ? escapeHtml(clubId) : clubId;
      button.innerHTML = "<strong>" + safeName + "</strong><span>Club &middot; #" + safeId + "</span>";
      button.addEventListener("click", () => {
        if (typeof closeSearch === "function") closeSearch();
        if (typeof window.mflOpenClubPage === "function") {
          void window.mflOpenClubPage(clubId, "attributes");
        }
      });
      fragment.appendChild(button);
    });
    playerSearchResults.prepend(fragment);
    playerSearchResults.classList.add("filledSearchResults");
  }

  const originalRenderSearchResultsNow = renderSearchResultsNow;
  const renderSearchResultsNowWithUniversalClubs = function() {
    const result = originalRenderSearchResultsNow.apply(this, arguments);
    addUniversalClubSearchResults();
    return result;
  };
  Object.defineProperty(renderSearchResultsNowWithUniversalClubs, "__mflUniversalClubSearch", { value: true });
  renderSearchResultsNow = renderSearchResultsNowWithUniversalClubs;
})();

(() => {
  const VERSION = String(window.__mflReleaseVersion || "");
  const MAX_SEARCH_RESULTS = 5;
  const MAX_TYPED_SEARCH_RESULTS = 15;
  const RECENT_CLUBS_STORAGE_KEY = "mfl-recent-search-clubs";
  const CLUB_ID_COLUMNS = ["active_contract_club_id", "club_id", "current_club_id", "active_club_id"];

  function clubIdColumn() {
    if (!Array.isArray(state?.columns)) return "";
    return CLUB_ID_COLUMNS.find((column) => state.columns.includes(column)) || "";
  }

  function clubRowById(clubId) {
    const idColumn = clubIdColumn();
    if (!idColumn || !Array.isArray(state?.rows)) return null;
    return state.rows.find((row) => String(getValue(row, idColumn) || "").trim() === String(clubId).trim()) || null;
  }

  function clubIdFromResult(button) {
    if (button.dataset.clubId) return button.dataset.clubId;
    const info = String(button.querySelector(":scope > span")?.textContent || "");
    const match = info.match(/#([^\s·]+)/);
    const clubId = match ? match[1].trim() : "";
    if (clubId) button.dataset.clubId = clubId;
    return clubId;
  }

  function normalizedClubSearchData(clubId) {
    const row = clubRowById(clubId);
    if (!row) return null;
    const name = String(getValue(row, "active_contract_club_name") || "").trim();
    const division = typeof contractDivisionInfo === "function"
      ? contractDivisionInfo(getValue(row, "active_contract_club_division"))
      : null;
    return name ? { clubId: String(clubId), name, division } : null;
  }

  function normalizeClubResult(button) {
    const clubId = clubIdFromResult(button);
    const data = normalizedClubSearchData(clubId);
    const title = button.querySelector(":scope > strong");
    const info = button.querySelector(":scope > span");
    if (!data || !title || !info) {
      button.remove();
      return;
    }

    button.dataset.clubId = data.clubId;
    title.textContent = data.name;
    info.replaceChildren(document.createTextNode(`Club · #${data.clubId}`));
    if (data.division) {
      info.append(document.createTextNode(" · "));
      const label = document.createElement("span");
      label.className = "clubSearchDivision";
      label.textContent = data.division.name;
      label.style.color = data.division.color;
      info.appendChild(label);
    }
  }

  function readRecentClubs() {
    try {
      const value = JSON.parse(localStorage.getItem(RECENT_CLUBS_STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, MAX_SEARCH_RESULTS) : [];
    } catch {
      return [];
    }
  }

  function rememberClub(clubId) {
    const key = String(clubId || "").trim();
    if (!key) return;
    const recent = [key, ...readRecentClubs().filter((id) => id !== key)].slice(0, MAX_SEARCH_RESULTS);
    try {
      localStorage.setItem(RECENT_CLUBS_STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // Combined recent search state still works for this session.
    }

    const searchKey = recentClubKey(key);
    state.recentSearchItems = mergeRecentIdLists([searchKey], state.recentSearchItems);
    persistRecentSearchStates();
    saveTableState();
  }

  function createRecentClubResult(clubId) {
    const data = normalizedClubSearchData(clubId);
    if (!data) return null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "searchResult clubSearchResult recentClubSearchResult";
    button.dataset.clubId = data.clubId;
    button.dataset.searchKey = recentClubKey(data.clubId);
    const title = document.createElement("strong");
    title.textContent = data.name;
    const info = document.createElement("span");
    button.append(title, info);
    normalizeClubResult(button);
    button.addEventListener("click", () => {
      rememberClub(data.clubId);
      if (typeof closeSearch === "function") closeSearch();
      if (typeof window.mflOpenClubPage === "function") {
        window.mflOpenClubPage(data.clubId, "contracts");
      }
    });
    return button;
  }

  function prependRecentClubs() {
    if (typeof playerSearchInput === "undefined" || typeof playerSearchResults === "undefined") return;
    if (String(playerSearchInput.value || "").trim()) return;
    const fragment = document.createDocumentFragment();
    readRecentClubs().forEach((clubId) => {
      const result = createRecentClubResult(clubId);
      if (result) fragment.appendChild(result);
    });
    if (fragment.childElementCount) playerSearchResults.prepend(fragment);
  }

  function finalizeSearchResults() {
    if (typeof playerSearchResults === "undefined" || !playerSearchResults) return;
    playerSearchResults.querySelectorAll(".clubSearchResult").forEach(normalizeClubResult);

    const query = String(playerSearchInput?.value || "").trim();
    const directResults = Array.from(playerSearchResults.querySelectorAll(":scope > .searchResult"));
    const seen = new Set();
    directResults.forEach((result) => {
      const key = result.dataset.searchKey
        || (result.classList.contains("clubSearchResult") ? recentClubKey(clubIdFromResult(result)) : "");
      if (key) result.dataset.searchKey = key;
      if (key && seen.has(key)) result.remove();
      else if (key) seen.add(key);
    });

    if (!query) {
      const existingByKey = new Map(
        Array.from(playerSearchResults.querySelectorAll(":scope > .searchResult"))
          .filter((result) => result.dataset.searchKey)
          .map((result) => [result.dataset.searchKey, result]),
      );
      const ordered = [];
      state.recentSearchItems.slice(0, MAX_SEARCH_RESULTS).forEach((key) => {
        let result = existingByKey.get(key) || null;
        if (!result && key.startsWith("club:")) {
          result = createRecentClubResult(key.slice(5));
        }
        if (result && !ordered.includes(result)) ordered.push(result);
      });

      if (ordered.length) {
        playerSearchResults.replaceChildren(...ordered.slice(0, MAX_SEARCH_RESULTS));
        playerSearchResults.classList.add("filledSearchResults");
      } else {
        playerSearchResults.innerHTML = '<div class="searchHint">Recent searches will appear here.</div>';
        playerSearchResults.classList.remove("filledSearchResults");
      }
      return;
    }

    const resultPriority = (result) => {
      if (result.classList.contains("clubSearchResult")) return 1;
      return result.dataset.searchKey?.startsWith("agent:") ? 2 : 0;
    };
    const results = Array.from(playerSearchResults.querySelectorAll(":scope > .searchResult"))
      .sort((a, b) => resultPriority(a) - resultPriority(b));
    results.forEach((result) => playerSearchResults.appendChild(result));
    results.slice(MAX_TYPED_SEARCH_RESULTS).forEach((result) => result.remove());
    const visibleResults = playerSearchResults.querySelectorAll(":scope > .searchResult");
    playerSearchResults.querySelectorAll(":scope > .searchHint").forEach((hint) => {
      if (visibleResults.length) hint.remove();
    });
    playerSearchResults.classList.toggle("filledSearchResults", visibleResults.length > 0);
  }

  if (typeof renderSearchResultsNow === "function") {
    const originalRenderSearchResultsNow = renderSearchResultsNow;
    renderSearchResultsNow = function renderSearchResultsNowV1500() {
      const result = originalRenderSearchResultsNow.apply(this, arguments);
      finalizeSearchResults();
      return result;
    };
  }

  document.addEventListener("click", (event) => {
    const result = event.target.closest?.(".clubSearchResult");
    if (result) rememberClub(clubIdFromResult(result));
  }, true);

  function setFooterVersion() {
    window.__mflStaticUiRuntime?.sync?.();
  }

  function createChangelogItem() {
    const item = document.createElement("li");
    item.dataset.version = VERSION;
    const version = document.createElement("span");
    version.textContent = `v${VERSION}`;
    const description = document.createElement("p");
    description.textContent = "Prioritize Search results and hide Evaluation scrollbars";
    item.append(version, description);
    return item;
  }

  function collapseOlderChangelogSections(list) {
    Array.from(list.querySelectorAll(":scope > .changelogMinorSection")).forEach((section, index) => {
      const expanded = index === 0;
      section.classList.toggle("is-expanded", expanded);
      section.querySelector(":scope > .changelogMinorToggle")?.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }

  function addChangelogSection() {
    const list = document.querySelector(".changelogList");
    if (!list) return;
    const minorVersion = `v${VERSION.split(".").slice(0, 2).join(".")}`;
    const looseMinorEntries = Array.from(list.children).filter((child) =>
      !child.classList.contains("changelogMinorSection")
      && child.querySelector(":scope > span")?.textContent?.startsWith(`${minorVersion}.`),
    );
    let section = Array.from(list.querySelectorAll(":scope > .changelogMinorSection")).find((candidate) =>
      candidate.querySelector(".changelogMinorVersion")?.textContent === minorVersion,
    );
    if (!section) {
      section = document.createElement("li");
      section.className = "changelogMinorSection";
      const toggle = document.createElement("button");
      toggle.className = "changelogMinorToggle";
      toggle.type = "button";
      const title = document.createElement("span");
      title.className = "changelogMinorVersion";
      title.textContent = minorVersion;
      const meta = document.createElement("span");
      meta.className = "changelogMinorMeta";
      meta.textContent = "1 patch";
      const chevron = document.createElement("span");
      chevron.className = "changelogMinorChevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = ">";
      toggle.append(title, meta, chevron);
      const panel = document.createElement("div");
      panel.className = "changelogMinorPanel";
      const inner = document.createElement("div");
      inner.className = "changelogMinorPanelInner";
      const patchList = document.createElement("ol");
      patchList.className = "changelogPatchList";
      looseMinorEntries.forEach((entry) => patchList.appendChild(entry));
      if (!Array.from(patchList.children).some((item) =>
        item.querySelector("span")?.textContent?.trim() === `v${VERSION}`,
      )) {
        patchList.prepend(createChangelogItem());
      }
      inner.appendChild(patchList);
      panel.appendChild(inner);
      section.append(toggle, panel);
      toggle.addEventListener("click", () => {
        const expanded = section.classList.toggle("is-expanded");
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      });
      list.prepend(section);
    } else {
      const patchList = section.querySelector(".changelogPatchList");
      looseMinorEntries.forEach((entry) => patchList?.appendChild(entry));
      if (!Array.from(section.querySelectorAll(".changelogPatchList > li")).some((item) =>
        item.querySelector("span")?.textContent?.trim() === `v${VERSION}`,
      )) {
        patchList?.prepend(createChangelogItem());
      }
    }
    const patchList = section.querySelector(".changelogPatchList");
    Array.from(patchList?.children || [])
      .sort((a, b) => String(b.querySelector("span")?.textContent || "").localeCompare(
        String(a.querySelector("span")?.textContent || ""),
        undefined,
        { numeric: true },
      ))
      .forEach((entry) => patchList.appendChild(entry));
    const patchCount = section.querySelectorAll(".changelogPatchList > li").length;
    const meta = section.querySelector(".changelogMinorMeta");
    if (meta) meta.textContent = `${patchCount} ${patchCount === 1 ? "patch" : "patches"}`;
    collapseOlderChangelogSections(list);
  }


  function initialize() {
    setFooterVersion();
    finalizeSearchResults();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();

function syncLayoutCenter() {
  const selection = document.querySelector("#selectionBar");
  const pageLayout = document.querySelector("main");
  if (!pageLayout) return;
  const bounds = pageLayout.getBoundingClientRect();
  const center = `${bounds.left + (bounds.width / 2)}px`;
  window.__mflToastPosition?.sync?.();
  selection?.style.setProperty("--selection-center-x", center);
}

/* Layout-centered feedback and transition-free shared views */
(() => {
  window.addEventListener("resize", syncLayoutCenter, { passive: true });
  new MutationObserver(syncLayoutCenter).observe(document.body, {
    attributes: true,
    attributeFilter: ["class", "data-page"],
  });
  syncLayoutCenter();
})();

/* Session-cached incremental route data and destination-first loading */
(() => {
  const originalApplyFilters = applyFilters;
  const originalSetPage = setPage;
  const originalSetView = setView;
  const originalRenderSearchResultsNow = renderSearchResultsNow;

  function filterRulesForLoading(pageName, savedState, viewName) {
    const normalizedView = normalizeViewForPage(viewName || savedState?.view, pageName);
    const columns = (pageName === "mfl" || pageName === "agents")
      ? baseFilterColumns.filter((column) => column !== agentColumn && (pageName !== "mfl" || column !== contractStatusFilterColumn))
      : [...baseFilterColumns];

    if (normalizedView === "current") {
      columns.push(...statColumns.map((column) => `${column}_prog_current_season`));
    } else if (normalizedView === "all") {
      columns.push(...statColumns.map((column) => `${column}_prog_all`));
    }

    const allowedColumns = new Set(columns);
    return (savedState?.rules || [])
      .filter((rule) => allowedColumns.has(rule.column))
      .filter((rule) => (rule.operator === "between" || rule.operator === "during")
        ? String(rule.value || "").trim() && String(rule.valueTo || "").trim()
        : String(rule.value || "").trim())
      .map((rule) => ({ ...rule }));
  }

  function prepareIncrementalRoute(pageName, options = {}) {
    const clubTarget = options.ignoreCurrentClubRoute ? null : clubRouteTargetFromPath();
    const storedPageState = pageName !== "club" && !clubTarget && tablePages.has(pageName)
      ? state.tablePageStates?.[pageName] || defaultTablePageState(pageName)
      : null;
    const resetFilters = document.documentElement.dataset.mflResetTableFilters === pageName;
    const savedPageState = resetFilters && storedPageState
      ? tableStateWithoutPageFilters(pageName, storedPageState)
      : storedPageState;
    if (resetFilters && savedPageState) state.tablePageStates[pageName] = savedPageState;
    if (savedPageState) {
      restoreSavedTableState(pageName, { view: options.view, deferRules: true });
    } else if (clubTarget) {
      state.view = clubTarget.view;
      state.page = 1;
    }

    if (pageName === "agents") {
      state.currentAgentWalletAddress = normalizeWalletAddress(options.walletAddress || agentWalletAddressFromUrl()).toLowerCase();
    }

    if (pageName === "watchlist" && hasWalletOptIn()) {
      const requestedWatchlistId = String(options.watchlistId || watchlistIdFromUrl() || state.currentWatchlistId || "");
      const watchlist = normalizeWatchlists(state.watchlists, Array.from(state.watchlistPlayerIds))
        .find((candidate) => candidate.id === requestedWatchlistId);
      if (watchlist) {
        state.currentWatchlistId = watchlist.id;
        setActiveWatchlistIds(watchlist.playerIds);
      }
    }

    const route = incrementalRouteTarget(pageName, options);
    if (route && savedPageState) {
      route.filterRules = filterRulesForLoading(pageName, savedPageState, route.view);
    }
    return route;
  }

  function commitIncrementalLocation(pageName, updateHash, options = {}) {
    if (options.replaceUrl && `${window.location.pathname}${window.location.search}` !== options.replaceUrl) {
      window.history.replaceState({}, "", options.replaceUrl);
      return;
    }
    updatePageUrl(pageName, {
      ...options,
      updateUrl: updateHash,
    });
  }

  function incrementalLoadingPageName(pageName, route) {
    if (route.scope === "club") return "club";
    if (route.scope === "agent") return "agents";
    return pageName;
  }

  const shellFirstTablePages = new Set();

  function renderTableDestinationShell(pageName, route = null) {
    if (!shellFirstTablePages.has(pageName)) {
      return;
    }

    state.currentPage = pageName;
    document.body.dataset.page = pageName;
    homePage.hidden = true;
    progressionPage.hidden = false;
    mflStatsPage.hidden = true;
    myPlayersLockedPage.hidden = true;
    evaluationPage.hidden = true;
    playerPage.hidden = true;
    settingsPage.hidden = true;
    changelogPage.hidden = true;
    privacyPage.hidden = true;
    tablePageTitle.textContent = tableTitleForPage(pageName);
    if (route && route.scope !== "empty" && !incrementalRouteIsCached(route, 1)) {
      showTableBusyState();
    }
    syncHomeLoginButton();
  }

  function renderIncrementalLoadingState(pageName, route) {
    const loadingPageName = incrementalLoadingPageName(pageName, route);
    const tableRoute = ["database", "progression", "mfl", "agent", "watchlist", "myplayers", "club"].includes(route.scope);
    const mflStatsActive = route.scope === "mflstats";
    const playerPageActive = route.scope === "player";
    const evaluationPageActive = route.scope === "evaluation";

    state.currentPage = loadingPageName;
    state.view = route.view || state.view;
    document.body.dataset.page = loadingPageName;
    homePage.hidden = true;
    progressionPage.hidden = !tableRoute;
    mflStatsPage.hidden = !mflStatsActive;
    myPlayersLockedPage.hidden = true;
    evaluationPage.hidden = !evaluationPageActive;
    playerPage.hidden = !playerPageActive;
    settingsPage.hidden = true;
    changelogPage.hidden = true;
    privacyPage.hidden = true;


    if (tableRoute) {
      if (route.scope !== "club") globalThis.syncQuickFilterLabels?.();
      if (route.scope !== "club") {
        tablePageTitle.textContent = tableTitleForPage(pageName);
      }
      updateViewButtons();
      showTableBusyState();
    } else if (mflStatsActive) {
      state.view = "stats";
      updateViewButtons();
      if (mflStatsTotalPlayers) mflStatsTotalPlayers.textContent = "-";
      if (mflStatsPackablePlayers) mflStatsPackablePlayers.textContent = "-";
      if (mflStatsAgedPlayers) mflStatsAgedPlayers.textContent = "-";
      if (mflStatsOtherPlayers) mflStatsOtherPlayers.textContent = "-";
      if (mflStatsAgeDistribution) {
        mflStatsAgeDistribution.replaceChildren();
      }
    } else if (playerPageActive && playerDetail) {
      const playerId = String(route.playerId || "").trim();
      const pendingContext = window.__mflPlayerFirstPaintPendingContext;
      const matchingContext = String(pendingContext?.playerId || "").trim() === playerId
        ? pendingContext
        : { playerId };
      window.__mflPlayerFirstPaintPendingContext = matchingContext;
      window.__mflPlayerFirstPaintRuntime?.beginDetailNavigation?.(matchingContext);
      window.__mflPlayerFirstPaintRuntime?.renderPending?.(matchingContext);
    } else if (evaluationPageActive) {
      evaluationPanel.hidden = true;
      evaluationSearchResults.hidden = true;
    }

    syncHomeLoginButton();
  }

  async function renderLoadedIncrementalRoute(pageName, updateHash, options, route, requestOptions = {}) {
  if (!pageNavigationIsCurrent(options)) return false;
  const inheritedTableLoadingRequestToken = Number(requestOptions.tableLoadingRequestToken || 0);
  const renderLoadingRequestToken = inheritedTableLoadingRequestToken
    || (!incrementalRouteIsCached(route, 1) || window.__mflTableLoadingRuntime?.requestActive?.()
      ? window.__mflTableLoadingRuntime?.beginRequest?.(route.scope, { loadingMode: requestOptions.loadingMode }) || 0
      : 0);
  const ownsRenderLoadingRequestToken = inheritedTableLoadingRequestToken === 0 && renderLoadingRequestToken !== 0;
  try {
    const payload = await requestIncrementalRoute(route, 1, {
      ...requestOptions,
      tableLoadingRequestToken: renderLoadingRequestToken,
      __mflNavigationTransition: options.__mflNavigationTransition || null,
    });
    if (!payload || !pageNavigationIsCurrent(options)) return false;
    if (tablePages.has(pageName)) {
      restoreSavedTableState(pageName, { view: route.view || options.view });
    }
    state.dataAccess = currentDataAccess(pageName);
    state.incrementalApplying = true;
    try {
      const result = await originalSetPage.call(this, pageName, false, {
        ...options,
        replaceUrl: "",
        skipNavigationLoading: true,
      });
      return pageNavigationIsCurrent(options) ? result : false;
    } finally {
      state.incrementalApplying = false;
    }
  } finally {
    if (ownsRenderLoadingRequestToken) {
      window.__mflTableLoadingRuntime?.finishRequest?.(renderLoadingRequestToken);
    }
  }
}

  applyFilters = function applyFiltersWithIncrementalData(options = {}) {
    if (!state.incrementalMode || state.incrementalApplying || options.localOnly) {
      return originalApplyFilters.apply(this, arguments);
    }

    state.page = 1;
    void reloadIncrementalPage(1, { save: options.save !== false, loadingMode: "blank" });
    return undefined;
  };

  setView = async function setIncrementalView(viewName) {
    const pageName = state.currentPage;
    if (!tablePages.has(pageName) && pageName !== "club") {
      return originalSetView.apply(this, arguments);
    }
    const nextView = normalizeViewForPage(viewName, pageName);
    if (!allowedViewsForPage(pageName).includes(nextView)) return;

    const clubTarget = pageName === "club" ? clubRouteTargetFromPath() : null;
    const routeOptions = {
      view: nextView,
      walletAddress: state.currentAgentWalletAddress,
      watchlistId: state.currentWatchlistId,
      ...(clubTarget?.clubId ? { clubId: clubTarget.clubId } : {}),
    };
    const route = incrementalRouteTarget(pageName, routeOptions);
    if (!route) return originalSetView.call(this, nextView);

    const stagedTransition = takeStagedViewTransition(pageName, nextView);
    const pageKey = tablePageKey();
    const previousCurrentPage = stagedTransition?.previousCurrentPage || state.currentPage;
    const previousView = stagedTransition?.previousView || state.view;
    const previousPage = stagedTransition?.previousPage ?? state.page;
    const previousSortKey = stagedTransition?.previousSortKey || state.sortKey;
    const previousSortDirection = stagedTransition?.previousSortDirection || state.sortDirection;
    const previousPath = stagedTransition?.previousPath || currentNavigationPath();

    if (pageKey) {
      const existingPageState = state.tablePageStates[pageKey] || currentTablePageState();
      state.tablePageStates[pageKey] = {
        ...existingPageState,
        viewSortStates: {
          ...(existingPageState.viewSortStates || {}),
          [previousView]: {
            sortKey: previousSortKey,
            sortDirection: previousSortDirection,
          },
        },
      };
    }

    const targetSortState = tableSortStateForView(
      nextView,
      pageKey || pageName,
      { sortKey: previousSortKey, sortDirection: previousSortDirection },
    );
    if (stagedTransition) {
      state.sortKey = targetSortState.sortKey;
      state.sortDirection = targetSortState.sortDirection;
    } else {
      const transition = await runViewTransition(pageName, nextView, {
        ...routeOptions,
        sortKey: targetSortState.sortKey,
        sortDirection: targetSortState.sortDirection,
      });
      if (!transition) return;
    }

    const viewLoadingRequestToken = (!incrementalRouteIsCached(route, 1) || window.__mflTableLoadingRuntime?.requestActive?.())
      ? window.__mflTableLoadingRuntime?.beginRequest?.(route.scope) || 0
      : 0;
    const loadAndRender = async () => {
      try {
        const payload = await requestIncrementalRoute(route, 1, {
          tableLoadingRequestToken: viewLoadingRequestToken,
        });
        if (!payload) return;
        state.incrementalApplying = true;
        try {
          return await originalSetView.call(this, nextView);
        } finally {
          state.incrementalApplying = false;
        }
      } catch (error) {
        state.currentPage = previousCurrentPage;
        state.view = previousView;
        state.page = previousPage;
        state.sortKey = previousSortKey;
        state.sortDirection = previousSortDirection;
        if (`${window.location.pathname}${window.location.search}` !== previousPath) {
          window.history.replaceState({}, "", previousPath);
        }
        updateViewButtons();
        showToast(error?.message || "Could not load this view.");
      } finally {
        window.__mflTableLoadingRuntime?.finishRequest?.(viewLoadingRequestToken);
      }
    };

    if (incrementalRouteIsCached(route, 1)) return loadAndRender();
    return withInteractionBusy(loadAndRender, Reflect.get(window, "__mflInteractionBusy")?.reason);
};

  setPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {
    resetTableSortSession(pageName, options);
    const navigationUpdatesHistory = options.__mflNavigationUpdatesHistory ?? updateHash;
    if (!options.skipNavigationTransition) {
      return runPageTransition(pageName, navigationUpdatesHistory, options, (navigationTransition) => setPage(pageName, false, {
        ...options,
        skipNavigationTransition: true,
        __mflNavigationTransition: navigationTransition,
        __mflNavigationUpdatesHistory: navigationUpdatesHistory,
      }));
    }
    const progressionLoadingRequestToken = pageName === "progression" && !routeDataCacheReady(pageName, options)
      ? window.__mflTableLoadingRuntime?.beginRequest?.("progression") || 0
      : 0;
    const navigationTransition = options.__mflNavigationTransition || null;
    const navigationOptions = navigationTransition
      ? { ...options, __mflNavigationTransition: navigationTransition }
      : options;
    if (!pageNavigationIsCurrent(navigationOptions)) {
      window.__mflTableLoadingRuntime?.finishRequest?.(progressionLoadingRequestToken);
      return null;
    }
    updateHash = false;

    const requestedMflView = pageName === "mfl"
      ? normalizeViewForPage(options.view, "mfl")
      : "";
    if (pageName === "mfl" && requestedMflView === "stats") {
      const route = prepareIncrementalRoute(pageName, {
        ...navigationOptions,
        view: "stats",
        ignoreCurrentClubRoute: navigationUpdatesHistory,
      });
      if (!route) {
        state.incrementalMode = false;
        return originalSetPage.call(this, "mflstats", false, {
          ...navigationOptions,
          replaceUrl: "",
          view: "stats",
          skipNavigationLoading: true,
        });
      }
      const statsLoadingRequestToken = (!incrementalRouteIsCached(route, 1) || window.__mflTableLoadingRuntime?.requestActive?.())
      ? window.__mflTableLoadingRuntime?.beginRequest?.(route.scope) || 0
      : 0;
    try {
      const payload = await requestIncrementalRoute(route, 1, {
        tableLoadingRequestToken: statsLoadingRequestToken,
        __mflNavigationTransition: navigationTransition,
      });
      if (!payload || !pageNavigationIsCurrent(navigationOptions)) return false;
      state.dataAccess = currentDataAccess(pageName);
      state.incrementalApplying = true;
      try {
        return await originalSetPage.call(this, "mflstats", false, {
          ...options,
          replaceUrl: "",
          view: "stats",
          skipNavigationLoading: true,
        });
      } finally {
        state.incrementalApplying = false;
      }
    } finally {
      window.__mflTableLoadingRuntime?.finishRequest?.(statsLoadingRequestToken);
    }
    }

    const requestedDatabaseView = pageName === "database"
      ? normalizeViewForPage(options.view, "database")
      : "";
    if (pageName === "database" && requestedDatabaseView === "stats") {
      state.incrementalMode = false;
      if (typeof window.__mflEnsureRouteRuntime === "function") {
        await window.__mflEnsureRouteRuntime("database", { view: "stats" });
      }
      if (!pageNavigationIsCurrent(navigationOptions)) return null;
      const statsOwner = window.__mflDatabaseStatsStateRuntime;
      if (typeof statsOwner?.render === "function") return statsOwner.render();
      if (typeof window.renderDatabaseStatsPage === "function") return window.renderDatabaseStatsPage(false);
      return;
    }

    const previousPage = state.currentPage;
    if (options.__mflPreviousTableStateSaved !== true) {
      const previousTablePage = tablePageKey();
      if (previousTablePage) {
        state.tablePageStates[previousTablePage] = currentTablePageState();
        saveTableState();
      }
    }

    const route = prepareIncrementalRoute(pageName, {
      ...navigationOptions,
      ignoreCurrentClubRoute: navigationUpdatesHistory,
    });
    const shellFirst = shellFirstTablePages.has(pageName);
    if (shellFirst) {
      commitIncrementalLocation(pageName, updateHash, navigationOptions);
      renderTableDestinationShell(pageName, route);
    }
    if (!route) {
      window.__mflTableLoadingRuntime?.finishRequest?.(progressionLoadingRequestToken);
      state.incrementalMode = false;
      return originalSetPage.call(this, pageName, updateHash, navigationOptions);
    }

    if (!shellFirst) {
      commitIncrementalLocation(pageName, updateHash, navigationOptions);
    } else {
      globalThis.syncQuickFilterLabels?.();
      updateViewButtons();
      buildHeader();
    }
    const loadAndRender = async () => {
      try {
        const result = await renderLoadedIncrementalRoute.call(this, pageName, updateHash, navigationOptions, route, {
          tableLoadingRequestToken: progressionLoadingRequestToken,
        });
        if (result === false) return false;
        if (previousPage !== incrementalLoadingPageName(pageName, route)) {
          resetPageScroll();
        }
        return result;
      } catch (error) {
        showToast(error?.message || "Could not load this page.");
        return;
      } finally {
        window.__mflTableLoadingRuntime?.finishRequest?.(progressionLoadingRequestToken);
      }
    };

    if (route.scope === "empty" || incrementalRouteIsCached(route, 1)) {
      return loadAndRender();
    }

    return withInteractionBusy(loadAndRender);
  };

  function divisionInfo(divisionValue) {
    return typeof contractDivisionInfo === "function"
      ? contractDivisionInfo(divisionValue)
      : null;
  }

  function clubSearchResult(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "searchResult clubSearchResult";
    button.dataset.clubId = entry.clubId;
    button.dataset.searchKey = recentClubKey(entry.clubId);
    const division = divisionInfo(entry.division);
    const divisionHtml = division
      ? ` &middot; <span class="clubSearchDivision" style="color:${escapeHtml(division.color)}">${escapeHtml(division.name)}</span>`
      : "";
    button.innerHTML = `<strong>${escapeHtml(entry.name)}</strong><span>Club &middot; #${escapeHtml(entry.clubId)}${divisionHtml}</span>`;
    button.addEventListener("click", () => {
      closeSearch();
      if (typeof window.mflOpenClubPage === "function") {
        window.mflOpenClubPage(entry.clubId, "attributes");
      }
    });
    return button;
  }

  function injectBootstrapClubResults() {
    if (!playerSearchResults || !state.clubSearchIndex.length) {
      return;
    }

    playerSearchResults.querySelectorAll(":scope > .clubSearchResult").forEach((result) => result.remove());
    const query = normalizeSearchText(playerSearchInput.value.trim());
    const recentClubIds = state.recentSearchItems
      .filter((item) => item.startsWith("club:"))
      .map((item) => item.slice(5));
    const clubs = query
      ? state.clubSearchIndex
          .filter((club) => club.searchText.includes(query))
          .sort((a, b) => (
            (a.division ?? Number.POSITIVE_INFINITY) - (b.division ?? Number.POSITIVE_INFINITY)
            || a.name.localeCompare(b.name)
          ))
      : recentClubIds
          .map((clubId) => state.clubSearchIndex.find((club) => club.clubId === clubId))
          .filter(Boolean);

    const existingResults = Array.from(playerSearchResults.querySelectorAll(":scope > .searchResult"));
    const clubResults = clubs.slice(0, query ? 10 : 5).map(clubSearchResult);

    if (!query) {
      const resultsByKey = new Map(
        [...existingResults, ...clubResults]
          .filter((result) => result.dataset.searchKey)
          .map((result) => [result.dataset.searchKey, result]),
      );
      const chronologicalResults = state.recentSearchItems
        .slice(0, 5)
        .map((key) => resultsByKey.get(key))
        .filter(Boolean);

      if (chronologicalResults.length) {
        playerSearchResults.replaceChildren(...chronologicalResults);
        playerSearchResults.classList.add("filledSearchResults");
      } else {
        playerSearchResults.innerHTML = '<div class="searchHint">Recent searches will appear here.</div>';
        playerSearchResults.classList.remove("filledSearchResults");
      }
      return;
    }

    const playerResults = existingResults.filter((result) => !result.dataset.searchKey?.startsWith("agent:"));
    const agentResults = existingResults.filter((result) => result.dataset.searchKey?.startsWith("agent:"));
    const mergedResults = [
      ...playerResults,
      ...clubResults,
      ...agentResults,
    ].slice(0, 10);

    if (mergedResults.length) {
      playerSearchResults.replaceChildren(...mergedResults);
      playerSearchResults.classList.add("filledSearchResults");
    }
  }

  function prioritizeTypedSearchResults() {
    if (!playerSearchResults || !normalizeSearchText(playerSearchInput.value.trim())) {
      return;
    }

    const resultPriority = (result) => {
      const searchKey = String(result.dataset.searchKey || "");
      if (result.classList.contains("clubSearchResult") || searchKey.startsWith("club:")) {
        return 1;
      }
      if (searchKey.startsWith("agent:")) {
        return 2;
      }
      return 0;
    };
    const results = Array.from(playerSearchResults.querySelectorAll(":scope > .searchResult"))
      .sort((a, b) => resultPriority(a) - resultPriority(b))
      .slice(0, 15);

    if (!results.length) {
      return;
    }

    playerSearchResults.replaceChildren(...results);
    playerSearchResults.classList.add("filledSearchResults");
  }

  renderSearchResultsNow = function renderSearchResultsFromBootstrap() {
    const result = originalRenderSearchResultsNow.apply(this, arguments);
    injectBootstrapClubResults();
    prioritizeTypedSearchResults();
    return result;
  };

  window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage(pageName, options = {}) {
    const route = prepareIncrementalRoute(pageName, options);
    if (!route) {
      return false;
    }
    const loadAndRender = async () => {
      const payload = await requestIncrementalRoute(route, 1);
      if (!payload) return false;
      const clubPage = pageName === "club";
      if (tablePages.has(pageName) && !clubPage) {
        restoreSavedTableState(pageName, { view: route.view || options.view });
        syncRestoredTableControls(pageName);
      }
      if (clubPage) {
        state.currentPage = "club";
      }
      state.incrementalApplying = true;
      try {
        updateViewButtons();
        buildHeader();
        if (!clubPage) originalApplyFilters.call(this, { save: false });
      } finally {
        state.incrementalApplying = false;
      }
      return true;
    };

    if (incrementalRouteIsCached(route, 1)) {
      return loadAndRender();
    }

    return withInteractionBusy(loadAndRender, Reflect.get(window, "__mflInteractionBusy")?.reason);
  };
})();

;(() => {
  function tableHeaderContext() {
    if (typeof buildHeader !== "function") return null;
    const head = document.getElementById("tableHead");
    if (!(head instanceof HTMLTableSectionElement)) return null;
    const page = typeof tablePageKey === "function"
      ? (tablePageKey() || state.currentPage || "")
      : (state.currentPage || "");
    const signature = [page, state.view, state.sortKey, state.sortDirection].join("|");
    return { head, page, signature };
  }

  function ensureCanonicalTableHeader() {
    const context = tableHeaderContext();
    if (!context) return false;
    const { head, signature } = context;
    const staticHeader = head.dataset.mflStaticHeader === "true";
    const staticSignature = String(head.dataset.mflHeaderSignature || "");
    const staticPage = String(document.documentElement.dataset.initialTablePage || "").toLowerCase();
    const staticView = String(document.documentElement.dataset.initialTableView || "").toLowerCase();
    const currentPage = String(state.currentPage || "").toLowerCase();
    const currentView = String(state.view || "").toLowerCase();
    const stagedViewCommit = pendingViewTransition?.pageName === currentPage
      && pendingViewTransition?.viewName === currentView;
    const staticRoutePending = staticHeader
      && !stagedViewCommit
      && staticPage
      && staticView
      && (currentPage !== staticPage || currentView !== staticView);
    if (staticRoutePending) return true;
    if (staticHeader && !stagedViewCommit && staticSignature && staticSignature !== signature) return true;
    const needsCanonicalBuild = !head.rows[0] || staticHeader || staticSignature !== signature;
    if (needsCanonicalBuild) buildHeader();
    if (!head.rows[0]) return false;
    if (needsCanonicalBuild) {
      head.dataset.mflHeaderSignature = signature;
      delete head.dataset.mflStaticHeader;
    }
    return head.dataset.mflStaticHeader === "true" || head.dataset.mflHeaderSignature === signature;
  }

  

  const searchTokens = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const orderedTokensMatch = (text, query) => {
    const haystack = searchTokens(text).join(" ");
    const tokens = searchTokens(query);
    if (!tokens.length) return false;
    let cursor = 0;
    for (const token of tokens) {
      const index = haystack.indexOf(token, cursor);
      if (index < 0) return false;
      cursor = index + token.length;
    }
    return true;
  };

  function installSearchMatching() {
    if (typeof normalizeSearchText !== "function") return false;

    if (typeof searchMatchScore === "function" && !searchMatchScore.__mflSurnameFirst) {
      const surnameFirstSearchMatchScore = function(query, primaryText, secondaryText = "") {
        const normalizedQuery = normalizeSearchText(query);
        const primary = normalizeSearchText(primaryText);
        const secondary = normalizeSearchText(secondaryText);
        const primaryIsPlayerName = /^\d+$/.test(secondary) && primary && !/^\d+$/.test(primary);

        if (primaryIsPlayerName) {
          const surname = searchTokens(primary).at(-1) || "";
          if (secondary === normalizedQuery) return 120;
          if (surname === normalizedQuery) return 110;
          if (surname.startsWith(normalizedQuery)) return 95;
          if (primary === normalizedQuery) return 90;
          if (secondary.startsWith(normalizedQuery)) return 85;
          if (primary.startsWith(normalizedQuery)) return 75;
          if (surname.includes(normalizedQuery)) return 65;
          if (primary.includes(normalizedQuery)) return 50;
          if (orderedTokensMatch(primary, normalizedQuery)) return 45;
          if (secondary.includes(normalizedQuery)) return 40;
          return 0;
        }

        if (primary === normalizedQuery || secondary === normalizedQuery) return 100;
        if (primary.startsWith(normalizedQuery)) return 80;
        if (secondary.startsWith(normalizedQuery)) return 70;
        if (primary.includes(normalizedQuery)) return 50;
        if (secondary.includes(normalizedQuery)) return 40;
        if (orderedTokensMatch(primary, normalizedQuery)) return 45;
        if (orderedTokensMatch(secondary, normalizedQuery)) return 35;
        return 0;
      };
      Object.defineProperty(surnameFirstSearchMatchScore, "__mflSurnameFirst", { value: true });
      searchMatchScore = surnameFirstSearchMatchScore;
    }

    if (typeof evaluationSearchMatches === "function" && !evaluationSearchMatches.__mflSurnameFirst) {
      const surnameFirstEvaluationSearchMatches = function(query) {
        if (!state.evaluationSearchIndex.length && state.rows.length) buildSearchIndex();
        const results = [];
        state.evaluationSearchIndex.forEach((entry) => {
          if (entry.retired) return;
          const score = searchMatchScore(query, entry.name, entry.id);
          if (score <= 0) return;
          results.push({ entry, score });
        });
        return results
          .sort((a, b) => b.score - a.score
            || b.entry.overall - a.entry.overall
            || a.entry.nameDisplay.localeCompare(b.entry.nameDisplay))
          .slice(0, 5)
          .map((result) => result.entry);
      };
      Object.defineProperty(surnameFirstEvaluationSearchMatches, "__mflSurnameFirst", { value: true });
      evaluationSearchMatches = surnameFirstEvaluationSearchMatches;
    }
    return true;
  }

  function renderGlobalSearchResults() {
    if (typeof renderSearchResultsNow !== "function") return false;
    renderSearchResultsNow();
    return true;
  }

  function renderCurrentEvaluationSearchResults(options = {}) {
    if (typeof renderEvaluationSearchResults !== "function") return false;
    return renderEvaluationSearchResults(options) !== false;
  }

  function resetCurrentEvaluationSelection() {
    if (typeof resetEvaluationSelection !== "function") return false;
    resetEvaluationSelection();
    return true;
  }

  function applySearchPayload(payload, type = "all") {
    if (typeof applyDatabaseSearchPayload !== "function") return false;
    applyDatabaseSearchPayload(payload, type);
    return true;
  }

  function invalidateDatabaseSearch(type = "all") {
    if (typeof databaseSearchAbortControllers !== "undefined") {
      databaseSearchAbortControllers.get(type)?.abort?.();
    }
    if (typeof databaseSearchSequences !== "undefined") {
      databaseSearchSequences.set(type, (databaseSearchSequences.get(type) || 0) + 1);
    }
  }

  function evaluationRecentPlayerIds() {
    return Array.isArray(state.recentEvaluationPlayerIds)
      ? normalizeIdList(state.recentEvaluationPlayerIds, 5)
      : [];
  }

  function setEvaluationRecentPlayerIds(ids) {
    state.recentEvaluationPlayerIds = normalizeIdList(Array.isArray(ids) ? ids : [], 5);
    return [...state.recentEvaluationPlayerIds];
  }

  function evaluationSearchEntry(playerId) {
    const key = String(playerId || "").trim();
    if (!key || !Array.isArray(state.evaluationSearchIndex)) return null;
    return state.evaluationSearchIndex.find((item) => String(item?.playerId || "") === key) || null;
  }

  function buildEvaluationRecentEntries(payload) {
    const columns = Array.isArray(payload?.columns) ? payload.columns : [];
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    if (typeof buildPlayerSearchEntryFromCompactRow !== "function") return [];
    return rows
      .map((row) => buildPlayerSearchEntryFromCompactRow(row, columns))
      .filter((entry) => entry && !entry.retired);
  }

  async function persistEvaluationRecentPlayerIds(ids) {
    setEvaluationRecentPlayerIds(ids);
    if (state.walletPreferencesSaveTimer) {
      window.clearTimeout(state.walletPreferencesSaveTimer);
      state.walletPreferencesSaveTimer = null;
    }
    if (!state.linkedWalletAddress
      || typeof hasWalletProof !== "function"
      || !hasWalletProof()
      || typeof saveWalletPreferencesNow !== "function") {
      return false;
    }
    try {
      await saveWalletPreferencesNow({ domains: ["tableState"] });
      return true;
    } catch {
      return false;
    }
  }

  function installEvaluationRecentRowsOwner(provider) {
    if (typeof recentEvaluationRows !== "function" || typeof provider !== "function") return false;
    if (recentEvaluationRows.__mflSupabaseOnly) return true;
    const supabaseRecentRows = function() {
      const entries = provider();
      return Array.isArray(entries) ? entries.slice(0, 5) : [];
    };
    Object.defineProperty(supabaseRecentRows, "__mflSupabaseOnly", { value: true });
    recentEvaluationRows = supabaseRecentRows;
    return true;
  }

  function installEvaluationEmptySearchOwner(restore) {
    if (typeof requestDatabaseSearch !== "function" || typeof restore !== "function") return false;
    if (requestDatabaseSearch.__mflEvaluationSupabaseOnly) return true;
    const originalRequestDatabaseSearch = requestDatabaseSearch;
    const supabaseOnlyRequestDatabaseSearch = function(rawQuery = "", type = "all", options = {}) {
      if (type === "players" && !String(rawQuery || "").trim()) {
        return Promise.resolve(restore(Boolean(options?.force)));
      }
      return originalRequestDatabaseSearch.apply(this, arguments);
    };
    Object.defineProperty(supabaseOnlyRequestDatabaseSearch, "__mflEvaluationSupabaseOnly", { value: true });
    requestDatabaseSearch = supabaseOnlyRequestDatabaseSearch;
    return true;
  }

  function installEvaluationRecentWriteOwner(commit) {
    if (typeof rememberEvaluationResult !== "function" || typeof commit !== "function") return false;
    if (rememberEvaluationResult.__mflSupabaseImmediate) return true;
    const originalRememberEvaluationResult = rememberEvaluationResult;
    const supabaseImmediateRememberEvaluationResult = function(playerId) {
      const result = originalRememberEvaluationResult.apply(this, arguments);
      commit(playerId);
      return result;
    };
    Object.defineProperty(supabaseImmediateRememberEvaluationResult, "__mflSupabaseImmediate", { value: true });
    rememberEvaluationResult = supabaseImmediateRememberEvaluationResult;
    return true;
  }

  let evaluationRecentStateHydrated = false;

  function installEvaluationRecentStateOwnership() {
    if (typeof restoreRecentEvaluationState !== "function"
      || typeof persistRecentSearchStates !== "function") return false;
    if (restoreRecentEvaluationState.__mflRecentStateOnly) return true;

    state.recentEvaluationPlayerIds = [];

    const recentStateOnlyRestore = function(savedState) {
      const incoming = savedState && typeof savedState === "object" && !Array.isArray(savedState)
        && Array.isArray(savedState.recentEvaluationPlayerIds)
        ? savedState.recentEvaluationPlayerIds
        : [];
      state.recentEvaluationPlayerIds = normalizeIdList(incoming, 5);
      evaluationRecentStateHydrated = true;
      if (/^\/evaluation\/?$/i.test(window.location.pathname)) {
        void window.__mflEvaluationSearchStateRuntime?.restoreEmptyRecentResults?.(false, true);
      }
    };
    Object.defineProperty(recentStateOnlyRestore, "__mflRecentStateOnly", { value: true });
    restoreRecentEvaluationState = recentStateOnlyRestore;

    persistRecentSearchStates = function persistSearchStatesWithoutEvaluationLocalStorage() {
      saveRecentIdsToStorage(RECENT_SEARCH_STORAGE_KEY, state.recentSearchPlayerIds);
      saveRecentIdsToStorage(RECENT_AGENT_SEARCH_STORAGE_KEY, state.recentSearchAgentWallets);
      saveRecentIdsToStorage(RECENT_MIXED_SEARCH_STORAGE_KEY, state.recentSearchItems);
    };

    return true;
  }

  async function ensureEvaluationRecentStateHydrated(options = {}) {
    const force = Boolean(options.force);
    if (evaluationRecentStateHydrated && !force) return true;

    const pendingStartup = window.__mflWalletPreferencesStartupPromise;
    if (!force && pendingStartup && typeof pendingStartup.then === "function") {
      await Promise.resolve(pendingStartup).catch(() => undefined);
      if (evaluationRecentStateHydrated) return true;
    }

    if (!state.linkedWalletAddress
      || typeof hasWalletProof !== "function"
      || !hasWalletProof()
      || typeof loadWalletPreferences !== "function") {
      return false;
    }

    if (force) evaluationRecentStateHydrated = false;
    await loadWalletPreferences({ force });
    return evaluationRecentStateHydrated;
  }

  window.__mflCoreContracts = Object.freeze({
    ensureCanonicalTableHeader,
    syncTableSelectionHeader,
    installSearchMatching,
    renderGlobalSearchResults,
    renderCurrentEvaluationSearchResults,
    resetCurrentEvaluationSelection,
    applySearchPayload,
    invalidateDatabaseSearch,
    evaluationRecentPlayerIds,
    setEvaluationRecentPlayerIds,
    evaluationSearchEntry,
    buildEvaluationRecentEntries,
    persistEvaluationRecentPlayerIds,
    installEvaluationRecentRowsOwner,
    installEvaluationEmptySearchOwner,
    installEvaluationRecentWriteOwner,
    installEvaluationRecentStateOwnership,
    evaluationRecentStateHydrated: () => evaluationRecentStateHydrated,
    ensureEvaluationRecentStateHydrated,
  });
})();
;(() => {
  if (typeof setPage !== "function" || setPage.__mflRouteRuntimeGate) return;
  const originalRouteRuntimeSetPage = setPage;
  const routeRuntimeSetPage = async function setPageWithRouteRuntime(pageName, updateHash = true, options = {}) {
    const incomingOptions = options && typeof options === "object" && !Array.isArray(options) ? options : {};
    const runtimeReady = incomingOptions.__mflRouteRuntimeReady === true;
    const crossPageNavigation = !runtimeReady
      && String(pageName || "") !== String(state.currentPage || "");
    if (crossPageNavigation) {
      const canonicalFilterSummaryUpdater = Reflect.get(window, "updateFilterSummary");
      if (typeof canonicalFilterSummaryUpdater === "function") {
        canonicalFilterSummaryUpdater(0);
      }
    }
    let previousTableStateSaved = false;

    if (!runtimeReady) {
      if (String(pageName || "") === "player") {
        const playerId = String(
          incomingOptions.playerId
          || incomingOptions.__mflPlayerFirstPaintContext?.playerId
          || window.__mflPlayerFirstPaintPendingContext?.playerId
          || "",
        ).trim();
        if (playerId) {
          const suppliedContext = incomingOptions.__mflPlayerFirstPaintContext;
          const cachedContext = window.__mflPlayerFirstPaintPendingContext;
          const buildContext = window.__mflBuildPlayerFirstPaintContext;
          const pendingContext = String(suppliedContext?.playerId || "").trim() === playerId
            ? suppliedContext
            : String(cachedContext?.playerId || "").trim() === playerId
              ? cachedContext
              : (typeof buildContext === "function" ? buildContext(playerId) : { playerId });
          window.__mflPlayerFirstPaintPendingContext = pendingContext;

          const playerCorePromise = typeof window.__mflEnsureRouteCore === "function"
            ? window.__mflEnsureRouteCore("player", { ...incomingOptions, playerId })
            : null;
          if (typeof window.__mflEnsureRouteRuntime === "function") {
            await window.__mflEnsureRouteRuntime("player", { ...incomingOptions, playerId });
          }
          if (playerCorePromise) await playerCorePromise;

          window.__mflPlayerFirstPaintRuntime?.beginDetailNavigation?.(pendingContext);
          window.__mflPlayerFirstPaintRuntime?.renderPending?.(pendingContext);
        }
      }

      const stagedTransition = incomingOptions.__mflNavigationTransition
        || (incomingOptions.skipNavigationTransition === true ? pendingViewTransition : null);
      const loadCommittedRoute = async (transition = stagedTransition) => {
        const ownerBeforeRuntime = setPage;
        const routeCorePromise = typeof window.__mflEnsureRouteCore === "function"
          ? window.__mflEnsureRouteCore(String(pageName || ""), incomingOptions)
          : null;
        if (typeof window.__mflEnsureRouteRuntime === "function") {
          await window.__mflEnsureRouteRuntime(String(pageName || ""), incomingOptions);
        }
        if (routeCorePromise) await routeCorePromise;

        if (transition && !navigationTransitionIsCurrent(transition)) return null;

        const committedOptions = {
          ...incomingOptions,
          skipNavigationTransition: true,
          ...(transition ? { __mflNavigationTransition: transition } : {}),
          ...(previousTableStateSaved ? { __mflPreviousTableStateSaved: true } : {}),
        };
        if (setPage !== ownerBeforeRuntime) {
          return setPage.call(this, pageName, updateHash, {
            ...committedOptions,
            __mflRouteRuntimeReady: true,
          });
        }
        return originalRouteRuntimeSetPage.call(this, pageName, updateHash, committedOptions);
      };

      if (incomingOptions.skipNavigationTransition === true) {
        return loadCommittedRoute();
      }

      const previousTablePage = typeof tablePageKey === "function" ? tablePageKey() : null;
      if (previousTablePage && typeof currentTablePageState === "function" && typeof saveTableState === "function") {
        state.tablePageStates[previousTablePage] = currentTablePageState();
        saveTableState();
      }
      previousTableStateSaved = true;

      const runTransition = Reflect.get(window, "__mflRunPageTransition");
      if (typeof runTransition !== "function") {
        throw new Error("Global page transition owner is unavailable.");
      }
      return runTransition(String(pageName || ""), updateHash, incomingOptions, loadCommittedRoute);
    }

    const cleanOptions = { ...incomingOptions };
    delete cleanOptions.__mflRouteRuntimeReady;
    return originalRouteRuntimeSetPage.call(this, pageName, updateHash, cleanOptions);
  };
  Object.defineProperty(routeRuntimeSetPage, "__mflRouteRuntimeGate", { value: true });
  setPage = routeRuntimeSetPage;
})();

window.__mflMarkApplicationCoreLoaded?.();

window.__mflAppStartPromise = (async () => {
  if (typeof pageTargetFromPath === "function" && typeof window.__mflEnsureRouteCore === "function") {
    const initialRouteTarget = pageTargetFromPath(window.location.pathname);
    if (initialRouteTarget?.pageName) {
      await window.__mflEnsureRouteCore(initialRouteTarget.pageName, initialRouteTarget.options || {});
    }
  }
  return startApp();
})();

;(() => {
  if (window.__mflFooterSpaNavigationBound) return;
  window.__mflFooterSpaNavigationBound = true;
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const footer = event.target.closest('.siteFooterDetails a[href="/changelog"], .siteFooterDetails a[data-page="changelog"]');
    if (!footer || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.location.pathname === "/changelog") return;
    if (typeof setPage === "function") {
      void Promise.resolve(setPage("changelog", true));
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const toggle = event.target.closest(".changelogMinorToggle");
    if (!toggle) return;
    const section = toggle.closest(".changelogMinorSection");
    if (!section) return;
    const expanded = section.classList.toggle("is-expanded");
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  });
})();
;(() => {
  

  



  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const home = event.target.closest('.brandLink[href="/"], .brandLink[data-page="home"]');
    if (!home || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void Promise.resolve(setPage("home", true));
  }, true);
})();
