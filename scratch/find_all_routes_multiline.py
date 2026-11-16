import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = re.compile(r'app\.(get|post|put|delete|patch)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', re.DOTALL | re.IGNORECASE)

matches = []
for m in pattern.finditer(text):
    line_no = text[:m.start()].count('\n') + 1
    method = m.group(1).upper()
    path = m.group(2)
    matches.append((line_no, method, path))

print(f"Total routes found (multiline): {len(matches)}")
for m in matches:
    print(f"L{m[0]:4d}: {m[1]:6s} {m[2]}")

