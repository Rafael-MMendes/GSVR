import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return f"STDOUT:\n{out}\nSTDERR:\n{err}"

test_sql = """
BEGIN;

-- 1. Test updating FK constraint to ON DELETE SET NULL
ALTER TABLE escala_planejamento DROP CONSTRAINT escala_planejamento_id_disponibilidade_fkey;
ALTER TABLE escala_planejamento ADD CONSTRAINT escala_planejamento_id_disponibilidade_fkey 
    FOREIGN KEY (id_disponibilidade) REFERENCES disponibilidade_requerimento(id_disponibilidade) ON DELETE SET NULL;

-- 2. Test deleting requerimento 695
DELETE FROM REQUERIMENTOS WHERE id_requerimento = 695;

-- 3. Verify escala_planejamento row 9137
SELECT id_escala, id_militar, id_disponibilidade, data_servico FROM escala_planejamento WHERE id_escala = 9137;

ROLLBACK;
"""

print(run_sql(test_sql))
ssh.close()

