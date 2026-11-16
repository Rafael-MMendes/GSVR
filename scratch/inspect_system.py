import os
import re

# 1. Routes in backend/server.js
with open('backend/server.js', 'r', encoding='utf-8') as f:
    server_lines = f.readlines()

print('=== BACKEND ROUTES ===')
routes = []
for i, line in enumerate(server_lines, 1):
    m = re.search(r'app\.(get|post|put|delete|patch)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', line)
    if m:
        method = m.group(1).upper()
        path = m.group(2)
        routes.append((i, method, path))
        print(f"L{i:4d}: {method:6s} {path}")

print(f"\nTotal Routes: {len(routes)}")

# 2. Frontend Components
print('\n=== FRONTEND COMPONENTS ===')
comp_dir = 'frontend/src/components'
components = [f for f in os.listdir(comp_dir) if f.endswith('.jsx')]
print(f"Total Components in {comp_dir}: {len(components)}")
for c in sorted(components):
    path = os.path.join(comp_dir, c)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Find hooks and endpoints used
    apis = set(re.findall(r'api\.(?:get|post|put|delete)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', content))
    apis_fetch = set(re.findall(r'fetch\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', content))
    apis_axios = set(re.findall(r'axios\.(?:get|post|put|delete)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', content))
    total_endpoints = apis.union(apis_fetch).union(apis_axios)
    print(f"  {c:30s} (size: {len(content):6d} chars, {len(content.splitlines()):4d} lines) | Calls: {len(total_endpoints)} API endpoints")

# 3. Services in backend/services
print('\n=== BACKEND SERVICES ===')
svc_dir = 'backend/services'
if os.path.exists(svc_dir):
    for s in os.listdir(svc_dir):
        if s.endswith('.js'):
            with open(os.path.join(svc_dir, s), 'r', encoding='utf-8') as f:
                c = f.read()
            print(f"  {s:30s} ({len(c.splitlines())} lines)")

# 4. Middleware & Utils
print('\n=== BACKEND UTILS & MIDDLEWARE ===')
for d in ['backend/middleware', 'backend/utils']:
    if os.path.exists(d):
        for s in os.listdir(d):
            if s.endswith('.js'):
                with open(os.path.join(d, s), 'r', encoding='utf-8') as f:
                    c = f.read()
                print(f"  {d}/{s:25s} ({len(c.splitlines())} lines)")


# 5. App.jsx Tabs and Navigation
with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    app_text = f.read()

tabs = set(re.findall(r'activeTab\s*===\s*[\'"`]([^\'"`]+)[\'"`]', app_text))
print('\n=== FRONTEND TABS & NAVIGATION (App.jsx) ===')
for t in sorted(tabs):
    print(f"  Tab: '{t}'")

# 6. Database schema entities & tables
with open('backend/db.js', 'r', encoding='utf-8') as f:
    db_text = f.read()

tables_blocks = re.findall(r'CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)\s*\((.*?)\);', db_text, re.DOTALL | re.IGNORECASE)
print(f'\n=== DETAILED TABLES IN DB.JS ({len(tables_blocks)}) ===')
for tname, body in tables_blocks:
    cols = [line.strip().split()[0] for line in body.splitlines() if line.strip() and not line.strip().startswith('--') and not line.strip().startswith('CONSTRAINT') and not line.strip().startswith('PRIMARY') and not line.strip().startswith('FOREIGN') and not line.strip().startswith('UNIQUE')]
    print(f"  Table {tname:30s} -> Columns: {', '.join(cols[:8])}{'...' if len(cols)>8 else ''}")
