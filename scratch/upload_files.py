import paramiko
import os
import time

def upload_files():
    hostname = '192.168.1.102'
    username = 'vps_9bpm'
    password = 'asdf1234'
    
    files_to_upload = [
        ('backend/db.js', '/home/vps_9bpm/projetos/GSVR - prod/backend/db.js'),
        ('backend/server.js', '/home/vps_9bpm/projetos/GSVR - prod/backend/server.js'),
        ('frontend/src/components/AdminDashboardV2.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/AdminDashboardV2.jsx'),
        ('frontend/src/components/MinhasEscalas.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/MinhasEscalas.jsx'),
        ('frontend/src/components/FinanceiroDashboard.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/FinanceiroDashboard.jsx'),
        ('frontend/src/components/TiposServicoManager.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/TiposServicoManager.jsx'),
        ('frontend/src/components/ServicosImport.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/ServicosImport.jsx'),
        ('VERSION.md', '/home/vps_9bpm/projetos/GSVR - prod/VERSION.md')
    ]
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {hostname}...")
        ssh.connect(hostname, username=username, password=password, timeout=10)
        sftp = ssh.open_sftp()
        
        for local_path, remote_path in files_to_upload:
            if os.path.exists(local_path):
                file_size = os.path.getsize(local_path)
                print(f"Uploading {local_path} ({file_size} bytes) -> {remote_path}...")
                sftp.put(local_path, remote_path)
                print(f"  [OK] {local_path} uploaded successfully.")
            else:
                print(f"  [FAILED] Local file {local_path} does not exist!")
                
        sftp.close()
        print("\nAll uploads completed successfully.")
        
        # Reiniciar ft-backend para aplicar alterações de backend/server.js
        print("\nRestarting ft-backend container...")
        stdin, stdout, stderr = ssh.exec_command('docker restart ft-backend')
        print("Docker restart:", stdout.read().decode().strip())
        time.sleep(3)
        
        # Verificar status dos containers
        stdin, stdout, stderr = ssh.exec_command('docker ps --filter "name=ft-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
        print("\nContainers status:")
        print(stdout.read().decode().strip())
        
    except Exception as e:
        print("Error during upload:", e)
    finally:
        ssh.close()

if __name__ == '__main__':
    upload_files()
