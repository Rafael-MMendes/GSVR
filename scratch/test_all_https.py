import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

test_domains = [
    'gsvr.192.168.1.18.nip.io',
    'api.192.168.1.18.nip.io',
    '192.168.1.18.nip.io',
    'db.192.168.1.18.nip.io',
    'tco.192.168.1.18.nip.io',
    'pdf.192.168.1.18.nip.io',
    'nextcloud.192.168.1.18.nip.io'
]

for d in test_domains:
    cmd = f"curl -k -s -o /dev/null -w '%{{http_code}}' https://{d} --resolve {d}:443:127.0.0.1"
    _, stdout, _ = ssh.exec_command(cmd)
    code = stdout.read().decode('utf-8').strip()
    print(f"HTTPS https://{d} -> HTTP Status: {code}")

ssh.close()

