import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.1.102', username='vps_9bpm', password='asdf1234', timeout=10)
    
    # 1. Consultar ESCALA_PLANEJAMENTO para 22/09/2026
    sql_plan = """
    SELECT 
        ep.id_escala, ep.data_servico, ep.nome_recurso, ep.horario_servico, ep.id_guarnicao,
        ep.funcao, e.matricula, e.posto_graduacao, e.nome_guerra
    FROM ESCALA_PLANEJAMENTO ep
    LEFT JOIN EFETIVO e ON ep.id_militar = e.id_militar
    WHERE ep.data_servico = '2026-09-22'
    ORDER BY ep.nome_recurso, ep.id_guarnicao, ep.horario_servico, ep.funcao;
    """
    
    # 2. Consultar SERVICOS_EXECUTADOS para 22/09/2026
    sql_exec = """
    SELECT 
        se.id_execucao, se.data_execucao, se.guarnicao, se.horario, se.id_guarnicao,
        e.matricula, e.posto_graduacao, e.nome_guerra, se.carga_horaria, se.valor_remuneracao
    FROM SERVICOS_EXECUTADOS se
    LEFT JOIN EFETIVO e ON se.id_militar = e.id_militar
    WHERE se.data_execucao = '2026-09-22'
    ORDER BY se.guarnicao, e.posto_graduacao, e.nome_guerra;
    """
    
    print("=" * 60)
    print("--- 1. ESCALA_PLANEJAMENTO (22/09/2026) ---")
    print("=" * 60)
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql_plan}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("=" * 60)
    print("--- 2. SERVICOS_EXECUTADOS (22/09/2026) ---")
    print("=" * 60)
    cmd = f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "{sql_exec}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace'))

except Exception as e:
    print("ERRO:", e)
finally:
    ssh.close()
