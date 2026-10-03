import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
    print("PS:\n" + stdout.read().decode())
    
    stdin, stdout, stderr = ssh.exec_command('docker inspect ft-frontend --format "{{json .Config.Cmd}}"')
    print("Frontend CMD:\n" + stdout.read().decode())

    f_logs = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
    print("Frontend LOGS:\n" + f_logs)

    stdin, stdout, stderr = ssh.exec_command('docker logs --tail 20 ft-backend')
    b_logs = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
    print("Backend LOGS:\n" + b_logs)
finally:
    ssh.close()
