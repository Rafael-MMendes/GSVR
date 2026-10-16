import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    # Ver colunas de SERVICOS_EXECUTADOS
    cmd = 'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "\\d SERVICOS_EXECUTADOS"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("--- COLUNAS SERVICOS_EXECUTADOS ---")
    print(stdout.read().decode('utf-8', errors='replace'))

    # Consultar linhas para 2026-09-22
    cmd = 'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "SELECT se.*, e.nome_guerra FROM SERVICOS_EXECUTADOS se LEFT JOIN EFETIVO e ON se.id_militar = e.id_militar WHERE se.data_execucao = \'2026-09-22\'"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("--- DADOS SERVICOS_EXECUTADOS (22/09/2026) ---")
    print(stdout.read().decode('utf-8', errors='replace'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
