from pathlib import Path

OLD_LOADING = 'const incrementalPageEnd = appCoreSource.indexOf("function divisionInfo(", incrementalPageStart);'
NEW_LOADING = 'const incrementalPageEnd = appCoreSource.indexOf("window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage", incrementalPageStart);'

loading_path = Path("site/validate-table-loading-state.mjs")
loading = loading_path.read_text(encoding="utf-8")
assert loading.count(OLD_LOADING) == 1, "Table loading incremental-page boundary moved."
loading = loading.replace(OLD_LOADING, NEW_LOADING)
loading_path.write_text(loading, encoding="utf-8")

OLD_SORT = '''const incrementalPageSource = sourceBetween(core, "setPage = async function setIncrementalPage", "function divisionInfo");'''
NEW_SORT = '''const incrementalPageSource = sourceBetween(core, "setPage = async function setIncrementalPage", "window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage");'''

sort_path = Path("site/validate-table-sort-session.mjs")
sort_source = sort_path.read_text(encoding="utf-8")
assert sort_source.count(OLD_SORT) == 1, "Table sort incremental-page boundary moved."
sort_source = sort_source.replace(OLD_SORT, NEW_SORT)
sort_path.write_text(sort_source, encoding="utf-8")
