import ctypes
import socket
import struct
import concurrent.futures

SendARP = ctypes.windll.iphlpapi.SendARP

def arp_ping(ip_str):
    dest_ip = struct.unpack('<I', socket.inet_aton(ip_str))[0]
    mac = (ctypes.c_byte * 6)()
    mac_len = ctypes.c_ulong(6)
    res = SendARP(dest_ip, 0, ctypes.byref(mac), ctypes.byref(mac_len))
    if res == 0:
        mac_str = ':'.join(f'{b & 0xff:02x}' for b in mac)
        print(f"ALIVE: {ip_str} -> {mac_str}", flush=True)
        return (ip_str, mac_str)
    return None

print("Iniciando SendARP multithreaded...", flush=True)
ips = [f"192.168.1.{i}" for i in range(1, 255)]

alive = []
with concurrent.futures.ThreadPoolExecutor(max_workers=30) as ex:
    for res in ex.map(arp_ping, ips):
        if res:
            alive.append(res)

print(f"\nTotal vivos no SendARP: {len(alive)}", flush=True)
for ip, mac in sorted(alive, key=lambda x: int(x[0].split('.')[3])):
    print(f"{ip:16} | {mac}")
