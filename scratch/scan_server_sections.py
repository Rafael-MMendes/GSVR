import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if line.strip().startswith('//') and any(w in line.upper() for w in ['AUTH', 'ROLES', 'EFETIVO', 'CICLO', 'ESCALA', 'SERVIC', 'RELAT', 'OPM', 'USUARIO', 'VOLUNT', 'DIAGNOST', 'AUDIT', 'METAS', 'GASTOS', 'FINANCEIRO', 'IMPORT']):
        print(f"L{i:4d}: {line.strip()}")

