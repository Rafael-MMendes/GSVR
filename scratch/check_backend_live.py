import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

stdin, stdout, stderr = ssh.exec_command('docker inspect ft-backend --format "{{.Config.Cmd}}"')
print("Container Cmd:", stdout.read().decode('utf-8'))

stdin, stdout, stderr = ssh.exec_command('docker logs --tail 30 ft-backend')
print("Recent logs:\n", stdout.read().decode('utf-8'))

stdin, stdout, stderr = ssh.exec_command('curl -s -i http://127.0.0.1:3001/api/ciclos')
print("Curl output:\n", stdout.read().decode('utf-8')[:500])

ssh.close()

