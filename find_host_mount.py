import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Conectando via SSH ao servidor 192.168.1.119...")
    ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234', timeout=10)
    
    stdin, stdout, stderr = ssh.exec_command('docker inspect ft-backend')
    out = stdout.read().decode('utf-8')
    print("--- FT-BACKEND MOUNT TARGETS ---")
    import json
    data = json.loads(out)
    for m in data[0].get('Mounts', []):
        print(f"Host: {m.get('Source')} -> Container: {m.get('Destination')}")

    for m in data[0].get('Mounts', []):
        host_src = m.get('Source')
        if host_src:
            print(f"\n--- Verificando {host_src}/server.js no Host ---")
            stdin, stdout, stderr = ssh.exec_command(f'grep -n "opm" {host_src}/server.js | tail -n 20')
            print(stdout.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
