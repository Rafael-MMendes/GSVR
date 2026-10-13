import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

sql = """
SELECT 
  ep2.id_escala,
  ep2.funcao,
  e.posto_graduacao,
  e.nome_guerra
FROM ESCALA_PLANEJAMENTO ep2
JOIN EFETIVO e ON ep2.id_militar = e.id_militar
WHERE ep2.id_guarnicao = 'g_1791902201675_1_liphf'
ORDER BY 
  CASE ep2.funcao 
    WHEN 'Comandante' THEN 1 
    WHEN 'Motorista' THEN 2 
    WHEN 'Patrulheiro' THEN 3 
    ELSE 4 
  END;
"""
cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql.strip()}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== TEAM MEMBERS SAMPLE ===")
print(stdout.read().decode('utf-8'))

ssh.close()
