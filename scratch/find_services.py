import subprocess
import socket
import concurrent.futures

active_hosts = [
    '192.168.1.10', '192.168.1.11', '192.168.1.100', '192.168.1.101', '192.168.1.103',
    '192.168.1.107', '192.168.1.109', '192.168.1.110', '192.168.1.112', '192.168.1.113',
    '192.168.1.115', '192.168.1.116', '192.168.1.117', '192.168.1.120', '192.168.1.121',
    '192.168.1.126', '192.168.1.128', '192.168.1.129', '192.168.1.130', '192.168.1.131',
    '192.168.1.132', '192.168.1.135', '192.168.1.136', '192.168.1.200', '192.168.1.201',
    '192.168.1.202', '192.168.1.203', '192.168.1.204', '192.168.1.205', '192.168.1.206'
]

print("Verificando MAC addresses via arp -a...")
res = subprocess.run(['arp', '-a'], capture_output=True, text=True)
macs = {}
for line in res.stdout.splitlines():
    parts = line.split()
    if len(parts) >= 2 and parts[0].startswith('192.168.1.'):
        macs[parts[0]] = parts[1]

for ip in active_hosts:
    print(f"IP: {ip} -> MAC: {macs.get(ip, 'Desconhecido')}")

# Portas comuns de servidor web / node / postgres / ssh / docker
common_ports = [
    21, 22, 23, 80, 81, 443, 3000, 3001, 3002, 3306, 5000, 5173, 5432, 6379, 8000, 8080, 8081, 8443, 9000, 9090, 2222
]

def scan(ip, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.3)
    try:
        if s.connect_ex((ip, port)) == 0:
            return (ip, port)
    except:
        pass
    finally:
        s.close()
    return None

print("\nEscaneando portas comuns nos hosts...")
tasks = [(ip, p) for ip in active_hosts for p in common_ports]
with concurrent.futures.ThreadPoolExecutor(max_workers=80) as ex:
    for r in ex.map(lambda t: scan(t[0], t[1]), tasks):
        if r:
            print(f"ABERTA: {r[0]}:{r[1]}")
