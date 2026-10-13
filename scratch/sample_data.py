import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

queries = [
    ("Sample standard users (is_admin=0)", "SELECT u.id, u.numero_ordem, u.is_admin, e.id_militar, e.nome_completo, e.nome_guerra, e.posto_graduacao, e.matricula FROM users u LEFT JOIN efetivo e ON (e.matricula = u.numero_ordem OR e.numero_ordem = u.numero_ordem) WHERE u.is_admin = 0 LIMIT 5;"),
    ("Count of escalas per militar sample", "SELECT ep.id_militar, e.nome_guerra, e.matricula, count(*) as total_escalas FROM escala_planejamento ep JOIN efetivo e ON ep.id_militar = e.id_militar GROUP BY ep.id_militar, e.nome_guerra, e.matricula ORDER BY total_escalas DESC LIMIT 5;"),
    ("Sample escala_planejamento row", "SELECT ep.id_escala, ep.id_ciclo, ep.id_militar, ep.data_servico, ep.horario_servico, ep.nome_recurso, ep.funcao, ep.observacoes, ep.publicado, ts.descricao as tipo_servico, ts.carga_horaria, ts.valor_remuneracao FROM escala_planejamento ep LEFT JOIN tipos_servico ts ON ep.id_tipo_servico = ts.id_tipo_servico LIMIT 3;")
]

for title, sql in queries:
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(f"=== {title} ===")
    print(stdout.read().decode('utf-8'))

ssh.close()
