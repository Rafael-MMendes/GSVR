import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

queries = [
    ("Escalas de Alan Kleber no Ciclo 6", """
        SELECT ep.id_escala, ep.data_servico, ep.horario_servico, ep.nome_recurso, ep.funcao, se.id_execucao, ees.status as status_vinculo
        FROM ESCALA_PLANEJAMENTO ep
        LEFT JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
        LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
        WHERE ep.id_militar = 259 AND ep.id_ciclo = 6
        ORDER BY ep.data_servico ASC;
    """),
    ("Servicos Executados de Alan Kleber no Ciclo 6", """
        SELECT se.id_execucao, se.data_execucao, se.guarnicao, se.carga_horaria, se.valor_remuneracao, se.status_presenca
        FROM SERVICOS_EXECUTADOS se
        WHERE se.id_militar = 259 AND se.id_ciclo = 6
        ORDER BY se.data_execucao ASC;
    """)
]

for title, sql in queries:
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql.strip()}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(f"=== {title} ===")
    print(stdout.read().decode('utf-8'))

ssh.close()
