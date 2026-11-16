import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = "docker exec -i nextcloud-app sed -i 's/192.168.1.104/192.168.1.18/g' /var/www/html/config/config.php"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Stderr:', stderr.read().decode('utf-8'))

cmd = "docker exec nextcloud-app cat /var/www/html/config/config.php | grep -E '192.168|overwrite'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('Updated Nextcloud config lines:')
print(stdout.read().decode('utf-8'))

ssh.close()

