import paramiko
import sys

def run_queries():
    hostname = '192.168.1.119'
    username = 'vps_9bpm'
    password = 'asdf1234'
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
            
        ssh.connect(hostname, username=username, password=password, timeout=10)
        print("--- CONTAGEM DE SERVICOS REAIS ---")
        cmd = 'docker exec -t ft-postgres psql -U postgres -d escala_ft -c "' + \
              'SELECT carga_horaria, valor_remuneracao, id_tipo_servico, COUNT(*) ' + \
              'FROM SERVICOS_EXECUTADOS ' + \
              'GROUP BY carga_horaria, valor_remuneracao, id_tipo_servico;"'
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8', errors='replace'))
        
    except Exception as e:
        print("Erro:", e)
    finally:
        ssh.close()

if __name__ == '__main__':
    run_queries()
