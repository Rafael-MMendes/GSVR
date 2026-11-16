import os
import glob
import re

# 1. Update frontend/src/components/*.jsx
comp_files = glob.glob('frontend/src/components/*.jsx')
for f in comp_files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    target_pattern = r"const API_URL = \(import\.meta\.env\.VITE_API_URL \|\| 'http://localhost:3001'\) \+ '/api';"
    if re.search(target_pattern, content):
        new_content = re.sub(target_pattern, "import { API_URL, getApiBaseUrl } from '../utils/apiConfig';", content)
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(new_content)
        print(f"Updated API_URL in {f}")

# 2. Update frontend/src/hooks/useAuth.js
use_auth_path = 'frontend/src/hooks/useAuth.js'
with open(use_auth_path, 'r', encoding='utf-8') as fp:
    content = fp.read()
target_pattern = r"const API_URL = \(import\.meta\.env\.VITE_API_URL \|\| 'http://localhost:3001'\) \+ '/api';"
if re.search(target_pattern, content):
    new_content = re.sub(target_pattern, "import { API_URL } from '../utils/apiConfig';", content)
    with open(use_auth_path, 'w', encoding='utf-8') as fp:
        fp.write(new_content)
    print("Updated useAuth.js")

# 3. Update frontend/src/App.jsx
app_path = 'frontend/src/App.jsx'
with open(app_path, 'r', encoding='utf-8') as fp:
    content = fp.read()
if "import { API_URL } from './utils/apiConfig';" not in content:
    content = "import { API_URL } from './utils/apiConfig';\n" + content
content = content.replace("`${(import.meta.env.VITE_API_URL || 'http://localhost:3001')}/api/auth/logout`", "`${API_URL}/auth/logout`")
with open(app_path, 'w', encoding='utf-8') as fp:
    fp.write(content)
print("Updated App.jsx")

# 4. Update ProfilePage.jsx avatarSrc
prof_path = 'frontend/src/components/ProfilePage.jsx'
with open(prof_path, 'r', encoding='utf-8') as fp:
    content = fp.read()
content = content.replace("`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${profile.avatar_url}`", "`${getApiBaseUrl()}${profile.avatar_url}`")
with open(prof_path, 'w', encoding='utf-8') as fp:
    fp.write(content)
print("Updated ProfilePage.jsx")

# 5. Update RelatorioOperacional.jsx
rel_path = 'frontend/src/components/RelatorioOperacional.jsx'
with open(rel_path, 'r', encoding='utf-8') as fp:
    content = fp.read()
content = content.replace("const urlBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';", "const urlBase = getApiBaseUrl();")
if "import { API_URL, getApiBaseUrl } from '../utils/apiConfig';" not in content:
    content = "import { API_URL, getApiBaseUrl } from '../utils/apiConfig';\n" + content
with open(rel_path, 'w', encoding='utf-8') as fp:
    fp.write(content)
print("Updated RelatorioOperacional.jsx")

