import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

print("--- [1] Atualizando .env do GSVR ---")
gsvr_update_cmd = """
sed -i 's/192.168.1.[0-9]*/192.168.1.18/g' "/home/vps_9bpm/projetos/GSVR - prod/.env"
sed -i 's/192.168.1.[0-9]*/192.168.1.18/g' "/home/vps_9bpm/projetos/GSVR - prod/frontend/.env"
"""
_, stdout, stderr = ssh.exec_command(gsvr_update_cmd)
print("Stderr:", stderr.read().decode('utf-8'))

print("--- Conteudo dos .env do GSVR ---")
_, stdout, _ = ssh.exec_command('cat "/home/vps_9bpm/projetos/GSVR - prod/.env"; echo "---"; cat "/home/vps_9bpm/projetos/GSVR - prod/frontend/.env"')
print(stdout.read().decode('utf-8'))

print("--- [2] Reiniciando containers do GSVR com novas variáveis ---")
_, stdout, stderr = ssh.exec_command('cd "/home/vps_9bpm/projetos/GSVR - prod" && docker compose up -d --force-recreate frontend')
print(stdout.read().decode('utf-8'))
print("Stderr:", stderr.read().decode('utf-8'))

print("--- [3] Atualizando Dashboard Central ---")
dash_update_cmd = """
sed -i 's/192.168.1.119/192.168.1.18/g' /home/vps_9bpm/projetos/dasboard/html/index.html
sed -i 's/192.168.1.104/192.168.1.18/g' /home/vps_9bpm/projetos/dasboard/html/index.html
"""
_, stdout, stderr = ssh.exec_command(dash_update_cmd)
print("Stderr:", stderr.read().decode('utf-8'))

print("--- [4] Atualizando Nginx Proxy Manager (Hosts restantes) ---")
npm_sqlite_cmd = """
python3 -c "
import sqlite3
con = sqlite3.connect('/home/vps_9bpm/projetos/nginx-npm/data/database.sqlite')
cur = con.cursor()
cur.execute('UPDATE proxy_host SET domain_names = REPLACE(domain_names, \"192.168.1.104\", \"192.168.1.18\");')
cur.execute('UPDATE proxy_host SET forward_host = REPLACE(forward_host, \"192.168.1.104\", \"192.168.1.18\");')
con.commit()
print('Linhas afetadas no SQLite:', con.total_changes)
con.close()
"
sed -i 's/192.168.1.104/192.168.1.18/g' /home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host/*.conf
docker exec nginx-proxy-manager nginx -s reload
"""
_, stdout, stderr = ssh.exec_command(npm_sqlite_cmd)
print(stdout.read().decode('utf-8'))
print("Stderr:", stderr.read().decode('utf-8'))

print("--- [5] Atualizando Nextcloud config.php e docker-compose.yml ---")
nc_update_cmd = """
sed -i 's/192.168.1.104/192.168.1.18/g' /home/vps_9bpm/projetos/nextcloud/docker-compose.yml
docker exec -u www-data nextcloud-app php occ config:system:set overwritehost --value="nextcloud.192.168.1.18.nip.io"
docker exec -u www-data nextcloud-app php occ config:system:set overwrite.cli.url --value="https://nextcloud.192.168.1.18.nip.io"
docker exec -u www-data nextcloud-app php occ config:system:set trusted_domains 0 --value="192.168.1.18"
docker exec -u www-data nextcloud-app php occ config:system:set trusted_domains 1 --value="nextcloud.192.168.1.18.nip.io"
docker exec -u www-data nextcloud-app php occ config:system:set trusted_domains 2 --value="192.168.1.18:8080"
docker exec -u www-data nextcloud-app php occ config:system:set trusted_proxies 0 --value="192.168.1.18"
"""
_, stdout, stderr = ssh.exec_command(nc_update_cmd)
print(stdout.read().decode('utf-8'))
print("Stderr:", stderr.read().decode('utf-8'))

ssh.close()
print("=== Sincronização executada com sucesso ===")

