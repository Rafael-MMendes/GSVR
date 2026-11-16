with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines[4479:4520], 4480):
    print(f"{i:4d}: {l.rstrip()}")

