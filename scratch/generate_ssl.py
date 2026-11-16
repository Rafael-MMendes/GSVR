import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

script = """#!/bin/bash
set -e

WORKDIR="/home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/npm-3"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

# Backup antigos
cp fullchain.pem fullchain.pem.bak 2>/dev/null || true
cp privkey.pem privkey.pem.bak 2>/dev/null || true

# Criar CA se nao existir
if [ ! -f /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.key ]; then
    openssl req -x509 -new -nodes -newkey rsa:4096 -keyout /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.key -sha256 -days 3650 -out /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.crt -subj "/C=BR/ST=AL/L=Delmiro Gouveia/O=9BPM-PMAL/OU=TI/CN=PMAL Internal Root CA"
fi

# Gerar chave do servidor
openssl genrsa -out privkey.pem 2048

# Criar config do openssl com SANs completos
cat > cert.cnf << 'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = BR
ST = AL
L = Delmiro Gouveia
O = 9BPM-PMAL
OU = TI
CN = *.192.168.1.18.nip.io

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = *.192.168.1.18.nip.io
DNS.2 = 192.168.1.18.nip.io
DNS.3 = gsvr.192.168.1.18.nip.io
DNS.4 = api.192.168.1.18.nip.io
DNS.5 = nextcloud.192.168.1.18.nip.io
DNS.6 = office.192.168.1.18.nip.io
DNS.7 = relatorio.192.168.1.18.nip.io
DNS.8 = relatorio-operacional.192.168.1.18.nip.io
DNS.9 = tco.192.168.1.18.nip.io
DNS.10 = db.192.168.1.18.nip.io
DNS.11 = pdf.192.168.1.18.nip.io
DNS.12 = localhost
IP.1 = 192.168.1.18
IP.2 = 127.0.0.1
EOF

openssl req -new -key privkey.pem -out cert.csr -config cert.cnf

openssl x509 -req -in cert.csr -CA /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.crt -CAkey /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.key -CAcreateserial -out server.crt -days 3650 -sha256 -extfile cert.cnf -extensions req_ext

# fullchain = server.crt + ca.crt
cat server.crt /home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.crt > fullchain.pem

rm -f cert.csr cert.cnf server.crt

# Ajustar permissoes
chmod 644 fullchain.pem
chmod 600 privkey.pem

echo "Certificado gerado com sucesso!"
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/gen_cert.sh', 'w') as f:
    f.write(script)
sftp.close()

_, stdout, stderr = ssh.exec_command('bash /tmp/gen_cert.sh && rm /tmp/gen_cert.sh')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

# Baixar ca.crt para o computador local
sftp = ssh.open_sftp()
sftp.get('/home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.crt', 'scratch/pmal_root_ca.crt')
sftp.close()
print("ca.crt baixado localmente para scratch/pmal_root_ca.crt!")

ssh.close()

