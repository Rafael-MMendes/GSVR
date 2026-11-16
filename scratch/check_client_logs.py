import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "tail -n 20 /home/vps_9bpm/projetos/nginx-npm/data/logs/proxy-host-7_access.log"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Host 7 (192.168.1.18.nip.io) access log:')
print(stdout.read().decode('utf-8'))

cmd = "tail -n 20 /home/vps_9bpm/projetos/nginx-npm/data/logs/proxy-host-1_access.log"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Host 1 (gsvr.192.168.1.18.nip.io) access log:')
print(stdout.read().decode('utf-8'))

ssh.close()

