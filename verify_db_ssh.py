import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH ao servidor 192.168.1.119...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    stdin, stdout, stderr = ssh.exec_command('docker exec -i ft-postgres psql -U postgres -d escala_ft -c "SELECT DISTINCT id_guarnicao, count(*) FROM ESCALA_PLANEJAMENTO GROUP BY id_guarnicao LIMIT 10;"')
    print("--- AMOSTRA DE GUARNICÕES NO POSTGRES DO SERVIDORES ---")
    print(stdout.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
