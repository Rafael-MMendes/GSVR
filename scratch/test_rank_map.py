import pandas as pd
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

path = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx'
df = pd.read_excel(path)

for val in df['P/G'].unique():
    print(f"'{val}' -> '{normalize_rank(val)}'")
