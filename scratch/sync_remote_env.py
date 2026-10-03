import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

# 1. Checar .env raiz e frontend/.env no servidor
files = [
    '/home/vps_9bpm/projetos/GSVR - prod/.env',
    '/home/vps_9bpm/projetos/GSVR - prod/frontend/.env'
]

for f in files:
    stdin, stdout, stderr = ssh.exec_command(f'cat "{f}"')
    print(f"=== {f} ===")
    print(stdout.read().decode('utf-8'))

# 2. Atualizar 192.168.1.106 para 192.168.1.102 em todos os .env no servidor
update_cmd = (
    'sed -i "s/192.168.1.[0-9]*/192.168.1.102/g" '
    '"/home/vps_9bpm/projetos/GSVR - prod/.env" '
    '"/home/vps_9bpm/projetos/GSVR - prod/frontend/.env"'
)
print("Atualizando arquivos .env no servidor...")
stdin, stdout, stderr = ssh.exec_command(update_cmd)
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

# 3. Reiniciar ft-frontend e ft-backend
print("Reiniciando containers ft-frontend e ft-backend...")
stdin, stdout, stderr = ssh.exec_command('docker restart ft-frontend ft-backend')
print(stdout.read().decode('utf-8'))

ssh.close()
print("Sincronização no servidor concluída com sucesso!")
