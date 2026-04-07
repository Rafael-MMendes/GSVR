import pandas as pd
import sys

try:
    df = pd.read_excel('utilitarios-dev/efetivo.xlsx')
    print("Columns:", df.columns.tolist())
    print("First 3 rows:", df.head(3).to_dict(orient='records'))
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
