with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("=== LINES 1 TO 200 ===")
for i in range(0, min(200, len(lines))):
    print(f"{i+1:4d}: {lines[i].rstrip()}")

