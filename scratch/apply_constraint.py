import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
DO $$ 
BEGIN 
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'efetivo_matricula_key'
  ) THEN
      ALTER TABLE EFETIVO ADD CONSTRAINT efetivo_matricula_key UNIQUE (matricula);
  END IF;
END $$;
"""

stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft')
stdin.write(sql)
stdin.channel.shutdown_write()

print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
