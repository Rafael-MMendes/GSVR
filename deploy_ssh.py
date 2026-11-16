import os
import sys
import time
import paramiko

def deploy():
    hostname = '192.168.1.18'
    username = 'vps_9bpm'
    password = 'asdf1234'
    remote_base = '/home/vps_9bpm/projetos/GSVR - prod'

    files_to_sync = [
        ('backend/utils/cpf.js', f'{remote_base}/backend/utils/cpf.js'),
        ('backend/utils/totp.js', f'{remote_base}/backend/utils/totp.js'),
        ('backend/utils/audit.js', f'{remote_base}/backend/utils/audit.js'),
        ('backend/utils/helpers.js', f'{remote_base}/backend/utils/helpers.js'),
        ('backend/utils/cache.js', f'{remote_base}/backend/utils/cache.js'),
        ('backend/middleware/auth.js', f'{remote_base}/backend/middleware/auth.js'),
        ('backend/middleware/rateLimiter.js', f'{remote_base}/backend/middleware/rateLimiter.js'),
        ('backend/middleware/upload.js', f'{remote_base}/backend/middleware/upload.js'),
        ('backend/middleware/uploadValidation.js', f'{remote_base}/backend/middleware/uploadValidation.js'),
        ('backend/scripts/provision_superuser.js', f'{remote_base}/backend/scripts/provision_superuser.js'),
        ('backend/scripts/migrate.js', f'{remote_base}/backend/scripts/migrate.js'),
        ('backend/scripts/backup_db.sh', f'{remote_base}/backend/scripts/backup_db.sh'),
        ('docker-compose.prod.yml', f'{remote_base}/docker-compose.prod.yml'),
        ('backend/package.json', f'{remote_base}/backend/package.json'),
        ('backend/types/domain.d.ts', f'{remote_base}/backend/types/domain.d.ts'),
        ('backend/db.js', f'{remote_base}/backend/db.js'),
        ('backend/server.js', f'{remote_base}/backend/server.js'),
        ('backend/test_modular_routes.js', f'{remote_base}/backend/test_modular_routes.js'),
    ]

    for mig in os.listdir('backend/migrations'):
        if mig.endswith('.sql'):
            files_to_sync.append((f'backend/migrations/{mig}', f'{remote_base}/backend/migrations/{mig}'))

    for t in os.listdir('backend/tests'):
        if t.endswith('.js'):
            files_to_sync.append((f'backend/tests/{t}', f'{remote_base}/backend/tests/{t}'))

    # Incluir dinamicamente todos os controllers e rotas modularizados
    for ctrl in os.listdir('backend/controllers'):
        if ctrl.endswith('.js'):
            files_to_sync.append((f'backend/controllers/{ctrl}', f'{remote_base}/backend/controllers/{ctrl}'))

    for r in os.listdir('backend/routes'):
        if r.endswith('.js'):
            files_to_sync.append((f'backend/routes/{r}', f'{remote_base}/backend/routes/{r}'))

    for svc in os.listdir('backend/services'):
        if svc.endswith('.js'):
            files_to_sync.append((f'backend/services/{svc}', f'{remote_base}/backend/services/{svc}'))

    for comp in os.listdir('frontend/src/components'):
        if comp.endswith(('.jsx', '.js', '.css')):
            files_to_sync.append((f'frontend/src/components/{comp}', f'{remote_base}/frontend/src/components/{comp}'))

    for subcomp in os.listdir('frontend/src/components/admin-dashboard'):
        if subcomp.endswith(('.jsx', '.js', '.css')):
            files_to_sync.append((f'frontend/src/components/admin-dashboard/{subcomp}', f'{remote_base}/frontend/src/components/admin-dashboard/{subcomp}'))

    for commoncomp in os.listdir('frontend/src/components/common'):
        if commoncomp.endswith(('.jsx', '.js', '.css')):
            files_to_sync.append((f'frontend/src/components/common/{commoncomp}', f'{remote_base}/frontend/src/components/common/{commoncomp}'))

    files_to_sync.extend([
        ('frontend/package.json', f'{remote_base}/frontend/package.json'),
        ('frontend/tsconfig.json', f'{remote_base}/frontend/tsconfig.json'),
        ('frontend/src/types/gsvr.types.ts', f'{remote_base}/frontend/src/types/gsvr.types.ts'),
        ('frontend/src/services/api.js', f'{remote_base}/frontend/src/services/api.js'),
        ('frontend/src/utils/cpf.js', f'{remote_base}/frontend/src/utils/cpf.js'),
        ('frontend/src/utils/scheduleHelpers.js', f'{remote_base}/frontend/src/utils/scheduleHelpers.js'),
        ('frontend/src/App.jsx', f'{remote_base}/frontend/src/App.jsx'),
        ('docs/DIAGNOSTICO_OTIMIZACAO_EVOLUCAO.md', f'{remote_base}/docs/DIAGNOSTICO_OTIMIZACAO_EVOLUCAO.md'),
        ('frontend/public/manual-e-documentacao.html', f'{remote_base}/frontend/public/manual-e-documentacao.html'),
        ('docs/README.md', f'{remote_base}/docs/README.md'),
        ('docs/ANALISE_TECNICA_COMPLETA_SISTEMA.md', f'{remote_base}/docs/ANALISE_TECNICA_COMPLETA_SISTEMA.md'),
        ('docs/index.html', f'{remote_base}/docs/index.html'),
        ('docs/01-visao-geral.md', f'{remote_base}/docs/01-visao-geral.md'),
        ('docs/02-arquitetura-e-stack.md', f'{remote_base}/docs/02-arquitetura-e-stack.md'),
        ('docs/03-modelo-de-dados.md', f'{remote_base}/docs/03-modelo-de-dados.md'),
        ('docs/04-seguranca-e-autenticacao.md', f'{remote_base}/docs/04-seguranca-e-autenticacao.md'),
        ('docs/05-modulos-do-sistema.md', f'{remote_base}/docs/05-modulos-do-sistema.md'),
        ('docs/06-catalogo-de-apis.md', f'{remote_base}/docs/06-catalogo-de-apis.md'),
        ('docs/07-guia-de-implantacao-e-operacao.md', f'{remote_base}/docs/07-guia-de-implantacao-e-operacao.md'),
        ('docs/08-manual-do-usuario.md', f'{remote_base}/docs/08-manual-do-usuario.md'),
        ('README.md', f'{remote_base}/README.md'),
        ('VERSION.md', f'{remote_base}/VERSION.md')
    ])

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

        def ensure_remote_dir(remote_dir):
            parts = remote_dir.strip('/').split('/')
            current = ''
            for part in parts:
                current += '/' + part
                try:
                    sftp.stat(current)
                except IOError:
                    try:
                        sftp.mkdir(current)
                    except Exception:
                        pass

        for local_rel, remote_path in files_to_sync:
            local_abs = os.path.abspath(local_rel)
            if os.path.exists(local_abs):
                remote_dir = os.path.dirname(remote_path)
                ensure_remote_dir(remote_dir)
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

        # 2.1 Executar Migrações DDL Estruturadas (schema_migrations)
        print("\n--- 2.1. MIGRAÇÕES DDL ESTRUTURADAS (migrate.js) ---")
        stdin, stdout, stderr = ssh.exec_command('docker exec ft-backend node scripts/migrate.js')
        mig_out = stdout.read().decode('utf-8', errors='replace').strip()
        mig_err = stderr.read().decode('utf-8', errors='replace').strip()
        if mig_out:
            print(mig_out)
        if mig_err:
            print("[AVISO MIGRATE]:", mig_err)

        # 3. Reiniciar containers ft-backend e ft-frontend
        print("\n--- 3. REINICIANDO CONTAINERS (ft-backend & ft-frontend) ---")
        stdin, stdout, stderr = ssh.exec_command('docker restart ft-backend ft-frontend')
        print("STDOUT:", stdout.read().decode('utf-8', errors='replace').strip())
        print("STDERR:", stderr.read().decode('utf-8', errors='replace').strip())

        time.sleep(3)

        # 3.1 Executar Bateria de Testes Automatizados no Container ft-backend
        print("\n--- 3.1. TESTES AUTOMATIZADOS (UNITÁRIOS + REGRESSÃO DE ROTAS) ---")
        stdin, stdout, stderr = ssh.exec_command('docker exec ft-backend npm test && docker exec ft-backend node test_modular_routes.js')
        test_out = stdout.read().decode('utf-8', errors='replace').strip()
        test_err = stderr.read().decode('utf-8', errors='replace').strip()
        print(test_out)
        if test_err:
            print("[AVISO TESTE]:", test_err)

        # 3.2 Validar Build do Frontend (Vite)
        print("\n--- 3.2. VALIDAÇÃO DE BUILD DO FRONTEND (Vite) ---")
        stdin, stdout, stderr = ssh.exec_command('docker exec ft-frontend npx vite build --outDir /tmp/dist-test')
        fe_out = stdout.read().decode('utf-8', errors='replace').strip()
        fe_err = stderr.read().decode('utf-8', errors='replace').strip()
        print(fe_out)
        if fe_err:
            print("[AVISO VITE]:", fe_err)

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
