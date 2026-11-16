import os
import glob
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')
sftp = ssh.open_sftp()

remote_base = '/home/vps_9bpm/projetos/GSVR - prod'

# 1. Upload apiConfig.js
local_api_config = 'frontend/src/utils/apiConfig.js'
remote_api_config = f'{remote_base}/frontend/src/utils/apiConfig.js'
print(f"Uploading {local_api_config} -> {remote_api_config}")
sftp.put(local_api_config, remote_api_config)

# 2. Upload vite.config.js
print("Uploading vite.config.js...")
sftp.put('frontend/vite.config.js', f'{remote_base}/frontend/vite.config.js')

# 3. Upload backend/server.js
print("Uploading backend/server.js...")
sftp.put('backend/server.js', f'{remote_base}/backend/server.js')

# 4. Upload App.jsx & useAuth.js
print("Uploading App.jsx & useAuth.js...")
sftp.put('frontend/src/App.jsx', f'{remote_base}/frontend/src/App.jsx')
sftp.put('frontend/src/hooks/useAuth.js', f'{remote_base}/frontend/src/hooks/useAuth.js')

# 5. Upload all components
comp_files = glob.glob('frontend/src/components/*.jsx')
for f in comp_files:
    fname = os.path.basename(f)
    remote_path = f'{remote_base}/frontend/src/components/{fname}'
    sftp.put(f, remote_path)
    print(f"Uploaded component: {fname}")

sftp.close()

# 6. Update 1.conf in NPM to also proxy /api/
update_1conf_script = """
import os

conf_path = '/home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host/1.conf'
with open(conf_path, 'r', encoding='utf-8') as f:
    content = f.read()

api_location = '''
  location /api/ {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Scheme $scheme;
    proxy_set_header X-Forwarded-Proto  $scheme;
    proxy_set_header X-Forwarded-For    $remote_addr;
    proxy_set_header X-Real-IP          $remote_addr;
    proxy_pass http://192.168.1.18:3001/api/;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_http_version 1.1;
  }
'''

if 'location /api/' not in content:
    target = '  location / {'
    if target in content:
        new_content = content.replace(target, api_location + '\\n' + target)
        with open(conf_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Added /api/ location to 1.conf!")
    else:
        print("Target location / { not found in 1.conf")
else:
    print("/api/ already in 1.conf")
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/update_1conf.py', 'w') as f:
    f.write(update_1conf_script)
sftp.close()

_, stdout, stderr = ssh.exec_command('echo asdf1234 | sudo -S python3 /tmp/update_1conf.py && rm /tmp/update_1conf.py')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

# Test and reload nginx
_, stdout, stderr = ssh.exec_command('docker exec nginx-proxy-manager nginx -t && docker exec nginx-proxy-manager nginx -s reload')
print('Nginx reload:')
print(stdout.read().decode('utf-8'))
print('Nginx stderr:', stderr.read().decode('utf-8'))

# Restart backend to apply trust proxy
_, stdout, stderr = ssh.exec_command('cd "/home/vps_9bpm/projetos/GSVR - prod" && docker compose restart backend')
print('Backend restart:')
print(stdout.read().decode('utf-8'))

ssh.close()
print("Deploy to server complete!")

