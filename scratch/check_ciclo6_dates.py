import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
SELECT 
    ep.data_servico,
    COUNT(DISTINCT ep.id_escala) as total_escalas,
    COUNT(DISTINCT ep.id_guarnicao) as total_guarnicoes,
    COUNT(DISTINCT ep.nome_recurso) as total_recursos
FROM ESCALA_PLANEJAMENTO ep
WHERE ep.id_ciclo = 6
GROUP BY ep.data_servico
ORDER BY ep.data_servico;
"""

stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql)
stdin.channel.shutdown_write()

out = stdout.read().decode('utf-8', errors='replace')
print("--- DATAS DO CICLO 6 ---")
print(out)
ssh.close()
