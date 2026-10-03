import openpyxl
import requests
import json
import paramiko
import os

# 1. Carrega o excel original e adiciona uma linha com militar novo de teste
src_path = r"c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx"
tmp_path = r"c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\scratch\tmp_efetivo_novo.xlsx"

wb = openpyxl.load_workbook(src_path)
ws = wb.active

# Pega os headers reais
headers = [cell.value for cell in ws[1]]
new_row_dict = {
    'P/G': 'SD PM',
    'Nome': 'MILITAR NOVO TESTE INTEGRACAO',
    'Cpf': '99988877766',
    'Matrícula': '999888',
    'Nº Ordem': '999888',
    'Opm': '9º BPM',
    'Nome Guerra': 'TESTE NOVO',
    'Rgpm': '12345',
    'Telefone': '(82) 99999-8888'
}
new_row = [new_row_dict.get(h, '') for h in headers]
ws.append(new_row)
wb.save(tmp_path)
print(f"Planilha temporaria com novo militar gerada: {tmp_path}")

try:
    # 2. Executa a sincronizacao com a nova planilha
    url = "http://192.168.1.102:3001/api/efetivo/import"
    with open(tmp_path, "rb") as f:
        files = {"file": ("tmp_efetivo_novo.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        resp = requests.post(url, files=files, timeout=60)
    
    data = resp.json()
    print("Stats com militar novo:")
    print(json.dumps(data.get("stats"), indent=2))
    
    inserted = data.get("details", {}).get("inserted", [])
    print(f"Total inseridos: {len(inserted)}")
    if inserted:
        print(f"Militar inserido: {inserted[0]['militar']} (CPF: {inserted[0]['cpf']}, Matricula: {inserted[0]['matricula']})")

    # 3. Verifica no banco se o militar existe em EFETIVO e em users
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    cmd_ef = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT id_militar, nome_completo, cpf, matricula, status_ativo FROM EFETIVO WHERE cpf = '99988877766';\""
    stdin, stdout, stderr = ssh.exec_command(cmd_ef)
    print("Verificacao em EFETIVO:\n" + stdout.read().decode('ascii', errors='replace'))

    cmd_us = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT id, numero_ordem FROM users WHERE numero_ordem = '999888';\""
    stdin, stdout, stderr = ssh.exec_command(cmd_us)
    print("Verificacao em users:\n" + stdout.read().decode('ascii', errors='replace'))

    # Limpeza do militar de teste
    ssh.exec_command("docker exec ft-postgres psql -U postgres -d escala_ft -c \"DELETE FROM EFETIVO WHERE cpf = '99988877766'; DELETE FROM users WHERE numero_ordem = '999888';\"")
    print("Limpeza do militar de teste realizada com sucesso.")
    ssh.close()

finally:
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
