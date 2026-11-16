import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

s = """
import sqlite3
con = sqlite3.connect('/home/vps_9bpm/projetos/nginx-npm/data/database.sqlite')
cur = con.cursor()
cur.execute("UPDATE proxy_host SET domain_names = REPLACE(domain_names, '192.168.1.104', '192.168.1.18');")
cur.execute("UPDATE proxy_host SET forward_host = REPLACE(forward_host, '192.168.1.104', '192.168.1.18');")
con.commit()
print('Changes:', con.total_changes)
con.close()
"""
sftp = ssh.open_sftp()
with sftp.file('/tmp/update_npm.py', 'w') as f:
    f.write(s)
sftp.close()

_, stdout, stderr = ssh.exec_command('python3 /tmp/update_npm.py && rm /tmp/update_npm.py')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

# Reload NPM
_, stdout, stderr = ssh.exec_command('sed -i "s/192.168.1.104/192.168.1.18/g" /home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host/*.conf && docker exec nginx-proxy-manager nginx -s reload')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

ssh.close()

