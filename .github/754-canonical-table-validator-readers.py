from pathlib import Path
import re

ROOT = Path("site")
SKIP = {
    "validate-core-source-ownership.mjs",
}
PATTERNS = [
    re.compile(r'read\("\./modules/core-sources/table\.js"\)'),
    re.compile(r'readFile\(new URL\("\./modules/core-sources/table\.js", import\.meta\.url\), "utf8"\)'),
    re.compile(r'readFile\(join\(siteRoot, "modules/core-sources/table\.js"\), "utf8"\)'),
    re.compile(r'readFileSync\(resolve\(root, "modules/core-sources/table\.js"\), "utf8"\)'),
]


def ensure_reader_import(text: str) -> str:
    if "readCanonicalCoreSource" in text.split("\n\n", 1)[0] or re.search(r'import\s*\{[^}]*\breadCanonicalCoreSource\b[^}]*\}\s*from\s*"\./validate-core-sources\.mjs";', text, re.S):
        return text
    existing = re.search(r'import\s*\{([^}]*)\}\s*from\s*"\./validate-core-sources\.mjs";', text, re.S)
    if existing:
        names = [part.strip() for part in existing.group(1).split(",") if part.strip()]
        if "readCanonicalCoreSource" not in names:
            names.insert(0, "readCanonicalCoreSource")
        replacement = 'import { ' + ", ".join(names) + ' } from "./validate-core-sources.mjs";'
        return text[:existing.start()] + replacement + text[existing.end():]
    # Insert after the import block.
    matches = list(re.finditer(r'^import .*?;\n', text, re.M))
    if not matches:
        raise RuntimeError("Validator has no import block")
    end = matches[-1].end()
    return text[:end] + 'import { readCanonicalCoreSource } from "./validate-core-sources.mjs";\n' + text[end:]

migrated = []
for path in sorted(ROOT.glob("validate*.mjs")):
    if path.name in SKIP:
        continue
    text = path.read_text(encoding="utf-8")
    original = text
    replacements = 0
    for pattern in PATTERNS:
        text, count = pattern.subn('Promise.resolve(readCanonicalCoreSource("table"))', text)
        replacements += count
    if replacements:
        text = ensure_reader_import(text)
        path.write_text(text, encoding="utf-8", newline="\n")
        migrated.append((path.as_posix(), replacements))

if not migrated:
    raise RuntimeError("No residual physical Table validator readers found")

print("Migrated behavioral validators to manifest-assembled Table reads:")
for path, count in migrated:
    print(f"  {path}: {count}")
