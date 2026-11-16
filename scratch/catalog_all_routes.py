import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()
    lines = text.splitlines()

print(f"Total lines: {len(lines)}")

# Find all app.(get|post|put|delete|patch)
route_pattern = re.compile(r'app\.(get|post|put|delete|patch)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', re.IGNORECASE)

routes = []
for i, line in enumerate(lines):
    m = route_pattern.search(line)
    if m:
        routes.append({
            'line': i + 1,
            'method': m.group(1).upper(),
            'path': m.group(2)
        })

print(f"Total routes found: {len(routes)}")

# Find all functions defined
func_pattern = re.compile(r'^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(', re.MULTILINE)
funcs = func_pattern.findall(text)
print(f"Functions defined: {funcs}")

# Find all helpers / classes
class_pattern = re.compile(r'^class\s+([a-zA-Z0-9_]+)', re.MULTILINE)
classes = class_pattern.findall(text)
print(f"Classes defined: {classes}")

# List all routes with line ranges
for idx, r in enumerate(routes):
    next_line = routes[idx + 1]['line'] if idx + 1 < len(routes) else len(lines)
    print(f"L{r['line']:4d} - L{next_line:4d}: {r['method']:6s} {r['path']}")

