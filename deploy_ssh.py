import os
import sys
import time
import paramiko

def deploy():
    hostname = '192.168.1.102'
    username = 'vps_9bpm'
    password = 'asdf1234'
    remote_base = '/home/vps_9bpm/projetos/GSVR - prod'

    files_to_sync = [
        ('frontend/src/components/AdminDashboardV2.jsx', f'{remote_base}/frontend/src/components/AdminDashboardV2.jsx'),
        ('frontend/src/components/MinhasEscalas.jsx', f'{remote_base}/frontend/src/components/MinhasEscalas.jsx'),
        ('backend/server.js', f'{remote_base}/backend/server.js'),
        ('VERSION.md', f'{remote_base}/VERSION.md')
    ]

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print("=" * 60)
        print(f"CONECTANDO VIA SSH AO SERVIDOR {hostname}...")
        print("=" * 60)
        ssh.connect(hostname, username=username, password=password, timeout=10)
        print(" [OK] Conectado com sucesso via SSH!")

        # 1. Enviar arquivos modificados via SFTP
        print("\n--- 1. SINCRONIZAÇÃO DE ARQUIVOS (SFTP) ---")
        sftp = ssh.open_sftp()
        for local_rel, remote_path in files_to_sync:
            local_abs = os.path.abspath(local_rel)
            if os.path.exists(local_abs):
                size = os.path.getsize(local_abs)
                print(f" Enviando {local_rel} ({size} bytes) -> {remote_path}...")
                sftp.put(local_abs, remote_path)
                print(f"  [OK] {local_rel} enviado com sucesso.")
            else:
                print(f"  [AVISO] Arquivo local {local_rel} não encontrado, ignorando.")
        sftp.close()

        # 2. Aplicar/Verificar integridade do banco de dados via ft-postgres
        print("\n--- 2. MIGRAÇÃO / INTEGRIDADE NO BANCO (ft-postgres) ---")
        sql_cmd = (
            "ALTER TABLE ESCALA_PLANEJAMENTO ALTER COLUMN id_guarnicao TYPE VARCHAR(150); "
            "UPDATE ESCALA_PLANEJAMENTO ep SET id_guarnicao = SUBSTRING(CONCAT("
            "LOWER(REGEXP_REPLACE(ep.nome_recurso, '[^a-zA-Z0-9]', '_', 'g')), '_', "
            "TO_CHAR(ep.data_servico, 'YYYYMMDD'), '_', "
            "LOWER(REGEXP_REPLACE(ep.horario_servico, '[^a-zA-Z0-9]', '', 'g'))"
            ") FROM 1 FOR 150) WHERE ep.id_guarnicao IS NULL;"
        )
        cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql_cmd}"'
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out:
            print("STDOUT:", out.strip())
        if err:
            print("STDERR:", err.strip())

        # 3. Reiniciar containers ft-backend e ft-frontend
        print("\n--- 3. REINICIANDO CONTAINERS (ft-backend & ft-frontend) ---")
        stdin, stdout, stderr = ssh.exec_command('docker restart ft-backend ft-frontend')
        print("STDOUT:", stdout.read().decode('utf-8', errors='replace').strip())
        print("STDERR:", stderr.read().decode('utf-8', errors='replace').strip())

        time.sleep(3)

        # 4. Status dos containers
        print("\n--- 4. STATUS DOS CONTAINERS GSVR ---")
        stdin, stdout, stderr = ssh.exec_command('docker ps --filter "name=ft-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
        print(stdout.read().decode('utf-8', errors='replace').strip())

        # 5. Verificação da versão remota em VERSION.md
        print("\n--- 5. VERSÃO ATIVA NO SERVIDOR (VERSION.md) ---")
        stdin, stdout, stderr = ssh.exec_command(f'head -n 12 "{remote_base}/VERSION.md"')
        print(stdout.read().decode('utf-8', errors='replace').strip())

        print("\n" + "=" * 60)
        print("DEPLOY REALIZADO COM SUCESSO NO SERVIDOR!")
        print("=" * 60)

    except Exception as e:
        print("\n[ERRO NO DEPLOY]:", e)
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == '__main__':
    deploy()
