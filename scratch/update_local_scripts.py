import os
import glob

files = [
    'ssh_connect.py',
    'deploy_ssh.py',
    'check_backend_code_ssh.py',
    'check_backend_workdir_ssh.py',
    'check_mounts_fast.py',
    'check_mounts_ssh.py',
    'check_opm_ssh.py',
    'deploy_formatters_ssh.py',
    'deploy_sftp_ssh.py',
    'find_host_mount.py',
    'verify_db_ssh.py',
    'verify_remote_code.py',
    'scratch/sync_remote_env.py',
    'scratch/query_vps_db.py',
    'scratch/upload_files.py',
    'scratch/vps_query.py'
]

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as fp:
            content = fp.read()
        new_content = content.replace('192.168.1.104', '192.168.1.18')
        if new_content != content:
            with open(f, 'w', encoding='utf-8') as fp:
                fp.write(new_content)
            print(f"Updated {f}")

