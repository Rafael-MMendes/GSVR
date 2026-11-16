import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Find function definitions that are NOT route handlers
matches = re.finditer(r'^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*\{', text, re.MULTILINE)
for m in matches:
    name = m.group(1)
    args = m.group(2)
    start = m.start()
    # find where this function is
    line_no = text[:start].count('\n') + 1
    print(f"L{line_no:4d}: function {name}({args})")

