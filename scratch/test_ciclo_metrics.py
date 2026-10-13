import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

test_militar_id = 259 # Alan Kleber

sql = f"""
WITH CicloAtual AS (
  SELECT id_ciclo, data_inicio, data_fim,
         TO_CHAR(data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(data_fim, 'DD/MM/YYYY') as periodo_ciclo
  FROM CICLOS
  WHERE status = 'Aberto' OR (CURRENT_DATE BETWEEN data_inicio AND data_fim)
  ORDER BY ativo DESC, data_inicio DESC
  LIMIT 1
)
SELECT 
  ca.id_ciclo,
  ca.periodo_ciclo,
  (SELECT COUNT(*) FROM ESCALA_PLANEJAMENTO ep WHERE ep.id_militar = {test_militar_id} AND ep.id_ciclo = ca.id_ciclo AND (ep.publicado IS NULL OR ep.publicado = TRUE)) as total_escalas_ciclo,
  (
    SELECT COUNT(DISTINCT COALESCE(se.id_execucao, ep.id_escala))
    FROM ESCALA_PLANEJAMENTO ep
    LEFT JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
    LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
    WHERE ep.id_militar = {test_militar_id} 
      AND ep.id_ciclo = ca.id_ciclo
      AND (se.id_execucao IS NOT NULL OR ep.data_servico < CURRENT_DATE)
      AND (ep.publicado IS NULL OR ep.publicado = TRUE)
  ) as total_executadas_ciclo,
  (SELECT COUNT(*) FROM ESCALA_PLANEJAMENTO ep WHERE ep.id_militar = {test_militar_id} AND ep.data_servico >= CURRENT_DATE AND (ep.publicado IS NULL OR ep.publicado = TRUE)) as total_futuras
FROM CicloAtual ca;
"""

cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql.strip()}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== METRICAS NO CICLO ATUAL ===")
print(stdout.read().decode('utf-8'))

ssh.close()
