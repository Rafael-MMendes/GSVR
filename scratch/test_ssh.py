import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando SSH...")
    ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5, banner_timeout=5, auth_timeout=5)
    print("Conectado com sucesso!")
    stdin, stdout, stderr = ssh.exec_command('hostname')
    print("Hostname:", stdout.read().decode())
    ssh.close()
except Exception as e:
    print("Erro SSH:", type(e), e)
