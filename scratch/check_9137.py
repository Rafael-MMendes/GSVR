import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = 'docker exec ft-postgres psql -U postgres -d escala_ft -c "SELECT id_escala, id_militar, id_disponibilidade, data_servico, funcao FROM escala_planejamento WHERE id_escala = 9137;"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()

