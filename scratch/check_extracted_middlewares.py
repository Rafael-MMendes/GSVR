import re
from generate_all_modules import all_routes_spec, extract_handler_details

for prefix, domain, name, method, route_path in all_routes_spec:
    d = extract_handler_details(prefix)
    header = d['call_header']
    # remove app.method('path',
    header_clean = re.sub(r'app\.(?:get|post|put|delete)\s*\(\s*[\'"`][^\'"`]+[\'"`]\s*,\s*', '', header, flags=re.DOTALL).strip()
    if header_clean.endswith(','):
        header_clean = header_clean[:-1].strip()
    print(f"[{domain:12s}] {method.upper():6s} {route_path:35s} | Middlewares: {header_clean if header_clean else 'None'}")

