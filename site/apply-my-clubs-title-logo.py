from pathlib import Path

ROOT = Path(__file__).resolve().parent


def replace_once(path: Path, old: str, new: str) -> None:
    source = path.read_text(encoding="utf-8")
    if old not in source:
        raise RuntimeError(f"Expected block not found in {path}")
    path.write_text(source.replace(old, new, 1), encoding="utf-8")


core = ROOT / "modules/core-sources/my-clubs.js"
replace_once(
    core,
    '  const PATH = "/my-clubs";\n',
    '  const PATH = "/my-clubs";\n  const CLUB_DISPLAY_DATA_STORAGE_KEY = "mfl-club-display-data-v1";\n',
)
replace_once(
    core,
    '''  function routeIsCurrent(options = {}) {\n    return typeof pageNavigationIsCurrent !== "function" || pageNavigationIsCurrent(options);\n  }\n\n''',
    '''  function routeIsCurrent(options = {}) {\n    return typeof pageNavigationIsCurrent !== "function" || pageNavigationIsCurrent(options);\n  }\n\n  function firstLetterCaps(value) {\n    const text = String(value || "").trim().toLocaleLowerCase();\n    return text ? `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}` : "";\n  }\n\n  function primeClubDestinationTitle(clubId, name, divisionInfo) {\n    const normalizedClubId = String(clubId || "").trim();\n    const normalizedName = String(name || "").trim();\n    if (!normalizedClubId || !normalizedName) return;\n\n    try {\n      const stored = JSON.parse(localStorage.getItem(CLUB_DISPLAY_DATA_STORAGE_KEY) || "{}");\n      const next = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};\n      next[normalizedClubId] = {\n        clubId: normalizedClubId,\n        name: normalizedName,\n        divisionName: String(divisionInfo?.name || "").trim(),\n        divisionColor: String(divisionInfo?.color || "").trim(),\n      };\n      localStorage.setItem(CLUB_DISPLAY_DATA_STORAGE_KEY, JSON.stringify(next));\n    } catch {\n      // The destination can still resolve the title from its own data if storage is unavailable.\n    }\n\n    const destinationTitle = document.getElementById("tablePageTitle");\n    if (!(destinationTitle instanceof HTMLElement)) return;\n    if (!divisionInfo?.name) {\n      destinationTitle.textContent = normalizedName;\n      return;\n    }\n    const divisionLabel = document.createElement("span");\n    divisionLabel.className = "clubPageTitleDivision";\n    divisionLabel.style.color = String(divisionInfo.color || "");\n    divisionLabel.textContent = String(divisionInfo.name);\n    destinationTitle.replaceChildren(\n      document.createTextNode(`${normalizedName} - `),\n      divisionLabel,\n    );\n  }\n\n''',
)
replace_once(
    core,
    '    const nation = String(club?.nation || "").trim();\n',
    '    const nation = firstLetterCaps(club?.nation);\n',
)
replace_once(
    core,
    '''      if (!clubId || typeof window.mflOpenClubPage !== "function") return;\n      event.preventDefault();\n      void window.mflOpenClubPage(clubId, "attributes");\n''',
    '''      if (!clubId || typeof window.mflOpenClubPage !== "function") return;\n      primeClubDestinationTitle(clubId, name, divisionInfo);\n      event.preventDefault();\n      void window.mflOpenClubPage(clubId, "attributes");\n''',
)

