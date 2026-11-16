import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

py_script = """
import glob
import os

ssl_block = '''
listen 443 ssl;
listen [::]:443 ssl;

  # Custom SSL
  ssl_certificate /data/custom_ssl/npm-3/fullchain.pem;
  ssl_certificate_key /data/custom_ssl/npm-3/privkey.pem;
'''

conf_dir = '/home/vps_9bpm/projetos/nginx-npm/data/nginx/proxy_host'
targets = ['1.conf', '2.conf', '3.conf', '5.conf', '7.conf', '10.conf', '12.conf']

for t in targets:
    path = os.path.join(conf_dir, t)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'listen 443 ssl;' not in content:
            target_str = 'listen [::]:80;'
            if target_str in content:
                new_content = content.replace(target_str, target_str + '\\n' + ssl_block)
                # also enable http2
                new_content = new_content.replace('http2 off;', 'http2 on;')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Successfully added SSL block to {t}")
            else:
                print(f"Could not find listen [::]:80 in {t}")
        else:
            print(f"SSL already present in {t}")
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/inject_ssl.py', 'w') as f:
    f.write(py_script)
sftp.close()

_, stdout, stderr = ssh.exec_command('echo asdf1234 | sudo -S python3 /tmp/inject_ssl.py && rm /tmp/inject_ssl.py')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

_, stdout, stderr = ssh.exec_command('docker exec nginx-proxy-manager nginx -t && docker exec nginx-proxy-manager nginx -s reload')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

ssh.close()

