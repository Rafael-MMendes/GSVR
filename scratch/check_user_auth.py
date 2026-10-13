import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

queries = [
    ("Users with highest scale count", """
        SELECT u.id, u.numero_ordem, u.is_admin, e.cpf, e.nome_guerra, count(ep.id_escala) as total_escalas
        FROM users u
        JOIN efetivo e ON (e.matricula = u.numero_ordem OR e.numero_ordem = u.numero_ordem)
        LEFT JOIN escala_planejamento ep ON ep.id_militar = e.id_militar
        WHERE u.is_admin = 0
        GROUP BY u.id, u.numero_ordem, u.is_admin, e.cpf, e.nome_guerra
        HAVING count(ep.id_escala) > 0
        ORDER BY total_escalas DESC
        LIMIT 3;
    """),
    ("Users with 0 scales", """
        SELECT u.id, u.numero_ordem, u.is_admin, e.cpf, e.nome_guerra, count(ep.id_escala) as total_escalas
        FROM users u
        JOIN efetivo e ON (e.matricula = u.numero_ordem OR e.numero_ordem = u.numero_ordem)
        LEFT JOIN escala_planejamento ep ON ep.id_militar = e.id_militar
        WHERE u.is_admin = 0
        GROUP BY u.id, u.numero_ordem, u.is_admin, e.cpf, e.nome_guerra
        HAVING count(ep.id_escala) = 0
        LIMIT 3;
    """)
]

for title, sql in queries:
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql.strip()}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(f"=== {title} ===")
    print(stdout.read().decode('utf-8'))

ssh.close()
