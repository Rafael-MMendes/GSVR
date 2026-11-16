import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

script = """#!/bin/bash
set -e
SSL_DIR="/home/vps_9bpm/projetos/nginx-npm/data/custom_ssl"
mkdir -p "$SSL_DIR/npm-3"
cd "$SSL_DIR"

# 1. Gerar Root CA definitivo
openssl req -x509 -new -nodes -newkey rsa:4096 -keyout ca.key -sha256 -days 3650 -out ca.crt -subj "/C=BR/ST=AL/L=Delmiro Gouveia/O=9BPM-PMAL/OU=TI/CN=PMAL Internal Root CA"
chmod 600 ca.key
chmod 644 ca.crt

# 2. Gerar chave do servidor
openssl genrsa -out "$SSL_DIR/npm-3/privkey.pem" 2048

# 3. Config com SANs internos e externos
cat > "$SSL_DIR/cert.cnf" << 'EOF'
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
DNS.12 = *.45.234.245.204.nip.io
DNS.13 = 45.234.245.204.nip.io
DNS.14 = gsvr.45.234.245.204.nip.io
DNS.15 = api.45.234.245.204.nip.io
DNS.16 = nextcloud.45.234.245.204.nip.io
DNS.17 = office.45.234.245.204.nip.io
DNS.18 = relatorio.45.234.245.204.nip.io
DNS.19 = relatorio-operacional.45.234.245.204.nip.io
DNS.20 = tco.45.234.245.204.nip.io
DNS.21 = db.45.234.245.204.nip.io
DNS.22 = pdf.45.234.245.204.nip.io
DNS.23 = dashboard.45.234.245.204.nip.io
DNS.24 = dashboard.192.168.1.18.nip.io
DNS.25 = localhost
IP.1 = 192.168.1.18
IP.2 = 45.234.245.204
IP.3 = 127.0.0.1
EOF

openssl req -new -key "$SSL_DIR/npm-3/privkey.pem" -out "$SSL_DIR/cert.csr" -config "$SSL_DIR/cert.cnf"
openssl x509 -req -in "$SSL_DIR/cert.csr" -CA "$SSL_DIR/ca.crt" -CAkey "$SSL_DIR/ca.key" -CAcreateserial -out "$SSL_DIR/server.crt" -days 3650 -sha256 -extfile "$SSL_DIR/cert.cnf" -extensions req_ext

cat "$SSL_DIR/server.crt" "$SSL_DIR/ca.crt" > "$SSL_DIR/npm-3/fullchain.pem"

chmod 644 "$SSL_DIR/npm-3/fullchain.pem"
chmod 600 "$SSL_DIR/npm-3/privkey.pem"
rm -f "$SSL_DIR/cert.csr" "$SSL_DIR/cert.cnf" "$SSL_DIR/server.crt"

docker exec nginx-proxy-manager nginx -t
docker exec nginx-proxy-manager nginx -s reload

echo "Certificado emitido e aplicado com sucesso!"
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/gen_ca_cert.sh', 'w') as f:
    f.write(script)
sftp.close()

_, stdout, stderr = ssh.exec_command('echo asdf1234 | sudo -S bash /tmp/gen_ca_cert.sh && rm /tmp/gen_ca_cert.sh')
print(stdout.read().decode('utf-8'))
print('Stderr:', stderr.read().decode('utf-8'))

# Baixar ca.crt atualizado
sftp = ssh.open_sftp()
sftp.get('/home/vps_9bpm/projetos/nginx-npm/data/custom_ssl/ca.crt', 'scratch/pmal_root_ca.crt')
sftp.close()
print("ca.crt atualizado em scratch/pmal_root_ca.crt!")

ssh.close()
