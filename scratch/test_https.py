import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "curl -k -v https://127.0.0.1 -H 'Host: gsvr.192.168.1.18.nip.io'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('HTTPS test on gsvr:')
print(stderr.read().decode('utf-8'))
print(stdout.read().decode('utf-8'))

cmd = "cat /home/vps_9bpm/projetos/nginx-npm/data/nginx/default_server.conf"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('default_server.conf:')
print(stdout.read().decode('utf-8'))

ssh.close()

