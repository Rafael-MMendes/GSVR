import requests
import json
import os

url = "http://192.168.1.102:3001/api/efetivo/import"
file_path = r"c:\Users\PMAL-DATEN\Desktop\projetos\GSVR - prod\util\efetivo - 03-10-2026.xlsx"

print(f"Enviando requisicao de sincronizacao para {url}...")
print(f"Arquivo: {file_path} (Tamanho: {os.path.getsize(file_path)} bytes)")

with open(file_path, "rb") as f:
    files = {"file": ("efetivo - 03-10-2026.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    resp = requests.post(url, files=files, timeout=60)

print(f"Status Code: {resp.status_code}")
try:
    data = resp.json()
    print("RESPOSTA JSON (stats):")
    print(json.dumps(data.get("stats"), indent=2))
    print("\nMessage:")
    print(data.get("message"))
    print("\nTotal Updated Details:", len(data.get("details", {}).get("updated", [])))
    print("Total Deactivated Details:", len(data.get("details", {}).get("deactivated", [])))
    print("Total Inserted Details:", len(data.get("details", {}).get("inserted", [])))
    print("Total Errors Details:", len(data.get("details", {}).get("errors", [])))
    if data.get("details", {}).get("updated"):
        print("\nExemplo de atualizacao:")
        sample = data["details"]["updated"][0]
        print(f"Militar: {sample['militar']} (CPF: {sample['cpf']})")
        for ch in sample['changes']:
            print("  - " + ch.encode('ascii', errors='replace').decode('ascii'))
    if data.get("details", {}).get("deactivated"):
        print("\nExemplo de inativado:")
        sample_deact = data["details"]["deactivated"][0]
        print(f"Militar: {sample_deact['militar']} (CPF: {sample_deact['cpf']})")
except Exception as e:
    print("Erro ao ler JSON:", e)
