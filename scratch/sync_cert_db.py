import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

s = """
import sqlite3
import json

con = sqlite3.connect('/home/vps_9bpm/projetos/nginx-npm/data/database.sqlite')
cur = con.cursor()
with open('/home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/npm-3/fullchain.pem') as f:
    cert_txt = f.read()
with open('/home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/npm-3/privkey.pem') as f:
    key_txt = f.read()

meta = json.dumps({'certificate': cert_txt, 'certificate_key': key_txt})
domain_names = json.dumps(['*.192.168.1.18.nip.io', '192.168.1.18.nip.io'])
cur.execute("UPDATE certificate SET meta = ?, domain_names = ? WHERE id = 3;", (meta, domain_names))
con.commit()
print("Updated certificate table!")
con.close()
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/update_cert_db.py', 'w') as f:
    f.write(s)
sftp.close()

_, stdout, stderr = ssh.exec_command('echo asdf1234 | sudo -S python3 /tmp/update_cert_db.py && rm /tmp/update_cert_db.py')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

_, stdout, stderr = ssh.exec_command('docker exec nginx-proxy-manager nginx -s reload')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

ssh.close()
