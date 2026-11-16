import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_sql(query):
    escaped = query.replace('"', '\\"')
    cmd = f'docker exec ft-postgres psql -U postgres -d escala_ft -c "{escaped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode()

print("=== IS id_disponibilidade NULLABLE IN escala_planejamento? ===")
print(run_sql("""
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'escala_planejamento' AND column_name = 'id_disponibilidade';
"""))

ssh.close()

