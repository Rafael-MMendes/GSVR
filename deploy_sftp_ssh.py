import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    sftp = ssh.open_sftp()
    
    # 1. Enviar backend/server.js para o host remoto /home/vps_9bpm/projetos/GSVR - prod/backend/server.js
    local_server_js = os.path.abspath("backend/server.js")
    remote_server_js = "/home/vps_9bpm/projetos/GSVR - prod/backend/server.js"
    print(f"Enviando {local_server_js} -> {remote_server_js}...")
    sftp.put(local_server_js, remote_server_js)
    
    # 2. Enviar backend/db.js
    local_db_js = os.path.abspath("backend/db.js")
    remote_db_js = "/home/vps_9bpm/projetos/GSVR - prod/backend/db.js"
    print(f"Enviando {local_db_js} -> {remote_db_js}...")
    sftp.put(local_db_js, remote_db_js)

    # 3. Enviar frontend/src/components/ConferenciaOperacional.jsx
    local_conf_jsx = os.path.abspath("frontend/src/components/ConferenciaOperacional.jsx")
    remote_conf_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/ConferenciaOperacional.jsx"
    print(f"Enviando {local_conf_jsx} -> {remote_conf_jsx}...")
    sftp.put(local_conf_jsx, remote_conf_jsx)

    sftp.close()

    # 4. Reiniciar containers ft-backend e ft-frontend
    print("Reiniciando containers ft-backend e ft-frontend...")
    stdin, stdout, stderr = ssh.exec_command("docker restart ft-backend ft-frontend")
    print("STDOUT:", stdout.read().decode('utf-8'))
    print("STDERR:", stderr.read().decode('utf-8'))

    print("DEPLOY CONCLUÍDO COM SUCESSO!")

except Exception as e:
    print("ERRO NO DEPLOY:", e)
finally:
    ssh.close()
