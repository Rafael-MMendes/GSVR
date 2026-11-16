import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

s = """
import sqlite3
con = sqlite3.connect('/home/vps_9bpm/projetos/nginx-npm/data/database.sqlite')
cur = con.cursor()
cur.execute("UPDATE proxy_host SET certificate_id = 3 WHERE certificate_id = 0;")
con.commit()
print("Updated proxy_host table, modified rows:", con.total_changes)
con.close()
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/enable_ssl_db.py', 'w') as f:
    f.write(s)
sftp.close()

_, stdout, stderr = ssh.exec_command('echo asdf1234 | sudo -S python3 /tmp/enable_ssl_db.py && rm /tmp/enable_ssl_db.py')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

# Now let's update the conf files to add listen 443 ssl and ssl_certificate if not present
script = """#!/bin/bash
cd /home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host

for f in 1.conf 2.conf 3.conf 5.conf 7.conf 10.conf 12.conf; do
    if [ -f "$f" ]; then
        if ! grep -q "listen 443 ssl" "$f"; then
            sed -i '/listen \[::\]:80;/a \listen 443 ssl;\nlisten [::]:443 ssl;\n  ssl_certificate /data/custom_ssl/npm-3/fullchain.pem;\n  ssl_certificate_key /data/custom_ssl/npm-3/privkey.pem;' "$f"
            echo "Added SSL to $f"
        fi
    fi
done

# In default.conf, also replace reject_handshake with fallback cert
sed -i 's/ssl_reject_handshake on;/ssl_certificate \/data\/custom_ssl\/npm-3\/fullchain.pem;\nssl_certificate_key \/data\/custom_ssl\/npm-3\/privkey.pem;/' /home/vps_9bpm/projetos/nginx-npm/data/nginx/default_server.conf 2>/dev/null || true

docker exec nginx-proxy-manager nginx -t
docker exec nginx-proxy-manager nginx -s reload
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/update_confs.sh', 'w') as f:
    f.write(script)
sftp.close()

_, stdout, stderr = ssh.exec_command('echo asdf1234 | sudo -S bash /tmp/update_confs.sh && rm /tmp/update_confs.sh')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

ssh.close()

