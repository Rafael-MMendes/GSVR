import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

# Dump all server blocks from nginx -T
stdin, stdout, stderr = ssh.exec_command("docker exec -i nginx-proxy-manager nginx -T")
out = stdout.read().decode('utf-8', errors='ignore')

for line in out.splitlines():
    if any(k in line for k in ["# configuration", "server_name", "listen ", "proxy_pass", "set $server", "set $port"]):
        print(line)

ssh.close()
