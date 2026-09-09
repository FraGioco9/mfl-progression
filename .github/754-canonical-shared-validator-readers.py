from pathlib import Path
import re

root = Path('site')
allow_physical = {
    'validate-core-source-ownership.mjs',
    'validate.mjs',
    'validate-club-route-core.mjs',
}

read_call = 'read("./modules/core-sources/shared.js")'
read_file_re = re.compile(r'readFile\(new URL\("\./modules/core-sources/shared\.js", import\.meta\.url\), "utf8"\)')
import_re = re.compile(r'import\s*\{(?P<names>[^}]*)\}\s*from\s*"\./validate-core-sources\.mjs";', re.S)
changed = []

for path in sorted(root.glob('validate*.mjs')):
    if path.name in allow_physical:
        continue
    text = path.read_text()
    updated = text.replace(read_call, 'readCanonicalCoreSource("shared")')
    updated = read_file_re.sub('readCanonicalCoreSource("shared")', updated)
    if updated == text:
        continue

    if 'readCanonicalCoreSource' not in text:
        match = import_re.search(updated)
        if match:
            names = [name.strip() for name in match.group('names').split(',') if name.strip()]
            assert 'readCanonicalCoreSource' not in names
            names.append('readCanonicalCoreSource')
            replacement = 'import { ' + ', '.join(names) + ' } from "./validate-core-sources.mjs";'
            updated = updated[:match.start()] + replacement + updated[match.end():]
        else:
            updated = 'import { readCanonicalCoreSource } from "./validate-core-sources.mjs";\n' + updated

    assert read_call not in updated
    assert not read_file_re.search(updated)
    path.write_text(updated)
    changed.append(path)

assert changed, 'No brittle Shared validator readers were migrated'

for path in sorted(root.glob('validate*.mjs')):
    if path.name in allow_physical:
        continue
    text = path.read_text()
    assert read_call not in text, f'Physical Shared read remains in {path}'
    assert not read_file_re.search(text), f'Physical Shared readFile remains in {path}'

print(f'Migrated {len(changed)} validators to manifest-assembled Shared reads:')
for path in changed:
    print(path)
