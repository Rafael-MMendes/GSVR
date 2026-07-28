import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH ao servidor 192.168.1.119...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-backend grep -n "opm" /usr/src/app/server.js')
    print("--- FT-BACKEND LINES MATCHING OPM IN SERVER.JS ---")
    print(stdout.read().decode('utf-8'))

    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-backend sed -n "2720,2770p" /usr/src/app/server.js')
    print("--- SERVER.JS LINES 2720-2770 IN FT-BACKEND WORKDIR ---")
    print(stdout.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
