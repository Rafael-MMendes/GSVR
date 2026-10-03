import paramiko
import requests
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    # Altera nome de guerra temporariamente para 'TESTE DIVERGENCIA'
    cmd = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"UPDATE EFETIVO SET nome_guerra = 'TESTE DIVERGENCIA' WHERE id_militar = 234;\""
    ssh.exec_command(cmd)

    # Executa a importacao da planilha
    url = "http://192.168.1.102:3001/api/efetivo/import"
    file_path = r"c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx"
    with open(file_path, "rb") as f:
        files = {"file": ("efetivo - 03-10-2026.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        resp = requests.post(url, files=files, timeout=60)
    
    data = resp.json()
    print("Stats:")
    print(json.dumps(data.get("stats"), indent=2))
    
    updated = data.get("details", {}).get("updated", [])
    print(f"Total atualizados: {len(updated)}")
    for u in updated:
        if u['id_militar'] == 234:
            print(f"Militar 234 atualizado com sucesso:")
            for ch in u['changes']:
                print("  - " + ch.encode('ascii', errors='replace').decode('ascii'))

    # Verifica no banco se voltou ao valor oficial da planilha ('FERNANDO')
    cmd_check = "docker exec ft-postgres psql -U postgres -d escala_ft -c \"SELECT id_militar, nome_guerra, status_ativo FROM EFETIVO WHERE id_militar = 234;\""
    stdin, stdout, stderr = ssh.exec_command(cmd_check)
    print("Banco apos sync:\n" + stdout.read().decode('ascii', errors='replace'))

finally:
    ssh.close()
