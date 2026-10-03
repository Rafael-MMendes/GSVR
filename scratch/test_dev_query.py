import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    cmd = """docker exec ft-postgres psql -U postgres -d escala_ft -c "
      SELECT id_militar, posto_graduacao, nome_completo 
      FROM EFETIVO 
      WHERE UPPER(nome_completo) LIKE '%RAFAEL MONTEIRO MENDES%' 
         OR UPPER(nome_completo) LIKE '%ALAN KLEBER DE MENEZES SOARES%'
      ORDER BY CASE 
        WHEN UPPER(nome_completo) LIKE '%RAFAEL MONTEIRO MENDES%' THEN 1 
        ELSE 2 
      END;
    " """
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out.encode('ascii', errors='replace').decode('ascii'))
finally:
    ssh.close()
