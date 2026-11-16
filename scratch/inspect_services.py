import os

services = ['CycleEngine.js', 'PdfExtractor.js', 'RequirementImporter.js', 'ScaleOptimizationService.js']
for s in services:
    p = os.path.join('backend/services', s)
    with open(p, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"=== {s} ({len(lines)} lines) ===")
    for l in lines[:25]:
        print(l.rstrip())
    print("...\n")

