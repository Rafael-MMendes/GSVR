import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

print('=== NGINX PROXY MANAGER CONF FILES ===')
cmd = "docker exec nginx-proxy-manager ls -la /data/nginx/proxy_host"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

print('=== NGINX PROXY MANAGER CONF CONTENT ===')
cmd = "docker exec nginx-proxy-manager grep -rn '192.168.1.' /data/nginx/proxy_host"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

print('=== DOMAIN NAMES IN PROXY HOSTS ===')
cmd = "docker exec nginx-proxy-manager grep -rn 'server_name' /data/nginx/proxy_host"
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))

ssh.close()
