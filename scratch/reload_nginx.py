import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

cmds = [
    # Substituir nip.oi por nip.io em todos os confs do nginx
    "docker exec -i nginx-proxy-manager bash -c 'sed -i \"s/nip.oi/nip.io/g\" /data/nginx/proxy_host/*.conf'",
    # Substituir 192.168.1.106 por 192.168.1.102 em todos os confs do nginx
    "docker exec -i nginx-proxy-manager bash -c 'sed -i \"s/192.168.1.106/192.168.1.102/g\" /data/nginx/proxy_host/*.conf'",
    # Validar configuracao do Nginx
    "docker exec -i nginx-proxy-manager nginx -t",
    # Recarregar configuracao do Nginx
    "docker exec -i nginx-proxy-manager nginx -s reload"
]

for cmd in cmds:
    print(f"Executando: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print("STDOUT:", out)
    if err:
        print("STDERR:", err)

ssh.close()
print("Concluído com sucesso!")
