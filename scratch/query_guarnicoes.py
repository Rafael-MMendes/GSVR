import paramiko
import sys

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234')

    sql = """
    SELECT 
        ep.id_escala, 
        ep.id_guarnicao, 
        ep.id_ciclo, 
        ep.data_servico, 
        ep.horario_servico, 
        ep.funcao, 
        ep.nome_recurso, 
        ep.id_militar,
        e.nome_guerra,
        ep.publicado
    FROM ESCALA_PLANEJAMENTO ep
    LEFT JOIN EFETIVO e ON ep.id_militar = e.id_militar
    WHERE ep.data_servico::text LIKE '%28%'
    ORDER BY ep.data_servico, ep.nome_recurso, ep.horario_servico, ep.funcao;
    """

    cmd = f'docker exec -t ft-postgres psql -U postgres -d escala_ft -c "{sql}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    res = stdout.read().decode('utf-8', errors='replace')
    print("RESULTADO DO BANCO:")
    print(res)
    ssh.close()

if __name__ == '__main__':
    main()
