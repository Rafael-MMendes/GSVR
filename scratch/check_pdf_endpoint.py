with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines, 1):
    if 'RequirementImporter' in l or 'uploadPdf' in l or 'import/pdf' in l or 'import' in l and 'pdf' in l.lower():
        print(f"L{i:4d}: {l.strip()}")

