import paramiko
import sys

def run_queries():
    hostname = '192.168.1.119'
    username = 'vps_9bpm'
    password = 'asdf1234'
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
        
    try:
        ssh.connect(hostname, username=username, password=password, timeout=10)
        
        # Check counts
        print("--- CONTAGEM DE SERVICOS POR OPM DE ORIGEM DO MILITAR E DA EXECUCAO ---")
        cmd = 'docker exec -t ft-postgres psql -U postgres -d escala_ft -c "' + \
              'SELECT e.opm as militar_opm, s.opm_origem as exec_opm, COUNT(*) ' + \
              'FROM efetivo e ' + \
              'JOIN servicos_executados s ON e.id_militar = s.id_militar ' + \
              'GROUP BY e.opm, s.opm_origem;"'
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8', errors='replace'))
        
    except Exception as e:
        print("Erro:", e)
    finally:
        ssh.close()

if __name__ == '__main__':
    run_queries()
