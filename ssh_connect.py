import sys
import paramiko

def run_query(target_date="2026-08-18"):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"Conectando via SSH ao servidor 192.168.1.102...")
        ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)

        sql = f"""
        SELECT 
            se.id_execucao,
            TO_CHAR(se.data_execucao, 'DD/MM/YYYY') AS data,
            se.guarnicao,
            se.opm_origem,
            se.modalidade,
            e.matricula,
            e.posto_graduacao,
            e.nome_guerra,
            se.carga_horaria,
            se.status_presenca,
            se.valor_remuneracao
        FROM SERVICOS_EXECUTADOS se
        JOIN EFETIVO e ON se.id_militar = e.id_militar
        WHERE se.data_execucao = '{target_date}'
        ORDER BY se.guarnicao, e.posto_graduacao, e.nome_guerra;
        """

        print(f"\n--- SQL EXECUTADO (Data: {target_date}) ---")
        print(sql.strip())
        print("-" * 60)

        docker_cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql}"'
        
        stdin, stdout, stderr = ssh.exec_command(docker_cmd)
        output = stdout.read().decode('utf-8', errors='replace')
        error = stderr.read().decode('utf-8', errors='replace')

        if output:
            print(f"\n--- RESULTADO ({target_date}) ---")
            print(output)
        if error:
            print("STDERR:", error)

    except Exception as e:
        print("ERRO:", e)
    finally:
        ssh.close()

if __name__ == "__main__":
    date_arg = sys.argv[1] if len(sys.argv) > 1 else "2026-08-18"
    run_query(date_arg)
