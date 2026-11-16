import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

print("=== NPM CERTIFICATES ===")
cmd = "docker exec nginx-proxy-manager ls -la /etc/letsencrypt/live"
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

cmd = "python3 -c \"import sqlite3; con = sqlite3.connect('/home/vps_9bpm/projetos/nginx-npm/data/database.sqlite'); cur = con.cursor(); print('Certificates:', cur.execute('SELECT id, nice_name, domain_names, expires_on FROM certificate;').fetchall()); print('Proxy hosts SSL:', cur.execute('SELECT id, domain_names, ssl_forced, certificate_id, hsts_enabled FROM proxy_host;').fetchall())\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

ssh.close()

