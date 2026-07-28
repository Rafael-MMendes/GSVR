import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH ao servidor 192.168.1.119...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    # 1. Copiar backend atualizado
    # Vamos verificar o que tem na tabela EFETIVO
    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft -c "SELECT COUNT(*), COUNT(opm), COUNT(NULLIF(TRIM(opm), \'\')) FROM EFETIVO;"')
    print("--- EFETIVO OPM STATS ---")
    print(stdout.read().decode('utf-8'))

    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft -c "SELECT id_militar, nome_guerra, opm FROM EFETIVO LIMIT 10;"')
    print("--- EFETIVO SAMPLE ---")
    print(stdout.read().decode('utf-8'))

    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft -c "SELECT COUNT(*), COUNT(se.opm_origem) FROM SERVICOS_EXECUTADOS se;"')
    print("--- SERVICOS_EXECUTADOS OPM STATS ---")
    print(stdout.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
