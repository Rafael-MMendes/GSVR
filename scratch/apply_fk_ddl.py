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

ddl_sql = """
ALTER TABLE escala_planejamento DROP CONSTRAINT IF EXISTS escala_planejamento_id_disponibilidade_fkey;
ALTER TABLE escala_planejamento ADD CONSTRAINT escala_planejamento_id_disponibilidade_fkey 
    FOREIGN KEY (id_disponibilidade) REFERENCES disponibilidade_requerimento(id_disponibilidade) ON DELETE SET NULL;
"""

print(run_sql(ddl_sql))

# Verify constraint
print(run_sql("""
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'escala_planejamento_id_disponibilidade_fkey';
"""))

ssh.close()

