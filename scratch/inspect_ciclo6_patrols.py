import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    cmd = """docker exec ft-postgres psql -U postgres -d escala_ft -c "
      SELECT data_servico, horario_servico, COUNT(DISTINCT id_guarnicao) as qtd_gu
      FROM ESCALA_PLANEJAMENTO
      WHERE id_ciclo = 6
      GROUP BY data_servico, horario_servico
      ORDER BY data_servico, horario_servico
      LIMIT 25;
    " """
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out.encode('ascii', errors='replace').decode('ascii'))
finally:
    ssh.close()
