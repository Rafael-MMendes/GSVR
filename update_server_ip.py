import os
import re
import sys

TARGET_FILES = [
    "ssh_connect.py",
    "verify_db_ssh.py",
    "verify_remote_code.py",
    "check_opm_ssh.py",
    "check_mounts_ssh.py",
    "check_mounts_fast.py",
    "check_backend_code_ssh.py",
    "check_backend_workdir_ssh.py",
    "deploy_ssh.py",
    "deploy_sftp_ssh.py",
    "deploy_formatters_ssh.py",
    "find_host_mount.py",
    "frontend/.env",
    ".env",
    "scratch/query_vps_db.py",
    "scratch/upload_files.py",
    "scratch/vps_query.py"
]

def update_server_ip(new_ip: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Atualizando configurações para o novo IP do servidor: {new_ip}")
    
    ip_pattern = re.compile(r"192\.168\.1\.\d{1,3}")
    
    updated_count = 0
    for rel_path in TARGET_FILES:
        full_path = os.path.join(base_dir, rel_path)
        if not os.path.exists(full_path):
            continue
            
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        # Para arquivos .env, pode haver nip.io ou http
        new_content = ip_pattern.sub(new_ip, content)
        
        if new_content != content:
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f" [OK] Atualizado: {rel_path}")
            updated_count += 1
        else:
            print(f" [-] Sem alterações necessárias: {rel_path}")
            
    print(f"\nConcluído! Total de arquivos atualizados: {updated_count}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python update_server_ip.py <NOVO_IP>")
        sys.exit(1)
    update_server_ip(sys.argv[1].strip())
