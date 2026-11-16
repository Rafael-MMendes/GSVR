import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

# Let's test the DELETE endpoint via node in ft-backend container
cmd = """docker exec ft-backend node -e "
const jwt = require('jsonwebtoken');
const http = require('http');

const secret = process.env.JWT_SECRET || 'ft_jwt_secret_dev_2026_change_in_prod';
const token = jwt.sign({ id: 1, is_admin: true, is_superuser: true, roles: ['SUPERUSER'], permissions: ['*'] }, secret, { expiresIn: '1h' });

const req = http.request({
  host: 'localhost',
  port: 3001,
  path: '/api/volunteers/695',
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ' + token
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});
req.end();
"
"""

stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== DELETE 695 TEST VIA API ===")
print(stdout.read().decode())
print(stderr.read().decode())

# Check if 695 was deleted from database
cmd_check = 'docker exec ft-postgres psql -U postgres -d escala_ft -c "SELECT id_requerimento FROM REQUERIMENTOS WHERE id_requerimento = 695;"'
stdin, stdout, stderr = ssh.exec_command(cmd_check)
print("=== CHECK IN DATABASE ===")
print(stdout.read().decode())

# Check if escala 9137 is still safe and intact
cmd_escala = 'docker exec ft-postgres psql -U postgres -d escala_ft -c "SELECT id_escala, id_militar, id_disponibilidade, data_servico, funcao, status FROM escala_planejamento WHERE id_escala = 9137;"'
stdin, stdout, stderr = ssh.exec_command(cmd_escala)
print("=== ESCALA 9137 INTACT ===")
print(stdout.read().decode())

ssh.close()
