import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH ao servidor 192.168.1.119...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    print("Conectado com sucesso!")
    
    # 1. Aplicar alteração diretamente no banco de dados via ft-postgres
    sql_cmd = (
        "ALTER TABLE ESCALA_PLANEJAMENTO ALTER COLUMN id_guarnicao TYPE VARCHAR(150); "
        "UPDATE ESCALA_PLANEJAMENTO ep SET id_guarnicao = SUBSTRING(CONCAT("
        "LOWER(REGEXP_REPLACE(ep.nome_recurso, '[^a-zA-Z0-9]', '_', 'g')), '_', "
        "TO_CHAR(ep.data_servico, 'YYYYMMDD'), '_', "
        "LOWER(REGEXP_REPLACE(ep.horario_servico, '[^a-zA-Z0-9]', '', 'g'))"
        ") FROM 1 FOR 150);"
    )
    
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql_cmd}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("--- MIGRAÇÃO BANCO DE DADOS (ft-postgres) ---")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print("STDOUT:", out)
    print("STDERR:", err)

    # 2. Reiniciar o container do backend para carregar os novos arquivos de código e sincronizar
    print("\n--- REINICIANDO CONTAINERS (ft-backend & ft-frontend) ---")
    stdin, stdout, stderr = ssh.exec_command('docker restart ft-backend ft-frontend')
    print("STDOUT:", stdout.read().decode('utf-8'))
    print("STDERR:", stderr.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
