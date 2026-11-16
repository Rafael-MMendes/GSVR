import os
import re

comp_dir = 'frontend/src/components'
for fname in sorted(os.listdir(comp_dir)):
    if not fname.endswith('.jsx'): continue
    fpath = os.path.join(comp_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Extract component description / comments at top
    comments = re.findall(r'/\*\*?(.*?)\*/', code, re.DOTALL)
    top_comment = comments[0].strip() if comments else ""
    
    # Extract imports
    imports = [line.strip() for line in code.splitlines() if line.startswith('import ')][:4]
    
    # Count buttons, inputs, modals
    buttons = len(re.findall(r'<button\b', code))
    inputs = len(re.findall(r'<input\b', code))
    selects = len(re.findall(r'<select\b', code))
    
    print(f"=== {fname} ({len(code.splitlines())} lines) ===")
    if top_comment:
        print("  Doc:", top_comment.splitlines()[0][:80])
    print(f"  UI Elements: {buttons} buttons, {inputs} inputs, {selects} selects")
    endpoints = set(re.findall(r'(?:api|axios)\.(?:get|post|put|delete)\s*\(\s*[`\'"]([^`\'"]+)[`\'"]', code))
    if endpoints:
        print(f"  Endpoints: {list(endpoints)[:5]}")

