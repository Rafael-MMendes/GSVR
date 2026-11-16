with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("=== LINES 201 TO 430 ===")
for i in range(200, min(430, len(lines))):
    print(f"{i+1:4d}: {lines[i].rstrip()}")

