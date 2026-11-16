import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    server_text = f.read()

def extract_handler_details(route_call_prefix):
    pos = server_text.find(route_call_prefix)
    if pos == -1:
        raise ValueError(f"Route call not found: {route_call_prefix}")
    
    # Matches (req, res), (_req, res), (req, _res), (req, res, next), etc.
    m = re.search(r'(async\s*)?\((?:_?[a-zA-Z0-9]+,\s*_?[a-zA-Z0-9]+(?:,\s*_?[a-zA-Z0-9]+)?)\)\s*=>\s*\{', server_text[pos:])
    if not m:
        raise ValueError(f"Handler not found for: {route_call_prefix}")
    
    is_async = bool(m.group(1))
    handler_rel_start = m.start()
    body_rel_start = m.end() - 1
    
    call_header = server_text[pos : pos + handler_rel_start]
    
    body_abs_start = pos + body_rel_start
    depth = 0
    i = body_abs_start
    in_string = None
    while i < len(server_text):
        char = server_text[i]
        if in_string:
            if char == '\\':
                i += 2
                continue
            elif char == in_string:
                in_string = None
        else:
            if char in ("'", '"', '`'):
                in_string = char
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    body = server_text[body_abs_start : i + 1]
                    return {
                        'is_async': is_async,
                        'body': body,
                        'call_header': call_header
                    }
        i += 1
    raise ValueError(f"Unmatched braces for: {route_call_prefix}")

test_cfg = extract_handler_details("app.get('/api/ciclo-config'")
print("GET /api/ciclo-config header:", test_cfg['call_header'])
print("GET /api/ciclo-config body length:", len(test_cfg['body']))
