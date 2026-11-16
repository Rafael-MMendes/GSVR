import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

def run_cmd(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return f"STDOUT:\n{out}\nSTDERR:\n{err}"

print("=== RUN DELETE 695 DIRECTLY VIA DOCKER EXEC ===")
print(run_cmd('docker exec ft-postgres psql -U postgres -d escala_ft -c "DELETE FROM REQUERIMENTOS WHERE id_requerimento = 695;"'))

ssh.close()

