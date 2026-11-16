import re

with open('backend/db.js', 'r', encoding='utf-8') as f:
    text = f.read()

funcs = re.findall(r'CREATE OR REPLACE FUNCTION\s+([a-zA-Z0-9_]+)\s*\(\)\s*RETURNS TRIGGER AS \$\$(.*?)\$\$ LANGUAGE plpgsql;', text, re.DOTALL)
for fname, fbody in funcs:
    print(f"=== Function {fname} ===")
    print(fbody.strip()[:600])
    print("...\n")

