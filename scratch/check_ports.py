import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

stdin, stdout, stderr = ssh.exec_command('docker ps --filter "name=ft-"')
print("=== FT CONTAINERS ===")
print(stdout.read().decode('utf-8'))

ssh.close()
