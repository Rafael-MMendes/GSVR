import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

# Inspecionar montagens do NPM
stdin, stdout, stderr = ssh.exec_command('docker inspect nginx-proxy-manager --format "{{json .Mounts}}"')
print("Mounts JSON:", stdout.read().decode('utf-8'))

# Ler proxy_host via python no host
py_cmd = (
    "python3 -c \""
    "import sqlite3, json, glob\n"
    "files = glob.glob('/var/lib/docker/volumes/**/database.sqlite', recursive=True) + glob.glob('/**/data/database.sqlite', recursive=True)\n"
    "print('Files:', files)\n"
    "\""
)
stdin, stdout, stderr = ssh.exec_command(py_cmd)
print("Py output:", stdout.read().decode('utf-8'))
print("Py err:", stderr.read().decode('utf-8'))

ssh.close()
