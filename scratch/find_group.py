import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
SELECT 
    ep.data_servico, 
    ep.id_ciclo, 
    ep.id_guarnicao, 
    ep.nome_recurso, 
    ep.horario_servico, 
    ep.funcao, 
    e.nome_guerra,
    e.posto_graduacao
FROM ESCALA_PLANEJAMENTO ep 
JOIN EFETIVO e ON ep.id_militar = e.id_militar 
WHERE e.nome_guerra IN ('C. PEREIRA', 'GRECIO', 'MARNO GUERRA', 'HEIDER', 'WDSON', 'ALAN KLEBER', 'CARVALHO', 'JAILSON')
ORDER BY ep.data_servico DESC, ep.nome_recurso;
"""

stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql)
stdin.channel.shutdown_write()

out = stdout.read().decode('utf-8', errors='replace')
print("--- RESULTADO ---")
print(out)
ssh.close()
