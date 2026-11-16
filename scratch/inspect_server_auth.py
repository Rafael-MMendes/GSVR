import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('=== MIDDLEWARES & AUTH IN SERVER.JS ===')
for i, line in enumerate(lines[:450], 1):
    if any(k in line for k in ['authenticate', 'authorize', 'rateLimit', 'helmet', 'cors(', 'jwt.', 'bcrypt.']):
        print(f"L{i:4d}: {line.strip()}")

