import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=5)
    
    stdin, stdout, stderr = ssh.exec_command('docker inspect ft-backend --format "{{json .Mounts}}"')
    out = stdout.read().decode('utf-8')
    print("MOUNTS_JSON:", out)

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
