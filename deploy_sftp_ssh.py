import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH...")
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    sftp = ssh.open_sftp()
    
    # 1. Enviar backend/server.js e backend/db.js
    local_server_js = os.path.abspath("backend/server.js")
    remote_server_js = "/home/vps_9bpm/projetos/GSVR - prod/backend/server.js"
    print(f"Enviando {local_server_js} -> {remote_server_js}...")
    sftp.put(local_server_js, remote_server_js)

    local_db_js = os.path.abspath("backend/db.js")
    remote_db_js = "/home/vps_9bpm/projetos/GSVR - prod/backend/db.js"
    print(f"Enviando {local_db_js} -> {remote_db_js}...")
    sftp.put(local_db_js, remote_db_js)

    # 2. Enviar componentes do frontend
    local_efetivo_jsx = os.path.abspath("frontend/src/components/EfetivoImport.jsx")
    remote_efetivo_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/EfetivoImport.jsx"
    print(f"Enviando {local_efetivo_jsx} -> {remote_efetivo_jsx}...")
    sftp.put(local_efetivo_jsx, remote_efetivo_jsx)

    local_admin_jsx = os.path.abspath("frontend/src/components/AdminDashboardV2.jsx")
    remote_admin_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/AdminDashboardV2.jsx"
    print(f"Enviando {local_admin_jsx} -> {remote_admin_jsx}...")
    sftp.put(local_admin_jsx, remote_admin_jsx)

    local_footer_jsx = os.path.abspath("frontend/src/components/Footer.jsx")
    remote_footer_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/Footer.jsx"
    print(f"Enviando {local_footer_jsx} -> {remote_footer_jsx}...")
    sftp.put(local_footer_jsx, remote_footer_jsx)

    local_app_jsx = os.path.abspath("frontend/src/App.jsx")
    remote_app_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/App.jsx"
    print(f"Enviando {local_app_jsx} -> {remote_app_jsx}...")
    sftp.put(local_app_jsx, remote_app_jsx)

    local_quant_jsx = os.path.abspath("frontend/src/components/QuantitativoGastosFT.jsx")
    remote_quant_jsx = "/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/QuantitativoGastosFT.jsx"
    print(f"Enviando {local_quant_jsx} -> {remote_quant_jsx}...")
    sftp.put(local_quant_jsx, remote_quant_jsx)

    local_pkg_json = os.path.abspath("frontend/package.json")
    remote_pkg_json = "/home/vps_9bpm/projetos/GSVR - prod/frontend/package.json"
    print(f"Enviando {local_pkg_json} -> {remote_pkg_json}...")
    sftp.put(local_pkg_json, remote_pkg_json)

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
