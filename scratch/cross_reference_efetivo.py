import pandas as pd
import paramiko
import json

path = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx'
df = pd.read_excel(path)

# Padronizar CPF da planilha (11 dígitos string)
def clean_cpf(val):
    s = ''.join(c for c in str(val) if c.isdigit())
    return s.zfill(11) if s else ''

df['cpf_norm'] = df['Cpf'].apply(clean_cpf)
excel_cpfs = set(df['cpf_norm'])
print(f"Total CPFs normalizados na planilha: {len(excel_cpfs)}")

# Buscar militares do banco
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', port=22, username='vps_9bpm', password='asdf1234', timeout=5)

sql = """
SELECT id_militar, nome_completo, nome_guerra, posto_graduacao, 
       matricula, numero_ordem, cpf, rgpm, opm, telefone, motorista, status_ativo
FROM EFETIVO;
"""
stdin, stdout, stderr = ssh.exec_command(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -t -A -F"|" -c "{sql}"')
lines = stdout.read().decode('utf-8', errors='replace').strip().splitlines()
ssh.close()

db_mils = {}
for line in lines:
    parts = line.split('|')
    if len(parts) >= 12:
        cpf = parts[6].strip()
        db_mils[cpf] = {
            'id_militar': parts[0],
            'nome_completo': parts[1],
            'nome_guerra': parts[2],
            'posto_graduacao': parts[3],
            'matricula': parts[4],
            'numero_ordem': parts[5],
            'cpf': cpf,
            'rgpm': parts[7],
            'opm': parts[8],
            'telefone': parts[9],
            'motorista': parts[10],
            'status_ativo': parts[11] == 't'
        }

db_cpfs = set(db_mils.keys())
print(f"Total CPFs no banco: {len(db_cpfs)}")

em_ambos = excel_cpfs.intersection(db_cpfs)
so_na_planilha = excel_cpfs - db_cpfs
so_no_banco = db_cpfs - excel_cpfs

print(f"\n1. Presentes em ambos (planilha + banco): {len(em_ambos)}")
print(f"2. Presentes SOMENTE na planilha (novos no banco): {len(so_na_planilha)}")
print(f"3. Presentes SOMENTE no banco (serão inativados status_ativo = false): {len(so_no_banco)}")

# Se há novos na planilha, listar
if so_na_planilha:
    print("\nMilitares na planilha que NÃO estão no banco:")
    for cpf in so_na_planilha:
        row = df[df['cpf_norm'] == cpf].iloc[0]
        print(f"  - CPF: {cpf}, Nome: {row['Nome']}, P/G: {row['P/G']}, Matrícula: {row['Matrícula']}")

# Se há ausentes na planilha (estão no banco), listar status atual
if so_no_banco:
    print("\nMilitares no banco que NÃO estão na planilha (amostra de 5):")
    for cpf in list(so_no_banco)[:5]:
        m = db_mils[cpf]
        print(f"  - CPF: {cpf}, Nome: {m['nome_completo']}, Posto: {m['posto_graduacao']}, Ativo: {m['status_ativo']}")

# Analisar divergências nos militares em ambos
print("\n--- ANÁLISE DE DIVERGÊNCIAS (PLANILHA VS BANCO) ---")
divergencias = {'nome_completo': 0, 'nome_guerra': 0, 'posto_graduacao': 0, 'matricula': 0, 'numero_ordem': 0, 'opm': 0, 'status_ativo': 0}
for cpf in em_ambos:
    m_db = db_mils[cpf]
    row = df[df['cpf_norm'] == cpf].iloc[0]
    
    # Nome
    nome_excel = str(row['Nome']).strip()
    if nome_excel != m_db['nome_completo'].strip():
        divergencias['nome_completo'] += 1
        
    # Nome Guerra
    guerra_excel = str(row['Nome Guerra']).strip() if pd.notna(row['Nome Guerra']) else ''
    if guerra_excel and guerra_excel != (m_db['nome_guerra'] or '').strip():
        divergencias['nome_guerra'] += 1
        
    # Posto
    pg_excel = str(row['P/G']).strip()
    # No banco costuma ser 'SD PM', 'CB PM', '3º SGT PM', etc. Vamos ver como está
    if pg_excel != m_db['posto_graduacao'].strip():
        divergencias['posto_graduacao'] += 1
        
    # Matrícula
    mat_excel = str(int(row['Matrícula'])) if pd.notna(row['Matrícula']) else ''
    if mat_excel != m_db['matricula'].strip():
        divergencias['matricula'] += 1
        
    # Status ativo (se no banco está false mas na planilha tá ativo)
    if not m_db['status_ativo']:
        divergencias['status_ativo'] += 1

print("Divergências encontradas:", divergencias)
