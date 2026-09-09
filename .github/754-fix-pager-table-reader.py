from pathlib import Path

path = Path("site/validate-pager-current-page.mjs")
text = path.read_text(encoding="utf-8")
old = '    read("./modules/core-sources/table.js"),'
new = '    Promise.resolve(readCanonicalCoreSource("table")),'
if text.count(old) != 1:
    raise RuntimeError(f"Expected one physical Table reader, found {text.count(old)}")
path.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")
print("Pager validator now consumes the manifest-assembled Table domain.")
