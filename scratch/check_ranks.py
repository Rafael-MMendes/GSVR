import pandas as pd
import paramiko

path = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx'
df = pd.read_excel(path)

print("Valores únicos de P/G na planilha:")
print(df['P/G'].value_counts())

# Consultar no banco os valores de posto_graduacao
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = "SELECT DISTINCT posto_graduacao, count(*) FROM EFETIVO GROUP BY posto_graduacao ORDER BY count(*) DESC;"
stdin, stdout, stderr = ssh.exec_command(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"')
print("\nValores de posto_graduacao no Banco de Dados:")
print(stdout.read().decode('utf-8', errors='replace'))
ssh.close()
