import socket
import concurrent.futures
import paramiko
import sys

print("Iniciando varredura rápida na rede...", flush=True)

# Primeiro, pegar todos os IPs ativos na rede via ping
import subprocess

def ping(ip):
    res = subprocess.run(['ping', '-n', '1', '-w', '250', ip], stdout=subprocess.DEVNULL)
    return ip if res.returncode == 0 else None

all_ips = [f"192.168.1.{i}" for i in range(1, 255)]
print(f"Testando {len(all_ips)} IPs com ping...", flush=True)

active_ips = []
with concurrent.futures.ThreadPoolExecutor(max_workers=60) as executor:
    for res in executor.map(ping, all_ips):
        if res:
            active_ips.append(res)

print(f"IPs que responderam ao ping: {active_ips}", flush=True)

# Portas para testar: 22 (SSH), 2222, 80, 443, 81, 3000, 3001, 5000, 5432, 8080, 8000
ports = [22, 2222, 80, 81, 443, 3000, 3001, 5000, 5432, 8080, 8000, 9000]

def test_port(ip, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        if s.connect_ex((ip, port)) == 0:
            return (ip, port)
    except:
        pass
    finally:
        s.close()
    return None

print("\nVarrendo portas nos IPs ativos...", flush=True)
open_services = []
tasks = [(ip, p) for ip in active_ips for p in ports]
with concurrent.futures.ThreadPoolExecutor(max_workers=60) as executor:
    results = executor.map(lambda x: test_port(x[0], x[1]), tasks)
    for res in results:
        if res:
            print(f"Porta aberta encontrada: {res[0]}:{res[1]}", flush=True)
            open_services.append(res)

# Para cada IP com porta 22 ou 2222, tentar SSH
ssh_hosts = [ip for (ip, port) in open_services if port in (22, 2222)]
print(f"\nHosts com SSH aberto: {ssh_hosts}", flush=True)

for ip in ssh_hosts:
    print(f"Tentando login SSH em {ip} com vps_9bpm...", flush=True)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(ip, username='vps_9bpm', password='asdf1234', timeout=3)
        stdin, stdout, stderr = client.exec_command('hostname && whoami && ip addr')
        out = stdout.read().decode()
        print(f"SUCESSO NO SSH EM {ip}!\nSaída:\n{out}", flush=True)
        client.close()
    except Exception as e:
        print(f"Falha de autenticação em {ip}: {e}", flush=True)
