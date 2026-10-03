import paramiko
import requests
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    # 1. Busca um militar ativo qualquer no banco
    cmd_pick = "docker exec ft-postgres psql -U postgres -d escala_ft -t -A -F ',' -c \"SELECT id_militar, nome_guerra, cpf, matricula FROM EFETIVO WHERE status_ativo = TRUE LIMIT 1;\""
    stdin, stdout, stderr = ssh.exec_command(cmd_pick)
    row = stdout.read().decode('ascii', errors='replace').strip()
    print("Militar selecionado do banco:", row)
    parts = row.split(',')
    test_id, test_guerra, test_cpf, test_mat = parts[0], parts[1], parts[2], parts[3]

    # Altera temporariamente status_ativo = FALSE
    cmd = f"docker exec ft-postgres psql -U postgres -d escala_ft -c \"UPDATE EFETIVO SET status_ativo = FALSE WHERE id_militar = {test_id} RETURNING id_militar, nome_guerra, status_ativo;\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("Militar marcado como falso temporariamente:\n" + stdout.read().decode('ascii', errors='replace'))

    # 2. Executa a importacao da planilha
    url = "http://192.168.1.102:3001/api/efetivo/import"
    file_path = r"c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx"
    with open(file_path, "rb") as f:
        files = {"file": ("efetivo - 03-10-2026.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        resp = requests.post(url, files=files, timeout=60)
    
    data = resp.json()
    print("Stats apos importacao:")
    print(json.dumps(data.get("stats"), indent=2))
    
    updated = data.get("details", {}).get("updated", [])
    print(f"Total atualizados: {len(updated)}")
    for u in updated:
        print(f"Militar atualizado: {u['militar']} (CPF: {u['cpf']})")
        for ch in u['changes']:
            print("  - " + ch.encode('ascii', errors='replace').decode('ascii'))

    # 3. Verifica no banco se o militar voltou para status_ativo = TRUE
    cmd_check = f"docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT id_militar, nome_guerra, cpf, matricula, status_ativo FROM EFETIVO WHERE id_militar = {test_id};\""
    stdin, stdout, stderr = ssh.exec_command(cmd_check)
    print("Status final no banco:\n" + stdout.read().decode('ascii', errors='replace'))

finally:
    ssh.close()
