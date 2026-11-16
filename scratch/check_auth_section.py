with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Reading lines 430 to 455:")
for l in lines[429:455]:
    print(l.rstrip())

