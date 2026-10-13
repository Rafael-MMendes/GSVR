import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

tables = ['users', 'efetivo', 'escala_planejamento', 'escala_efetivo_servico', 'ciclos', 'tipos_servico', 'servicos_executados']
for table in tables:
    sql = f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position;"
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(f"=== TABLE: {table} ===")
    print(stdout.read().decode('utf-8'))

ssh.close()
