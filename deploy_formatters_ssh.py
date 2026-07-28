import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH para enviar formatters.js...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    sftp = ssh.open_sftp()
    local_formatters = os.path.abspath("frontend/src/utils/formatters.js")
    remote_formatters = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/utils/formatters.js"
    print(f"Enviando {local_formatters} -> {remote_formatters}...")
    sftp.put(local_formatters, remote_formatters)
    sftp.close()

    stdin, stdout, stderr = ssh.exec_command("docker restart ft-frontend")
    print("REINICIANDO FT-FRONTEND:", stdout.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
