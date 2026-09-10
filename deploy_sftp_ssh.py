import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    sftp = ssh.open_sftp()
    
    # 1. Enviar backend/server.js
    local_server_js = os.path.abspath("backend/server.js")
    remote_server_js = "/home/vps_9bpm/projetos/GSVR - prod/backend/server.js"
    print(f"Enviando {local_server_js} -> {remote_server_js}...")
    sftp.put(local_server_js, remote_server_js)

    # 2. Enviar frontend/src/components/AdminDashboardV2.jsx
    local_admin_jsx = os.path.abspath("frontend/src/components/AdminDashboardV2.jsx")
    remote_admin_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/AdminDashboardV2.jsx"
    print(f"Enviando {local_admin_jsx} -> {remote_admin_jsx}...")
    sftp.put(local_admin_jsx, remote_admin_jsx)

    # 2.1 Enviar frontend/src/components/AnalyticsDashboard.jsx
    local_analytics_jsx = os.path.abspath("frontend/src/components/AnalyticsDashboard.jsx")
    remote_analytics_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/AnalyticsDashboard.jsx"
    print(f"Enviando {local_analytics_jsx} -> {remote_analytics_jsx}...")
    sftp.put(local_analytics_jsx, remote_analytics_jsx)

    # 3. Enviar VERSION.md
    local_version_md = os.path.abspath("VERSION.md")
    remote_version_md = "/home/vps_9bpm/projetos/GSVR - prod/VERSION.md"
    print(f"Enviando {local_version_md} -> {remote_version_md}...")
    sftp.put(local_version_md, remote_version_md)

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
