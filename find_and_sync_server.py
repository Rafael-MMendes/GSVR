import socket
import concurrent.futures
import paramiko
import time
import sys
import ctypes
import struct
from update_server_ip import update_server_ip

SendARP = ctypes.windll.iphlpapi.SendARP

def get_mac(ip_str):
    try:
        dest_ip = struct.unpack('<I', socket.inet_aton(ip_str))[0]
        mac = (ctypes.c_byte * 6)()
        mac_len = ctypes.c_ulong(6)
        if SendARP(dest_ip, 0, ctypes.byref(mac), ctypes.byref(mac_len)) == 0:
            return ':'.join(f'{b & 0xff:02x}' for b in mac)
    except:
        pass
    return None

def test_ssh_port(ip):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        if s.connect_ex((ip, 22)) == 0:
            return ip
    except:
        pass
    finally:
        s.close()
    return None

def verify_vps(ip):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(ip, username='vps_9bpm', password='asdf1234', timeout=5)
        stdin, stdout, stderr = client.exec_command('hostname && whoami && docker ps --format "{{.Names}}"')
        output = stdout.read().decode('utf-8', errors='replace')
        client.close()
        return output
    except Exception as e:
        return None

def scan_and_sync(auto_loop=False):
    print("=" * 60)
    print("VARREDURA AUTOMÁTICA DE SERVIDOR GSVR (9º BPM)")
    print("=" * 60)

    ips = [f"192.168.1.{i}" for i in range(1, 255)]
    
    while True:
        print("\n[1/3] Varrendo sub-rede 192.168.1.0/24 na porta 22 (SSH)...", flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=60) as ex:
            ssh_open = [ip for ip in ex.map(test_ssh_port, ips) if ip and ip != '192.168.1.1']

        server_found = None
        for ip in ssh_open:
            print(f"[2/3] Testando credenciais SSH em {ip}...", flush=True)
            vps_info = verify_vps(ip)
            if vps_info:
                print(f"\n[SUCESSO] Servidor VPS localizado em: {ip}")
                print(f"Informações do Servidor:\n{vps_info.strip()}")
                server_found = ip
                break

        if server_found:
            print("\n[3/3] Atualizando todos os arquivos do projeto...")
            update_server_ip(server_found)
            print("\n>>> PROCESSO CONCLUÍDO COM SUCESSO! <<<")
            return server_found

        print("\n[AVISO] Nenhum host com porta SSH 22 ativa e autenticação aceita foi detectado no momento.")
        
        # Checando presença do BMC / Motherboard ASRock em 192.168.1.102
        mac_102 = get_mac('192.168.1.102')
        if mac_102 and mac_102.lower() == '70:85:c2:71:9b:e8':
            print(" -> O controlador da placa-mãe ASRock (70:85:c2:71:9b:e8) está ONLINE em 192.168.1.102 (DASH/ASF ativo).")
            print(" -> Porém, o sistema operacional do servidor está DESLIGADO (S5/Standby).")
            print(" -> É necessário LIGAR fisicamente o computador do servidor (pressionar o botão Power no gabinete).")
        
        if not auto_loop:
            break
            
        print("\nAguardando 10 segundos antes da próxima tentativa de varredura...")
        time.sleep(10)

    return None

if __name__ == "__main__":
    loop = "--loop" in sys.argv
    scan_and_sync(auto_loop=loop)
