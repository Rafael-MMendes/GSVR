import urllib.request
import urllib.error

urls = [
    'http://gsvr.192.168.1.18.nip.io',
    'http://api.192.168.1.18.nip.io/api/ciclos',
    'http://192.168.1.18.nip.io',
    'http://db.192.168.1.18.nip.io',
    'http://tco.192.168.1.18.nip.io'
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"[OK {resp.status}] {url}")
    except Exception as e:
        print(f"[ERR] {url}: {e}")

