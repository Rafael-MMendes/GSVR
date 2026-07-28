import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=5)
    
    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-backend grep -n "COALESCE(p.opm, x.opm) AS opm" /usr/src/app/server.js')
    print("--- VERIFICAÇÃO FINAL NO BACKEND REMOTO ---")
    print(stdout.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
