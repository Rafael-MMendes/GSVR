with open('backend/db.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in db.js: {len(lines)}")
for l in lines[-40:]:
    print(l.rstrip())

