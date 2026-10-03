import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
SELECT 
    data_servico,
    id_ciclo,
    nome_recurso,
    horario_servico,
    id_guarnicao,
    COUNT(*) as total_membros,
    COUNT(CASE WHEN funcao = 'Comandante' THEN 1 END) as comandantes,
    COUNT(CASE WHEN funcao = 'Motorista' THEN 1 END) as motoristas,
    COUNT(CASE WHEN funcao = 'Patrulheiro' THEN 1 END) as patrulheiros
FROM ESCALA_PLANEJAMENTO
GROUP BY data_servico, id_ciclo, nome_recurso, horario_servico, id_guarnicao
HAVING COUNT(*) > 3
ORDER BY data_servico DESC;
"""

stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql)
stdin.channel.shutdown_write()

out = stdout.read().decode('utf-8', errors='replace')
print("--- GUARNIÇÕES COM MAIS DE 3 MEMBROS (CONFLITO DE AGRUPAMENTO) ---")
print(out)
ssh.close()
