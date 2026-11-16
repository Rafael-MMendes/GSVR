with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines[275:380], 276):
    print(f"{i:4d}: {l.rstrip()}")

