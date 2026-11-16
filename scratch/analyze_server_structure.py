import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in server.js: {len(lines)}")

# Search for comments, route blocks, middlewares, helper functions
sections = []
for i, line in enumerate(lines, 1):
    # comments with === or --- or Section headers
    if re.search(r'//\s*[=─-]{3,}|//\s*ROTAS?|//\s*AUTH|//\s*MIDDLEWARE|//\s*ENDPOINTS?', line, re.IGNORECASE):
        sections.append((i, line.strip()))
    elif re.match(r'^(?:const|let|function|class)\s+([a-zA-Z0-9_]+)', line):
        name = re.match(r'^(?:const|let|function|class)\s+([a-zA-Z0-9_]+)', line).group(1)
        if name in ['authenticate', 'authorize', 'app', 'db', 'JWT_SECRET', 'upload', 'loginLimiter', 'authLimiter']:
            sections.append((i, f"DECLARATION: {name}"))

print(f"Key sections detected: {len(sections)}")
for s in sections[:40]:
    print(f"L{s[0]:4d}: {s[1]}")