title_runtime = ROOT / "document-title-runtime.js"
replace_once(
    title_runtime,
    '  const APP_NAME = "MFL Front Office";\n',
    '  const APP_NAME = "MFL Front Office";\n  const CLUB_DISPLAY_DATA_STORAGE_KEY = "mfl-club-display-data-v1";\n',
)
replace_once(
    title_runtime,
    '''  function resolvedClubTitle() {\n    if (routeBusy()) return withAppName("Club");\n    const tableTitle = textFrom("#tablePageTitle");\n    if (!tableTitle || GENERIC_TABLE_TITLES.has(tableTitle)) return withAppName("Club");\n    return withAppName(tableTitle);\n  }\n''',
    '''  function cachedClubTitleLabel(clubId) {\n    const normalizedClubId = cleanText(clubId);\n    if (!normalizedClubId) return "";\n    try {\n      const stored = JSON.parse(localStorage.getItem(CLUB_DISPLAY_DATA_STORAGE_KEY) || "{}");\n      const identity = stored?.[normalizedClubId];\n      const name = cleanText(identity?.name);\n      const divisionName = cleanText(identity?.divisionName);\n      if (!name) return "";\n      return divisionName ? `${name} - ${divisionName}` : name;\n    } catch {\n      return "";\n    }\n  }\n\n  function resolvedClubTitle(request = currentRouteRequest()) {\n    const cachedLabel = cachedClubTitleLabel(request?.options?.clubId);\n    if (cachedLabel) return withAppName(cachedLabel);\n    if (routeBusy()) return withAppName("Club");\n    const tableTitle = textFrom("#tablePageTitle");\n    if (!tableTitle || GENERIC_TABLE_TITLES.has(tableTitle)) return withAppName("Club");\n    return withAppName(tableTitle);\n  }\n''',
)
replace_once(
    title_runtime,
    '    if (pageName === "club") return resolvedClubTitle();\n',
    '    if (pageName === "club") return resolvedClubTitle(request);\n',
)

styles = ROOT / "my-clubs.css"
replace_once(styles, '  grid-template-columns: 112px minmax(0, 1fr);\n', '  grid-template-columns: 128px minmax(0, 1fr);\n')
replace_once(styles, '  min-height: 144px;\n', '  min-height: 156px;\n')
replace_once(styles, '  padding: 16px;\n  border-right:', '  padding: 12px;\n  border-right:')
replace_once(styles, '  max-width: 80px;\n  max-height: 88px;\n', '  max-width: 100px;\n  max-height: 108px;\n')

tablet = ROOT / "responsive-sources/my-clubs-tablet.css.inc"
replace_once(tablet, '    grid-template-columns: 82px minmax(0, 1fr);\n    min-height: 108px;\n', '    grid-template-columns: 96px minmax(0, 1fr);\n    min-height: 120px;\n')
replace_once(tablet, '    padding: 10px;\n', '    padding: 9px;\n')
replace_once(tablet, '    max-width: 58px;\n    max-height: 66px;\n', '    max-width: 76px;\n    max-height: 84px;\n')
replace_once(
    tablet,
    '''\n  .myClubLogoPlaceholder {\n    width: 52px;\n    height: 52px;\n  }\n''',
    '',
)

phone = ROOT / "responsive-sources/my-clubs-phone.css.inc"
replace_once(phone, '    grid-template-columns: 88px minmax(0, 1fr);\n    min-height: 120px;\n', '    grid-template-columns: 104px minmax(0, 1fr);\n    min-height: 128px;\n')
replace_once(phone, '    padding: 11px;\n', '    padding: 10px;\n')
replace_once(phone, '    max-width: 64px;\n    max-height: 70px;\n', '    max-width: 82px;\n    max-height: 90px;\n')

validator = ROOT / "validate-my-clubs-route.mjs"
source = validator.read_text(encoding="utf-8")
needle = 'assert.match(clubsApi, /country AS nation/u, "My Clubs API must expose country using the Nation terminology.");\n'
addition = '''assert.match(coreSource, /function firstLetterCaps\\(value\\)/u, "My Clubs must normalize Nation to first-letter capitalization only.");\nassert.match(coreSource, /primeClubDestinationTitle\\(clubId, name, divisionInfo\\)/u, "My Clubs must prime the known club identity before route navigation.");\nassert.match(coreSource, /localStorage\\.setItem\\(CLUB_DISPLAY_DATA_STORAGE_KEY/u, "My Clubs must share its known club identity with the Club route title cache.");\nassert.match(titleRuntime, /cachedClubTitleLabel\\(request\\?\\.options\\?\\.clubId\\)/u, "Document titles must consume the primed Club identity even while the destination route is busy.");\nassert.match(pageStyles, /\\.myClubLogo \\{[\\s\\S]*?max-width: 100px;[\\s\\S]*?max-height: 108px;/u, "Desktop My Clubs logos must use the enlarged canonical geometry.");\n'''
if needle not in source:
    raise RuntimeError("Expected My Clubs validator tail not found")
validator.write_text(source.replace(needle, needle + addition, 1), encoding="utf-8")
