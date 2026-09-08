(() => {
  "use strict";

  if (typeof setPage !== "function" || setPage.__mflMyClubsRouteOwner) return;

  const PAGE = "my-clubs";
  const PATH = "/my-clubs";
  const CLUB_DISPLAY_DATA_STORAGE_KEY = "mfl-club-display-data-v1";
  const MY_CLUBS_COUNT_STORAGE_KEY = "mfl-my-clubs-count-v1";
  const originalSetPage = setPage;
  const originalOptOutWallet = typeof optOutWallet === "function" ? optOutWallet : null;
  const page = document.getElementById("myClubsPage");
  const grid = document.getElementById("myClubsGrid");
  const status = document.getElementById("myClubsStatus");
  const retryButton = document.getElementById("myClubsRetryButton");
  const optInButton = document.getElementById("myPlayersOptInButton");

  let cacheWallet = "";
  let cacheClubs = [];
  let requestSequence = 0;
  let loadPromise = null;

  function walletAddress() {
    return normalizeWalletAddress(state.linkedWalletAddress || "").toLowerCase();
  }

  function routeIsCurrent(options = {}) {
    return typeof pageNavigationIsCurrent !== "function" || pageNavigationIsCurrent(options);
  }

  function firstLetterCaps(value) {
    const text = String(value || "").trim().toLocaleLowerCase();
    return text ? `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}` : "";
  }

  function clubColor(value) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/iu.test(color) ? color.toLowerCase() : "";
  }

  function storedClubCount(wallet = walletAddress()) {
    const normalizedWallet = normalizeWalletAddress(wallet || "").toLowerCase();
    if (!normalizedWallet) return 0;
    try {
      const stored = JSON.parse(localStorage.getItem(MY_CLUBS_COUNT_STORAGE_KEY) || "{}");
      const value = Number(stored?.[normalizedWallet]);
      return Number.isInteger(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function saveClubCount(wallet, count) {
    const normalizedWallet = normalizeWalletAddress(wallet || "").toLowerCase();
    const normalizedCount = Number(count);
    if (!normalizedWallet || !Number.isInteger(normalizedCount) || normalizedCount < 0) return;
    try {
      const stored = JSON.parse(localStorage.getItem(MY_CLUBS_COUNT_STORAGE_KEY) || "{}");
      const next = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
      next[normalizedWallet] = normalizedCount;
      localStorage.setItem(MY_CLUBS_COUNT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // First-paint shells are an enhancement; data loading remains authoritative.
    }
  }

  function loadingCard() {
    const card = document.createElement("div");
    card.className = "myClubCard myClubCardLoading";
    card.setAttribute("aria-hidden", "true");

    const logoFrame = document.createElement("div");
    logoFrame.className = "myClubLogoFrame myClubLogoFrameLoading";
    const logo = document.createElement("div");
    logo.className = "myClubLoadingLogo";
    logoFrame.appendChild(logo);

    const body = document.createElement("div");
    body.className = "myClubCardBody";
    const idLine = document.createElement("span");
    idLine.className = "myClubLoadingLine myClubLoadingId";
    const nameLine = document.createElement("span");
    nameLine.className = "myClubLoadingLine myClubLoadingName";
    const metaLine = document.createElement("span");
    metaLine.className = "myClubLoadingLine myClubLoadingMeta";
    body.append(idLine, nameLine, metaLine);
    card.append(logoFrame, body);
    return card;
  }

  function renderLoadingCards(count = storedClubCount()) {
    if (!grid || grid.childElementCount || count <= 0) return false;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < count; index += 1) fragment.appendChild(loadingCard());
    grid.appendChild(fragment);
    setStatus("");
    return true;
  }

  function primeClubDestinationTitle(clubId, name, divisionInfo) {
    const normalizedClubId = String(clubId || "").trim();
    const normalizedName = String(name || "").trim();
    if (!normalizedClubId || !normalizedName) return;

    try {
      const stored = JSON.parse(localStorage.getItem(CLUB_DISPLAY_DATA_STORAGE_KEY) || "{}");
      const next = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
      next[normalizedClubId] = {
        clubId: normalizedClubId,
        name: normalizedName,
        divisionName: String(divisionInfo?.name || "").trim(),
        divisionColor: String(divisionInfo?.color || "").trim(),
      };
      localStorage.setItem(CLUB_DISPLAY_DATA_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The destination can still resolve the title from its own data if storage is unavailable.
    }

    const destinationTitle = document.getElementById("tablePageTitle");
    if (!(destinationTitle instanceof HTMLElement)) return;
    if (!divisionInfo?.name) {
      destinationTitle.textContent = normalizedName;
      return;
    }
    const divisionLabel = document.createElement("span");
    divisionLabel.className = "clubPageTitleDivision";
    divisionLabel.style.color = String(divisionInfo.color || "");
    divisionLabel.textContent = String(divisionInfo.name);
    destinationTitle.replaceChildren(
      document.createTextNode(`${normalizedName} - `),
      divisionLabel,
    );
  }

  function clearCache() {
    requestSequence += 1;
    cacheWallet = "";
    cacheClubs = [];
    loadPromise = null;
    if (grid) grid.replaceChildren();
  }

  function setStatus(message = "", { error = false } = {}) {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("error", error);
  }

  function clubCard(club) {
    const clubId = String(club?.clubId || "").trim();
    const name = String(club?.name || "").trim() || `Club ${clubId}`;
    const division = Number(club?.division);
    const divisionInfo = typeof contractDivisionInfo === "function" ? contractDivisionInfo(division) : null;
    const city = String(club?.city || "").trim();
    const nation = firstLetterCaps(club?.nation);
    const location = [city, nation].filter(Boolean).join(", ");
    const primaryColor = clubColor(club?.primaryColor);
    const secondaryColor = clubColor(club?.secondaryColor);

    const link = document.createElement("a");
    link.className = "myClubCard";
    link.href = `/clubs/${encodeURIComponent(clubId)}/squad`;
    link.dataset.clubId = clubId;
    link.setAttribute("aria-label", `Open ${name}`);
    const gradientPrimary = primaryColor || secondaryColor;
    const gradientSecondary = secondaryColor || primaryColor;
    if (gradientPrimary) {
      link.style.setProperty("--my-club-primary", gradientPrimary);
      link.style.setProperty("--my-club-secondary", gradientSecondary);
    }

    const logoFrame = document.createElement("div");
    logoFrame.className = "myClubLogoFrame";

    const logoUrl = String(club?.logoUrl || "").trim();
    if (logoUrl) {
      const image = document.createElement("img");
      image.className = "myClubLogo";
      image.src = logoUrl;
      image.alt = `${name} logo`;
      image.decoding = "async";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        logoFrame.hidden = true;
        link.classList.add("myClubCardNoLogo");
      }, { once: true });
      logoFrame.appendChild(image);
    } else {
      logoFrame.hidden = true;
      link.classList.add("myClubCardNoLogo");
    }

    const body = document.createElement("div");
    body.className = "myClubCardBody";

    const titleBlock = document.createElement("div");
    titleBlock.className = "myClubTitleBlock";

    const title = document.createElement("h3");
    title.className = "myClubName";
    title.textContent = name;

    const id = document.createElement("span");
    id.className = "myClubId";
    id.textContent = clubId ? `#${clubId}` : "";
    titleBlock.append(id, title);

    const meta = document.createElement("div");
    meta.className = "myClubMeta";

    const divisionItem = document.createElement("span");
    divisionItem.className = "myClubDivision";
    divisionItem.textContent = divisionInfo?.name || "Division -";
    if (divisionInfo?.color) divisionItem.style.color = divisionInfo.color;
    meta.appendChild(divisionItem);

    if (location) {
      const locationItem = document.createElement("span");
      locationItem.className = "myClubLocation";
      locationItem.textContent = location;
      meta.appendChild(locationItem);
    }

    body.append(titleBlock, meta);
    link.append(logoFrame, body);

    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!clubId || typeof window.mflOpenClubPage !== "function") return;
      primeClubDestinationTitle(clubId, name, divisionInfo);
      event.preventDefault();
      void window.mflOpenClubPage(clubId, "attributes");
    });

    return link;
  }

  function renderCards(clubs) {
    if (!grid) return;
    grid.replaceChildren();
    const validClubs = Array.isArray(clubs)
      ? clubs.filter((club) => String(club?.clubId || "").trim())
      : [];
    validClubs.sort((left, right) => {
      const leftDivision = Number(left?.division);
      const rightDivision = Number(right?.division);
      const leftRank = leftDivision >= 1 && leftDivision <= 10 ? leftDivision : 999;
      const rightRank = rightDivision >= 1 && rightDivision <= 10 ? rightDivision : 999;
      if (leftRank !== rightRank) return leftRank - rightRank;
      const byName = String(left?.name || "").localeCompare(String(right?.name || ""));
      if (byName) return byName;
      return Number(left?.clubId || 0) - Number(right?.clubId || 0);
    });
    validClubs.forEach((club) => grid.appendChild(clubCard(club)));
    setStatus(validClubs.length ? "" : "No clubs found for this wallet.");
    if (retryButton) retryButton.hidden = true;
  }

  async function loadClubs(options = {}, { force = false } = {}) {
    const wallet = walletAddress();
    if (!wallet || !hasWalletOptIn()) {
      clearCache();
      return [];
    }

    if (cacheWallet && cacheWallet !== wallet) clearCache();
    if (!force && cacheWallet === wallet && cacheClubs.length) {
      renderCards(cacheClubs);
      return cacheClubs;
    }
    if (!force && loadPromise && cacheWallet === wallet) return loadPromise;

    cacheWallet = wallet;
    const sequence = ++requestSequence;
    const hasLoadingCards = renderLoadingCards(storedClubCount(wallet));
    setStatus(hasLoadingCards ? "" : "Loading...");
    if (retryButton) retryButton.hidden = true;

    const promise = (async () => {
      try {
        const response = await fetch("/api/data?mode=my-clubs", {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...walletProofHeaders(true),
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Could not load clubs.");
        if (sequence !== requestSequence || walletAddress() !== wallet || !routeIsCurrent(options)) return [];
        cacheClubs = Array.isArray(payload?.clubs) ? payload.clubs : [];
        saveClubCount(wallet, cacheClubs.length);
        renderCards(cacheClubs);
        return cacheClubs;
      } catch (error) {
        if (sequence !== requestSequence || walletAddress() !== wallet || !routeIsCurrent(options)) return [];
        cacheClubs = [];
        if (grid) grid.replaceChildren();
        setStatus(error?.message || "Could not load clubs.", { error: true });
        if (retryButton) retryButton.hidden = false;
        return [];
      } finally {
        if (loadPromise === promise) loadPromise = null;
      }
    })();

    loadPromise = promise;
    return promise;
  }

  function showOnly(target) {
    document.querySelectorAll("main > .pageView").forEach((candidate) => {
      if (candidate instanceof HTMLElement) candidate.hidden = candidate !== target;
    });
  }

  function syncNavigation() {
    document.querySelectorAll("#sidebar .navButton[data-page]").forEach((button) => {
      button.classList.toggle("active", String(button.dataset.page || "") === PAGE);
    });
  }

  function setCanonicalUrl(updateHash, options = {}) {
    if (options.replaceUrl && window.location.pathname !== PATH) {
      window.history.replaceState({}, "", PATH);
      return;
    }
    if (updateHash && window.location.pathname !== PATH) {
      window.history.pushState({}, "", PATH);
    }
  }

  async function renderRoute(updateHash = true, options = {}) {
    if (!routeIsCurrent(options)) return null;

    const locked = !hasWalletOptIn();
    state.currentPage = PAGE;
    document.body.dataset.page = PAGE;
    syncNavigation();

    if (locked) {
      clearCache();
      const lockedPage = document.getElementById("myPlayersLockedPage");
      const lockedTitle = document.getElementById("optInLockedTitle");
      const lockedMessage = document.getElementById("optInLockedMessage");
      if (lockedTitle) lockedTitle.textContent = "My Clubs";
      if (lockedMessage) lockedMessage.textContent = "In order to see your clubs, you need to opt in.";
      if (lockedPage instanceof HTMLElement) showOnly(lockedPage);
      syncHomeLoginButton?.();
      if (document.body.classList.contains("loading")) await finishLoading();
      return null;
    }

    setCanonicalUrl(updateHash, options);
    if (page instanceof HTMLElement) showOnly(page);
    if (!routeIsCurrent(options)) return null;

    await loadClubs(options);
    if (!routeIsCurrent(options)) return null;
    if (document.body.classList.contains("loading")) await finishLoading();
    return true;
  }

  const myClubsSetPage = async function setPageWithMyClubsRoute(pageName, updateHash = true, options = {}) {
    const normalized = window.__mflAppConfig?.routes?.normalizePageName?.(pageName) || String(pageName || "");
    if (normalized !== PAGE) return originalSetPage.call(this, pageName, updateHash, options);
    return renderRoute(updateHash, options);
  };
  myClubsSetPage.__mflMyClubsRouteOwner = true;
  setPage = myClubsSetPage;
  window.setPage = myClubsSetPage;

  if (originalOptOutWallet) {
    optOutWallet = function optOutWalletWithMyClubsReset() {
      const wasMyClubs = state.currentPage === PAGE;
      const result = originalOptOutWallet.apply(this, arguments);
      if (wasMyClubs) {
        clearCache();
        void renderRoute(false, { preserveScroll: true });
      }
      return result;
    };
  }

  if (optInButton) {
    optInButton.removeEventListener("click", linkWallet);
    optInButton.addEventListener("click", async () => {
      try {
        await linkWallet();
      } finally {
        if (state.currentPage === PAGE && hasWalletOptIn()) {
          clearCache();
          await renderRoute(false, { preserveScroll: true });
        }
      }
    });
  }

  retryButton?.addEventListener("click", () => {
    void loadClubs({}, { force: true });
  });

  window.__mflMyClubsRoute = Object.freeze({
    refresh() {
      clearCache();
      return state.currentPage === PAGE && hasWalletOptIn()
        ? loadClubs({}, { force: true })
        : Promise.resolve([]);
    },
    clear: clearCache,
  });
})();
