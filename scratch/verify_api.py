import urllib.request
import json

url = 'http://api.192.168.1.102.nip.io/api/schedules?date=2026-09-30&id_ciclo=6'
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))

patrols = data[0]['patrols']
print(f"TOTAL DE GUARNIÇÕES NO DIA: {len(patrols)}\n")
for idx, p in enumerate(patrols, 1):
    members_str = " | ".join([f"{m['rank']} {m['name']}" if m else "VAGO" for m in p['members']])
    print(f"[{idx}] {p['name']} ({p['timeSpan']}) - ID: {p['id']}")
    print(f"    Componentes: {members_str}\n")
