import os
import paramiko

HOST = '192.168.1.18'
USER = 'vps_9bpm'
PASS = 'asdf1234'
REMOTE_BASE = '/home/vps_9bpm/projetos/GSVR - prod'

LOCAL_BASE = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR'

files_to_sync = [
    ('frontend/src/utils/axiosSetup.js', 'frontend/src/utils/axiosSetup.js'),
    ('frontend/src/main.jsx', 'frontend/src/main.jsx'),
    ('frontend/src/App.jsx', 'frontend/src/App.jsx'),
    ('frontend/src/components/RequerimentosAdmin.jsx', 'frontend/src/components/RequerimentosAdmin.jsx'),
    ('backend/server.js', 'backend/server.js'),
    ('VERSION.md', 'VERSION.md'),
]

print(f"Connecting to {HOST} via SSH/SFTP...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=10)
sftp = ssh.open_sftp()

for rel_local, rel_remote in files_to_sync:
    local_path = os.path.join(LOCAL_BASE, rel_local.replace('/', os.sep))
    remote_path = f"{REMOTE_BASE}/{rel_remote}"
    
    # Ensure remote directory exists
    remote_dir = os.path.dirname(remote_path)
    try:
        ssh.exec_command(f'mkdir -p "{remote_dir}"')
    except Exception as e:
        pass

    print(f"Uploading {rel_local} -> {remote_path}")
    sftp.put(local_path, remote_path)

sftp.close()

print("\nRestarting containers ft-backend and ft-frontend...")
stdin, stdout, stderr = ssh.exec_command('docker restart ft-backend ft-frontend')
print(stdout.read().decode())
print(stderr.read().decode())

print("\nChecking container status...")
stdin, stdout, stderr = ssh.exec_command('docker ps --filter "name=ft-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
print(stdout.read().decode())

print("\nChecking backend logs...")
stdin, stdout, stderr = ssh.exec_command('docker logs --tail 20 ft-backend')
print(stdout.read().decode())

ssh.close()
print("Deployment completed successfully!")

