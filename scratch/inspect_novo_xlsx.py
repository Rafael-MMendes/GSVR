import openpyxl

wb = openpyxl.load_workbook(r"c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\novo.xlsx", data_only=False)
print("Aba disponíveis:", wb.sheetnames)

sheet_name = None
for s in wb.sheetnames:
    if "GASTOS" in s.upper():
        sheet_name = s
        break

if not sheet_name:
    print("Aba de gastos não encontrada!")
else:
    print(f"--- Inspecionando aba: {sheet_name} ---")
    ws = wb[sheet_name]
    print(f"Dimensões: max_row={ws.max_row}, max_column={ws.max_column}")
    
    # Inspeciona as primeiras 40 linhas
    for r in range(1, min(ws.max_row + 1, 45)):
        row_vals = [ws.cell(row=r, column=c).value for c in range(1, min(ws.max_column + 1, 25))]
        # se linha não for totalmente vazia
        if any(v is not None for v in row_vals):
            # imprime linha formatada
            formatted = [str(v) if v is not None else "" for v in row_vals]
            print(f"L{r:02d}: " + " | ".join(formatted[:15]))
