import os

utils = ['middleware/uploadValidation.js', 'utils/audit.js', 'utils/cpf.js', 'utils/totp.js']
for u in utils:
    p = os.path.join('backend', u)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        print(f"=== {u} ({len(lines)} lines) ===")
        for l in lines[:20]:
            print(l.rstrip())
        print("...\n")

