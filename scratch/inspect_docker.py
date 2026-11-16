import os

files = ['docker-compose.yml', 'docker-compose.prod.yml', 'backend/Dockerfile', 'frontend/Dockerfile']
for f in files:
    if os.path.exists(f):
        print(f'=== {f} ===')
        with open(f, 'r', encoding='utf-8') as fl:
            print(fl.read()[:600])

