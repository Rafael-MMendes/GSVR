import pandas as pd
import paramiko

path = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx'
df = pd.read_excel(path)

print(f"Total de linhas na planilha: {len(df)}")
print(f"CPFs não nulos na planilha: {df['Cpf'].notna().sum()}")
print(f"CPFs únicos na planilha: {df['Cpf'].nunique()}")
print(f"Matrículas não nulas na planilha: {df['Matrícula'].notna().sum()}")
print(f"Matrículas únicas na planilha: {df['Matrícula'].nunique()}")

# Exemplos de CPF e Matrícula na planilha
print("\nPrimeiros 5 CPFs da planilha (brutos):", df['Cpf'].head().tolist())
print("Primeiras 5 Matrículas da planilha (brutas):", df['Matrícula'].head().tolist())

# Agora vamos consultar os formatos no banco PostgreSQL
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = "SELECT id_militar, cpf, matricula, numero_ordem, nome_guerra, status_ativo FROM EFETIVO LIMIT 5;"
stdin, stdout, stderr = ssh.exec_command(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"')
print("\n--- AMOSTRA DO BANCO EFETIVO ---")
print(stdout.read().decode('utf-8', errors='replace'))

# Checar comprimento dos CPFs e formato no banco
sql_cpf_format = """
SELECT 
    MIN(LENGTH(cpf)) as min_len_cpf, 
    MAX(LENGTH(cpf)) as max_len_cpf,
    COUNT(CASE WHEN cpf ~ '^[0-9]+$' THEN 1 END) as apenas_numeros,
    COUNT(CASE WHEN cpf ~ '[^0-9]' THEN 1 END) as com_pontuacao,
    MIN(LENGTH(matricula)) as min_len_mat,
    MAX(LENGTH(matricula)) as max_len_mat
FROM EFETIVO;
"""
stdin, stdout, stderr = ssh.exec_command(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql_cpf_format}"')
print("--- FORMATO DO CPF E MATRÍCULA NO BANCO ---")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
