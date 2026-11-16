import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

def extract_route_handler(text, route_start_str):
    pos = text.find(route_start_str)
    if pos == -1:
        raise ValueError(f"Route not found: {route_start_str}")
    
    m = re.search(r'(?:async\s*)?\((?:req,\s*res|req,\s*res,\s*next)\)\s*=>\s*\{', text[pos:])
    if not m:
        raise ValueError(f"Handler not found for: {route_start_str}")
    
    handler_start = pos + m.start()
    body_start = pos + m.end() - 1 # at the '{'
    
    depth = 0
    i = body_start
    in_string = None
    while i < len(text):
        char = text[i]
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
                    return text[body_start : i + 1]
        i += 1
    raise ValueError(f"Unmatched braces for: {route_start_str}")

test_body = extract_route_handler(text, "app.post('/api/login'")
print("Extracted login body length:", len(test_body))
print("First 100 chars:", repr(test_body[:100]))
print("Last 100 chars:", repr(test_body[-100:]))
