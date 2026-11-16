import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode()

print("=== TABLES REFERENCING ESCALA_PLANEJAMENTO ===")
print(run_sql("""
SELECT
    tc.table_name, 
    kcu.column_name, 
    rc.delete_rule,
    rc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE rc.unique_constraint_name IN (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'escala_planejamento' AND constraint_type = 'PRIMARY KEY'
);
"""))

ssh.close()

