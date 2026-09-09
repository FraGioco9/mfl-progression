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
