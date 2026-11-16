import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "curl -i -H 'Host: api.45.234.245.204.nip.io:36419' http://127.0.0.1/api/ciclos"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Test 1 (with port 36419 in Host):')
print(stdout.read().decode('utf-8'))

cmd = "curl -i -H 'Host: api.45.234.245.204.nip.io' http://127.0.0.1/api/ciclos"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Test 2 (without port in Host):')
print(stdout.read().decode('utf-8'))

ssh.close()

