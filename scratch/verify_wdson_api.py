import urllib.request
import json

url = 'http://192.168.1.18:3001/api/volunteers?id_ciclo=7'
req = urllib.request.Request(url)
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())

wdson = next((v for v in data if 'WDSON' in v.get('name', '').upper() or v.get('numero_ordem') == '140547' or v.get('matricula') == '655120'), None)

if wdson:
    print("Found WDSON!")
    print("Name:", wdson.get('name'))
    print("Posto:", wdson.get('rank'))
    print("Total dias disponiveis:", wdson.get('availableDaysCount'))
    print("Availability keys:", sorted(list(wdson.get('availability', {}).keys())))
    # Check specific days 09 to 15 of November
    nov_days = [k for k in wdson.get('availability', {}).keys() if '2026-11' in k]
    print("November days in Ciclo 7:", sorted(nov_days))
else:
    print("WDSON not found!")

