import openpyxl

wb = openpyxl.load_workbook(r"c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\novo.xlsx", data_only=False)
ws = wb['GASTOS SETEMBOUTUBRO']

print("Merged ranges:")
for m in ws.merged_cells.ranges:
    print(" ", m)
