import os

for path in ['frontend/src/hooks/useAuth.js', 'frontend/src/utils/apiConfig.js', 'frontend/src/utils/axiosSetup.js']:
    print(f"=== {path} ===")
    with open(path, 'r', encoding='utf-8') as f:
        print(f.read())

