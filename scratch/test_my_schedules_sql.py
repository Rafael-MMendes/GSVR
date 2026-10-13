import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

test_militar_id = 204 # CARVALHO

sql_summary = f"""
SELECT
  COUNT(CASE WHEN ep.data_servico >= CURRENT_DATE THEN 1 END) as total_futuras,
  COUNT(CASE WHEN EXTRACT(MONTH FROM ep.data_servico) = EXTRACT(MONTH FROM CURRENT_DATE) 
              AND EXTRACT(YEAR FROM ep.data_servico) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as total_mes_atual,
  COUNT(CASE WHEN EXTRACT(MONTH FROM ep.data_servico) = EXTRACT(MONTH FROM CURRENT_DATE) 
              AND EXTRACT(YEAR FROM ep.data_servico) = EXTRACT(YEAR FROM CURRENT_DATE)
              AND (ep.data_servico < CURRENT_DATE OR se.id_execucao IS NOT NULL) THEN 1 END) as total_realizadas_mes,
  COUNT(*) as total_geral
FROM ESCALA_PLANEJAMENTO ep
LEFT JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
WHERE ep.id_militar = {test_militar_id}
  AND (ep.publicado IS NULL OR ep.publicado = TRUE);
"""

sql_proxima = f"""
SELECT 
  ep.id_escala,
  ep.data_servico,
  TO_CHAR(ep.data_servico, 'YYYY-MM-DD') as data_iso,
  TO_CHAR(ep.data_servico, 'DD/MM/YYYY') as data_formatada,
  ep.horario_servico,
  ep.horario_embarque,
  ep.nome_recurso,
  ep.funcao,
  ep.observacoes,
  ts.descricao as tipo_servico,
  ts.carga_horaria,
  ts.valor_remuneracao,
  c.id_ciclo,
  o.sigla as opm_sigla
FROM ESCALA_PLANEJAMENTO ep
JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
LEFT JOIN OPM o ON c.id_opm = o.id_opm
LEFT JOIN TIPOS_SERVICO ts ON ep.id_tipo_servico = ts.id_tipo_servico
WHERE ep.id_militar = {test_militar_id}
  AND ep.data_servico >= CURRENT_DATE
  AND (ep.publicado IS NULL OR ep.publicado = TRUE)
ORDER BY ep.data_servico ASC, ep.horario_servico ASC
LIMIT 1;
"""

sql_list = f"""
SELECT 
  ep.id_escala,
  ep.id_ciclo,
  ep.id_militar,
  ep.id_guarnicao,
  ep.data_servico,
  TO_CHAR(ep.data_servico, 'YYYY-MM-DD') as data_iso,
  TO_CHAR(ep.data_servico, 'DD/MM/YYYY') as data_formatada,
  EXTRACT(DOW FROM ep.data_servico)::int as dia_semana_num,
  ep.horario_servico,
  ep.horario_embarque,
  ep.nome_recurso,
  ep.funcao,
  ep.observacoes,
  ep.publicado,
  ts.id_tipo_servico,
  ts.descricao as tipo_servico,
  ts.carga_horaria,
  ts.valor_remuneracao,
  c.status as status_ciclo,
  c.data_inicio as ciclo_inicio,
  c.data_fim as ciclo_fim,
  o.sigla as opm_sigla,
  ees.status as status_vinculo,
  se.id_execucao,
  se.status_presenca,
  se.valor_remuneracao as valor_executado,
  CASE
    WHEN ep.publicado = FALSE THEN 'Rascunho'
    WHEN se.id_execucao IS NOT NULL THEN 'Realizada'
    WHEN ep.data_servico > CURRENT_DATE THEN 'Confirmada'
    WHEN ep.data_servico = CURRENT_DATE THEN 'Hoje'
    ELSE 'Realizada'
  END as situacao
FROM ESCALA_PLANEJAMENTO ep
JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
LEFT JOIN OPM o ON c.id_opm = o.id_opm
LEFT JOIN TIPOS_SERVICO ts ON ep.id_tipo_servico = ts.id_tipo_servico
LEFT JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
WHERE ep.id_militar = {test_militar_id}
  AND (ep.publicado IS NULL OR ep.publicado = TRUE)
ORDER BY ep.data_servico DESC, ep.horario_servico ASC
LIMIT 5;
"""

for title, sql in [("SUMMARY", sql_summary), ("PROXIMA", sql_proxima), ("LIST SAMPLE", sql_list)]:
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql.strip()}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(f"=== {title} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print("ERR:", err)

ssh.close()
