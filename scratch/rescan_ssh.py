import socket
import concurrent.futures
import paramiko
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from update_server_ip import update_server_ip

def check_ssh_port(ip, port=22):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.7)
    try:
        if s.connect_ex((ip, port)) == 0:
            return (ip, port)
    except:
        pass
    finally:
        s.close()
    return None

ips = [f"192.168.1.{i}" for i in range(1, 255)]
ports = [22, 2222, 2200]
print(f"Varrendo portas {ports} em todos os 254 IPs (192.168.1.1 - 254)...", flush=True)

tasks = [(ip, p) for ip in ips for p in ports]
found = []
with concurrent.futures.ThreadPoolExecutor(max_workers=80) as ex:
    for res in ex.map(lambda x: check_ssh_port(x[0], x[1]), tasks):
        if res:
            print(f"-> Porta aberta detectada: {res[0]}:{res[1]}", flush=True)
            found.append(res)

print(f"\nTotal de serviços SSH encontrados: {len(found)}")

server_ip = None
for ip, port in found:
    if ip == "192.168.1.1" and port == 22:
        continue
    print(f"\nTentando autenticação SSH em {ip}:{port} com vps_9bpm...", flush=True)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        c.connect(ip, port=port, username="vps_9bpm", password="asdf1234", timeout=6)
        print(f"*** CONEXÃO BEM SUCEDIDA EM {ip}:{port}! ***", flush=True)
        stdin, stdout, stderr = c.exec_command('hostname && whoami && ip addr && docker ps --format "{{.Names}}"')
        out = stdout.read().decode("utf-8", errors="replace")
        print("Saída do servidor:")
        print(out)
        c.close()
        server_ip = ip
        break
    except Exception as e:
        print(f"Falha de login em {ip}:{port}: {e}", flush=True)

if server_ip:
    print(f"\n>>> ATUALIZANDO ARQUIVOS DO PROJETO PARA {server_ip} <<<")
    update_server_ip(server_ip)
else:
    print("\nNenhum servidor SSH ativo encontrado na sub-rede 192.168.1.0/24.")
