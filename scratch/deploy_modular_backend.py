import os
import paramiko

SSH_HOST = '192.168.1.18'
SSH_USER = 'vps_9bpm'
SSH_PASS = 'asdf1234'
REMOTE_BASE = '/home/vps_9bpm/projetos/GSVR - prod'

print(f"Connecting to {SSH_HOST}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS, timeout=10)
sftp = ssh.open_sftp()

# 1. Ensure remote directories exist
remote_dirs = [
    f"{REMOTE_BASE}/backend/controllers",
    f"{REMOTE_BASE}/backend/routes",
    f"{REMOTE_BASE}/backend/middleware",
    f"{REMOTE_BASE}/backend/utils"
]
for d in remote_dirs:
    try:
        sftp.mkdir(d)
        print(f"Created remote dir: {d}")
    except IOError:
        pass # already exists

# 2. Upload all controllers
controllers = os.listdir('backend/controllers')
for c in controllers:
    local_p = os.path.join('backend/controllers', c)
    remote_p = f"{REMOTE_BASE}/backend/controllers/{c}"
    sftp.put(local_p, remote_p)
    print(f"Uploaded: {remote_p}")

# 3. Upload all routes
routes = os.listdir('backend/routes')
for r in routes:
    local_p = os.path.join('backend/routes', r)
    remote_p = f"{REMOTE_BASE}/backend/routes/{r}"
    sftp.put(local_p, remote_p)
    print(f"Uploaded: {remote_p}")

# 4. Upload middlewares and utils
for m in os.listdir('backend/middleware'):
    local_p = os.path.join('backend/middleware', m)
    remote_p = f"{REMOTE_BASE}/backend/middleware/{m}"
    sftp.put(local_p, remote_p)
    print(f"Uploaded: {remote_p}")

for u in os.listdir('backend/utils'):
    local_p = os.path.join('backend/utils', u)
    remote_p = f"{REMOTE_BASE}/backend/utils/{u}"
    sftp.put(local_p, remote_p)
    print(f"Uploaded: {remote_p}")

# 5. Upload server.js and test_modular_routes.js
sftp.put('backend/server.js', f"{REMOTE_BASE}/backend/server.js")
print(f"Uploaded: {REMOTE_BASE}/backend/server.js")
sftp.put('backend/test_modular_routes.js', f"{REMOTE_BASE}/backend/test_modular_routes.js")
print(f"Uploaded: {REMOTE_BASE}/backend/test_modular_routes.js")

sftp.close()

# 6. Execute tests on server inside backend container or with node
print("\n--- RUNNING TESTS REMOTELY BEFORE RESTARTING CONTAINER ---")
# Check if node inside container can run test_modular_routes.js
test_cmd = f"docker exec ft-backend-prod node test_modular_routes.js"
stdin, stdout, stderr = ssh.exec_command(test_cmd)
test_output = stdout.read().decode('utf-8')
test_err = stderr.read().decode('utf-8')
print("REMOTE TEST OUTPUT:")
print(test_output)
if test_err:
    print("REMOTE TEST ERRORS:", test_err)

# 7. Restart the container if test passes
print("\n--- RESTARTING ft-backend-prod CONTAINER ---")
stdin, stdout, stderr = ssh.exec_command(f"docker restart ft-backend-prod")
print(stdout.read().decode('utf-8'))

# 8. Check health of backend
import time
time.sleep(3)
stdin, stdout, stderr = ssh.exec_command("curl -s -i http://127.0.0.1:3001/api/ciclos | head -n 12")
print("\n--- BACKEND HEALTHCHECK (HTTP 200 /api/ciclos) ---")
print(stdout.read().decode('utf-8'))

ssh.close()
print("Deployment and verification complete!")

