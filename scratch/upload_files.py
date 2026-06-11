import paramiko
import os

def upload_files():
    hostname = '192.168.1.119'
    username = 'vps_9bpm'
    password = 'asdf1234'
    
    files_to_upload = [
        ('backend/db.js', '/home/vps_9bpm/projetos/GSVR - prod/backend/db.js'),
        ('backend/server.js', '/home/vps_9bpm/projetos/GSVR - prod/backend/server.js'),
        ('frontend/src/components/FinanceiroDashboard.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/FinanceiroDashboard.jsx'),
        ('frontend/src/components/TiposServicoManager.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/TiposServicoManager.jsx'),
        ('frontend/src/components/ServicosImport.jsx', '/home/vps_9bpm/projetos/GSVR - prod/frontend/src/components/ServicosImport.jsx'),
        ('VERSION.md', '/home/vps_9bpm/projetos/GSVR - prod/VERSION.md')
    ]
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, password=password, timeout=10)
        sftp = ssh.open_sftp()
        
        for local_path, remote_path in files_to_upload:
            if os.path.exists(local_path):
                print(f"Uploading {local_path} to {remote_path}...")
                sftp.put(local_path, remote_path)
                print("Uploaded successfully.")
            else:
                print(f"Local file {local_path} does not exist!")
                
        sftp.close()
        print("All uploads completed.")
    except Exception as e:
        print("Error during upload:", e)
    finally:
        ssh.close()

if __name__ == '__main__':
    upload_files()
