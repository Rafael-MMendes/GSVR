import pandas as pd

path = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx'
df = pd.read_excel(path)

print("Coluna 'Cnh Categoria' valores únicos:")
print(df['Cnh Categoria'].value_counts(dropna=False))
