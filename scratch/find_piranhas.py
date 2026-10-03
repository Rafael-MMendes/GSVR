import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
SELECT 
    ep.id_escala,
    ep.id_guarnicao,
    ep.id_ciclo,
    ep.data_servico,
    ep.horario_servico,
    ep.funcao,
    ep.nome_recurso,
    ep.observacoes,
    ep.publicado,
    e.nome_guerra,
    e.posto_graduacao
FROM ESCALA_PLANEJAMENTO ep
JOIN EFETIVO e ON ep.id_militar = e.id_militar
WHERE ep.nome_recurso ILIKE '%PIRANHAS%'
ORDER BY ep.data_servico DESC, ep.id_guarnicao, ep.horario_servico, ep.funcao;
"""

stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql)
stdin.channel.shutdown_write()

out = stdout.read().decode('utf-8', errors='replace')
print("--- OUTPUT ---")
print(out)
ssh.close()
