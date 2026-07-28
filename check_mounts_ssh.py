import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH ao servidor 192.168.1.119...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-backend pwd && docker exec -i ft-backend ls -la')
    print("--- FT-BACKEND WORKDIR & LS ---")
    print(stdout.read().decode('utf-8'))

    stdin, stdout, stderr = ssh.exec_command('docker inspect ft-backend')
    print("--- FT-BACKEND DOCKER INSPECT (MOUNTS / WORKINGDIR) ---")
    out = stdout.read().decode('utf-8')
    print(out[:1000])

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
