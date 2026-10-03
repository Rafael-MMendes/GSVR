import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

# Inspecionar compose file e working dir do ft-frontend
stdin, stdout, stderr = ssh.exec_command('docker inspect ft-frontend --format "{{index .Config.Labels \\"com.docker.compose.project.working_dir\\"}}"')
work_dir = stdout.read().decode('utf-8').strip()
print("Working dir:", work_dir)

stdin, stdout, stderr = ssh.exec_command('docker inspect ft-frontend --format "{{index .Config.Labels \\"com.docker.compose.project.config_files\\"}}"')
config_file = stdout.read().decode('utf-8').strip()
print("Config file:", config_file)

# Recriar os containers ft-frontend e ft-backend com docker compose up -d
recreate_cmd = f'cd "{work_dir}" && docker compose -f "{config_file}" up -d --force-recreate frontend backend'
print(f"Executando: {recreate_cmd}")
stdin, stdout, stderr = ssh.exec_command(recreate_cmd)
print("STDOUT:\n", stdout.read().decode('utf-8'))
print("STDERR:\n", stderr.read().decode('utf-8'))

# Checar novo env
stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-frontend env | grep VITE_API_URL')
print("Novo VITE_API_URL em ft-frontend:", stdout.read().decode('utf-8'))

ssh.close()
