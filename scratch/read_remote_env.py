import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

files = [
    '/home/vps_9bpm/projetos/GSVR - prod/.env',
    '/home/vps_9bpm/projetos/GSVR - prod/frontend/.env'
]

for f in files:
    stdin, stdout, stderr = ssh.exec_command(f'cat "{f}"')
    print(f"=== {f} ===")
    print(stdout.read().decode('utf-8'))

ssh.close()

