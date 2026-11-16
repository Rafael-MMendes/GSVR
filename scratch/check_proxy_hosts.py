import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "python3 -c \"import sqlite3; con = sqlite3.connect('/home/vps_9bpm/projetos/nginx-npm/data/database.sqlite'); cur = con.cursor(); print(cur.execute('SELECT id, domain_names, forward_host, forward_port, certificate_id, ssl_forced FROM proxy_host;').fetchall())\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Proxy hosts in SQLite:')
print(stdout.read().decode('utf-8'))

ssh.close()

