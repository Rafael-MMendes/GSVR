import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

remote_script = """import sqlite3

conn = sqlite3.connect('/tmp/npm.sqlite')
cursor = conn.cursor()

print('=== PROXY HOSTS ANTES ===')
for row in cursor.execute('SELECT id, domain_names, forward_host, forward_port FROM proxy_host'):
    print(row)

# Atualizar domain_names e forward_host
cursor.execute('''
    UPDATE proxy_host 
    SET domain_names = REPLACE(domain_names, 'nip.oi', 'nip.io')
''')

# Corrigir qualquer IP antigo no forward_host para 192.168.1.102
cursor.execute('''
    UPDATE proxy_host 
    SET forward_host = '192.168.1.102'
    WHERE forward_host LIKE '%192.168.1.%'
''')

conn.commit()

print('\\n=== PROXY HOSTS DEPOIS ===')
for row in cursor.execute('SELECT id, domain_names, forward_host, forward_port FROM proxy_host'):
    print(row)

conn.close()
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/update_db.py', 'w') as f:
    f.write(remote_script)
sftp.close()

cmds = [
    "docker cp nginx-proxy-manager:/data/database.sqlite /tmp/npm.sqlite",
    "python3 /tmp/update_db.py",
    "docker cp /tmp/npm.sqlite nginx-proxy-manager:/data/database.sqlite",
    "docker restart nginx-proxy-manager"
]

for cmd in cmds:
    print(f"Executando: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print("ERR:", err)

ssh.close()
