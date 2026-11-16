import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    # Escape double quotes
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode()

test_script = """
BEGIN;

-- 1. Cria requerimento no Ciclo 7 para quem tem no Ciclo 8 mas não no 7
INSERT INTO REQUERIMENTOS (id_militar, id_ciclo, numero_requerimento)
SELECT DISTINCT r8.id_militar, 7, r8.numero_requerimento
FROM REQUERIMENTOS r8
WHERE r8.id_ciclo = 8
  AND NOT EXISTS (
      SELECT 1 FROM REQUERIMENTOS r7 WHERE r7.id_militar = r8.id_militar AND r7.id_ciclo = 7
  );

-- 2. Cria requerimento no Ciclo 8 para quem tem no Ciclo 7 mas não no 8
INSERT INTO REQUERIMENTOS (id_militar, id_ciclo, numero_requerimento)
SELECT DISTINCT r7.id_militar, 8, r7.numero_requerimento
FROM REQUERIMENTOS r7
WHERE r7.id_ciclo = 7
  AND NOT EXISTS (
      SELECT 1 FROM REQUERIMENTOS r8 WHERE r8.id_militar = r7.id_militar AND r8.id_ciclo = 8
  );

-- 3. Mover/Mesclar disponibilidades que estão no Ciclo 8 mas pertencem ao Ciclo 7 (dia_mes <= '2026-11-15')
-- Primeiro, deleta conflitos se já existirem no destino
DELETE FROM DISPONIBILIDADE_REQUERIMENTO d8
USING DISPONIBILIDADE_REQUERIMENTO d7, REQUERIMENTOS r7, REQUERIMENTOS r8
WHERE r8.id_ciclo = 8 AND d8.id_requerimento = r8.id_requerimento
  AND r7.id_ciclo = 7 AND d7.id_requerimento = r7.id_requerimento
  AND r7.id_militar = r8.id_militar
  AND d8.dia_mes = d7.dia_mes
  AND d8.horario_turno = d7.horario_turno
  AND d8.dia_mes <= '2026-11-15';

-- Agora atualiza o id_requerimento das disponibilidades para apontar para o Ciclo 7
UPDATE DISPONIBILIDADE_REQUERIMENTO d8
SET id_requerimento = r7.id_requerimento
FROM REQUERIMENTOS r8, REQUERIMENTOS r7
WHERE r8.id_ciclo = 8 AND d8.id_requerimento = r8.id_requerimento
  AND r7.id_ciclo = 7 AND r7.id_militar = r8.id_militar
  AND d8.dia_mes <= '2026-11-15';

-- 4. Mover/Mesclar disponibilidades que estão no Ciclo 7 mas pertencem ao Ciclo 8 (dia_mes >= '2026-11-16')
-- Deleta conflitos se já existirem no destino
DELETE FROM DISPONIBILIDADE_REQUERIMENTO d7
USING DISPONIBILIDADE_REQUERIMENTO d8, REQUERIMENTOS r7, REQUERIMENTOS r8
WHERE r7.id_ciclo = 7 AND d7.id_requerimento = r7.id_requerimento
  AND r8.id_ciclo = 8 AND d8.id_requerimento = r8.id_requerimento
  AND r7.id_militar = r8.id_militar
  AND d7.dia_mes = d8.dia_mes
  AND d7.horario_turno = d8.horario_turno
  AND d7.dia_mes >= '2026-11-16';

-- Atualiza o id_requerimento para apontar para o Ciclo 8
UPDATE DISPONIBILIDADE_REQUERIMENTO d7
SET id_requerimento = r8.id_requerimento
FROM REQUERIMENTOS r7, REQUERIMENTOS r8
WHERE r7.id_ciclo = 7 AND d7.id_requerimento = r7.id_requerimento
  AND r8.id_ciclo = 8 AND r7.id_militar = r8.id_militar
  AND d7.dia_mes >= '2026-11-16';

-- Verificação após a operação:
SELECT 
    'Ciclo 7 contendo datas de Ciclo 8' as situacao,
    count(*) as total
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
WHERE r.id_ciclo = 7 AND d.dia_mes >= '2026-11-16'
UNION ALL
SELECT 
    'Ciclo 8 contendo datas de Ciclo 7' as situacao,
    count(*) as total
FROM DISPONIBILIDADE_REQUERIMENTO d
JOIN REQUERIMENTOS r ON d.id_requerimento = r.id_requerimento
WHERE r.id_ciclo = 8 AND d.dia_mes <= '2026-11-15';

ROLLBACK;
"""

print(run_sql(test_script))
ssh.close()

