import paramiko
import os
import time

def main():
    hostname = '192.168.1.102'
    username = 'vps_9bpm'
    password = 'asdf1234'
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname, username=username, password=password, timeout=10)
    
    print("1. Corrigindo registros no banco de dados...")
    sql = """
    -- Separa a segunda equipe de FT 02 PIRANHAS de 2026-09-30 para ter seu próprio id_guarnicao único
    UPDATE ESCALA_PLANEJAMENTO 
    SET id_guarnicao = 'ft_02_piranhas_20260930_1800s0000_2'
    WHERE id_escala IN (8019, 8020, 8021);
    """
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("DB STDOUT:", stdout.read().decode())
    print("DB STDERR:", stderr.read().decode())
    
    print("2. Enviando arquivos corrigidos para o servidor...")
    files = [
        ('backend/db.js', '/home/vps_9bpm/projetos/GSVR - prod/backend/db.js'),
        ('backend/server.js', '/home/vps_9bpm/projetos/GSVR - prod/backend/server.js'),
        ('frontend/src/components/AdminDashboardV2.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/AdminDashboardV2.jsx'),
    ]
    
    sftp = ssh.open_sftp()
    for local, remote in files:
        print(f"Uploading {local} -> {remote}...")
        sftp.put(local, remote)
    sftp.close()
    print("Uploads finalizados.")
    
    print("3. Reiniciando ft-backend...")
    stdin, stdout, stderr = ssh.exec_command('docker restart ft-backend')
    print("Restart STDOUT:", stdout.read().decode())
    
    print("Aguardando backend inicializar...")
    time.sleep(4)
    
    print("Checando logs recentes do backend:")
    stdin, stdout, stderr = ssh.exec_command('docker logs --tail 20 ft-backend')
    print(stdout.read().decode())
    
    ssh.close()
    print("Concluído!")

if __name__ == '__main__':
    main()
