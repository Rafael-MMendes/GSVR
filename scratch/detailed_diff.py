import pandas as pd
import paramiko
import re

rank_map = { 
  'CEL': 'CEL PM', 'CEL PM': 'CEL PM',
  'TC': 'TC PM', 'TEN CEL': 'TC PM', 'TC PM': 'TC PM',
  'MAJ': 'MAJ PM', 'MAJ PM': 'MAJ PM',
  'CAP': 'CAP PM', 'CAP PM': 'CAP PM',
  '1º TEN': '1º TEN PM', '1º TEN PM': '1º TEN PM',
  '2º TEN': '2º TEN PM', '2º TEN PM': '2º TEN PM',
  'SUB': 'SUB PM', 'SUB PM': 'SUB PM', 'SUBTEN': 'SUB PM',
  '1º SGT': '1º SGT PM', '1º SGT PM': '1º SGT PM',
  '2º SGT': '2º SGT PM', '2º SGT PM': '2º SGT PM',
  '3º SGT': '3º SGT PM', '3º SGT PM': '3º SGT PM',
  'CB': 'CB PM', 'CABO': 'CB PM', 'CB PM': 'CB PM',
  'SD': 'SD PM', 'SOLDADO': 'SD PM', 'SD PM': 'SD PM',
  'ASP': 'ASP PM', 'ASP PM': 'ASP PM', 'ASP OF': 'ASP PM'
}

def normalize_rank(rank):
    if not rank: return 'SD PM'
    r = str(rank).upper().strip()
    if r in rank_map: return rank_map[r]
    if 'CORONEL' in r or r == 'CEL': return 'CEL PM'
    if 'TENENTE CORONEL' in r or 'TC PM' in r or r == 'TC': return 'TC PM'
    if 'MAJOR' in r or r == 'MAJ': return 'MAJ PM'
    if 'CAPIT' in r or r == 'CAP': return 'CAP PM'
    if re.search(r'1.?\s*TEN', r) or 'PRIMEIRO TENENTE' in r: return '1º TEN PM'
    if re.search(r'2.?\s*TEN', r) or 'SEGUNDO TENENTE' in r: return '2º TEN PM'
    if 'ASPIRANTE' in r or r == 'ASP': return 'ASP PM'
    if 'SUBTENENTE' in r or 'SUB-TENENTE' in r or r == 'SUB': return 'SUB PM'
    if re.search(r'1.?\s*SGT', r) or 'PRIMEIRO SARGENTO' in r: return '1º SGT PM'
    if re.search(r'2.?\s*SGT', r) or 'SEGUNDO SARGENTO' in r: return '2º SGT PM'
    if re.search(r'3.?\s*SGT', r) or 'TERCEIRO SARGENTO' in r: return '3º SGT PM'
    if 'CABO' in r or r == 'CB': return 'CB PM'
    if 'SOLDADO' in r or r == 'SD': return 'SD PM'
    return r

def clean_cpf(val):
    s = ''.join(c for c in str(val) if c.isdigit())
    return s.zfill(11) if s else ''

def clean_phone(val):
    if not val or pd.isna(val): return None
    s = ''.join(c for c in str(val) if c.isdigit())
    if len(s) == 11:
        return f"({s[:2]}){s[2:7]}-{s[7:]}"
    elif len(s) == 10:
        return f"({s[:2]}){s[2:6]}-{s[6:]}"
    return s if s else None

path = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx'
df = pd.read_excel(path)
df['cpf_norm'] = df['Cpf'].apply(clean_cpf)

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

mudancas = []
sem_mudancas = []

for idx, row in df.iterrows():
    cpf = row['cpf_norm']
    m_db = db_mils.get(cpf)
    if not m_db:
        continue
    
    diffs = {}
    
    # Nome Completo
    nome_ex = str(row['Nome']).strip()
    if nome_ex != m_db['nome_completo'].strip():
        diffs['nome_completo'] = (m_db['nome_completo'], nome_ex)
        
    # Nome Guerra
    guerra_ex = str(row['Nome Guerra']).strip() if pd.notna(row['Nome Guerra']) else nome_ex.split()[0]
    if guerra_ex and guerra_ex != m_db['nome_guerra'].strip():
        diffs['nome_guerra'] = (m_db['nome_guerra'], guerra_ex)
        
    # Posto / Graduação
    pg_ex = normalize_rank(row['P/G'])
    if pg_ex != m_db['posto_graduacao'].strip():
        diffs['posto_graduacao'] = (m_db['posto_graduacao'], pg_ex)
        
    # Matrícula
    mat_ex = str(int(row['Matrícula'])) if pd.notna(row['Matrícula']) else ''
    if mat_ex and mat_ex != m_db['matricula'].strip():
        diffs['matricula'] = (m_db['matricula'], mat_ex)
        
    # Nº Ordem
    ordem_ex = str(int(row['Nº Ordem'])) if pd.notna(row['Nº Ordem']) else ''
    if ordem_ex and ordem_ex != m_db['numero_ordem'].strip():
        diffs['numero_ordem'] = (m_db['numero_ordem'], ordem_ex)
        
    # RGPM
    rgpm_ex = str(row['Rgpm']).strip() if pd.notna(row['Rgpm']) else ''
    if rgpm_ex and rgpm_ex != m_db['rgpm'].strip():
        diffs['rgpm'] = (m_db['rgpm'], rgpm_ex)
        
    # OPM
    opm_ex = str(row['Opm']).strip() if pd.notna(row['Opm']) else ''
    if opm_ex and opm_ex != m_db['opm'].strip():
        diffs['opm'] = (m_db['opm'], opm_ex)
        
    # Telefone
    tel_ex = clean_phone(row['Telefone'])
    if tel_ex and tel_ex != m_db['telefone'].strip():
        diffs['telefone'] = (m_db['telefone'], tel_ex)
        
    # Status Ativo
    if not m_db['status_ativo']:
        diffs['status_ativo'] = (m_db['status_ativo'], True)
        
    if diffs:
        mudancas.append({'cpf': cpf, 'nome': nome_ex, 'diffs': diffs})
    else:
        sem_mudancas.append(cpf)

print(f"Total militares existentes com divergências a atualizar: {len(mudancas)}")
print(f"Total militares existentes sem alterações necessárias: {len(sem_mudancas)}")

print("\nExemplo de divergências encontradas (primeiros 5):")
for item in mudancas[:5]:
    print(f"Militar: {item['nome']} (CPF: {item['cpf']})")
    for field, (old_v, new_v) in item['diffs'].items():
        print(f"   {field}: '{old_v}' -> '{new_v}'")
