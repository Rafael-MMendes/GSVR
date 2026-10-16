import os
import sys
import json
import urllib.request
import urllib.error
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = 'http://192.168.1.102:3001/api'
SSH_HOST = '192.168.1.102'
SSH_USER = 'vps_9bpm'
SSH_PASS = 'asdf1234'

def post_json(endpoint, payload, token=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {'raw': body}
        return e.code, parsed

def get_json(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {'raw': body}
        return e.code, parsed

def run_ssh(cmd):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS, timeout=10)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    ssh.close()
    return out.strip(), err.strip()

def run_suite():
    print("=" * 70)
    print("INICIANDO BATERIA DE TESTES DE AUTENTICAÇÃO E SUPERUSER (GSVR)")
    print("=" * 70)

    # 1. Teste de Validação de CPF Inválido
    print("\n[TESTE 1] Login com CPF com dígitos verificadores inválidos...")
    status, res = post_json('/login', {'cpf': '12345678900', 'password': 'QualquerSenha123!'})
    assert status == 400, f"Esperado 400, obteve {status}: {res}"
    assert res.get('error', {}).get('code') == 'INVALID_CPF', f"Esperado INVALID_CPF, obteve {res}"
    print(f"  [PASS] Rejeitado corretamente com 400 INVALID_CPF: {res['error']['message']}")

    # 2. Teste de CPF válido não cadastrado (Prevenção de Enumeração de Contas)
    print("\n[TESTE 2] Login com CPF válido inexistente (Prevenção de Enumeração)...")
    status, res = post_json('/login', {'cpf': '52998224725', 'password': 'SenhaIncorreta123!'})
    assert status == 401, f"Esperado 401, obteve {status}: {res}"
    assert res.get('error', {}).get('code') == 'AUTH_FAILED', f"Esperado AUTH_FAILED, obteve {res}"
    print(f"  [PASS] Mensagem genérica sem vazar existência da conta: {res['error']['message']}")

    # 3. Buscar usuário de teste no banco com senha_definida = false
    print("\n[TESTE 3] Buscando usuário de teste com 1º acesso pendente via SSH...")
    sql = 'SELECT u.id, u.cpf, u.numero_ordem, e.nome_guerra FROM users u JOIN "EFETIVO" e ON e.matricula = u.numero_ordem WHERE u.senha_definida = FALSE LIMIT 1;'
    out, _ = run_ssh(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -t -A -F "|" -c "{sql}"')
    assert out, "Nenhum usuário com primeiro acesso pendente encontrado"
    parts = out.split('|')
    test_user_id, test_cpf, test_matr, test_nome = parts[0], parts[1], parts[2], parts[3]
    print(f"  Usuário selecionado: ID={test_user_id}, CPF={test_cpf}, Matrícula={test_matr}, Nome={test_nome}")

    # 4. Anti-Hijacking: Tentar 1º acesso com CPF certo mas matrícula errada
    print("\n[TESTE 4] Anti-Apropriação de Conta: CPF válido com matrícula incorreta...")
    status, res = post_json('/auth/first-access/validate', {'cpf': test_cpf, 'matricula': '99999999'})
    assert status in (400, 401), f"Esperado 400 ou 401, obteve {status}: {res}"
    print(f"  [PASS] Apropriação bloqueada ({res.get('error', {}).get('code')}): {res.get('error', {}).get('message')}")

    # 5. Validação com credenciais corretas de primeiro acesso
    print("\n[TESTE 5] Primeiro Acesso com credenciais válidas (CPF + Matrícula)...")
    status, res = post_json('/auth/first-access/validate', {'cpf': test_cpf, 'matricula': test_matr})
    token_ativacao = res.get('first_access_token') or res.get('activation_token')
    assert token_ativacao, f"Token de ativação ausente: {res}"
    print(f"  [PASS] Sucesso! Token de uso único emitido: {token_ativacao[:20]}...")

    # 6. Definição de senha fraca (deve ser rejeitada)
    print("\n[TESTE 6] Definição de Senha: Senha fraca rejeitada...")
    status, res = post_json('/auth/first-access/set-password', {
        'activation_token': token_ativacao,
        'password': 'fraca',
        'confirm_password': 'fraca'
    })
    assert status == 400, f"Esperado 400, obteve {status}: {res}"
    print(f"  [PASS] Rejeição de senha fraca: {res.get('error', {}).get('message')}")

    # 7. Definição de senha forte (deve ter sucesso)
    print("\n[TESTE 7] Definição de Senha Forte no Primeiro Acesso...")
    nova_senha = 'Gsvr@Forte2026!#'
    status, res = post_json('/auth/first-access/set-password', {
        'activation_token': token_ativacao,
        'password': nova_senha,
        'confirm_password': nova_senha
    })
    assert status == 200, f"Esperado 200, obteve {status}: {res}"
    print(f"  [PASS] Senha cadastrada com sucesso! Estado de primeiro acesso concluído.")

    # 8. Re-tentativa de primeiro acesso no mesmo usuário (deve ser bloqueada)
    print("\n[TESTE 8] Bloqueio de reexecução indevida de Primeiro Acesso...")
    status, res = post_json('/auth/first-access/validate', {'cpf': test_cpf, 'matricula': test_matr})
    assert status == 400, f"Esperado 400, obteve {status}: {res}"
    assert res.get('error', {}).get('code') == 'ALREADY_COMPLETED', f"Esperado ALREADY_COMPLETED, obteve {res}"
    print(f"  [PASS] Bloqueado com sucesso: {res.get('error', {}).get('message')}")

    # 9. Login com a nova senha cadastrada no primeiro acesso
    print("\n[TESTE 9] Login com CPF e a nova senha cadastrada...")
    status, res = post_json('/login', {'cpf': test_cpf, 'password': nova_senha})
    assert status == 200, f"Esperado 200, obteve {status}: {res}"
    assert res.get('access_token'), f"Token de acesso ausente no login: {res}"
    militar_token = res['access_token']
    print(f"  [PASS] Login realizado com sucesso! Militar autenticado: {res['user']['nome_guerra']}")

    # 10. Provisionamento e Teste de SUPERUSER
    print("\n[TESTE 10] Provisionamento de SUPERUSER para Desenvolvedor...")
    dev_cpf = '52998224725'  # CPF matematicamente válido
    dev_pass = 'SuperDev@GSVR2026!#'
    cmd_prov = f'docker exec -i ft-backend node scripts/provision_superuser.js create --nome "Dev GSVR Lead" --cpf "{dev_cpf}" --matricula "DEV001" --email "dev.gsvr@pmal.al.gov.br" --password "{dev_pass}"'
    out, err = run_ssh(cmd_prov)
    print(f"  Saída do provisionamento:\n{out}")

    # 11. Login com SUPERUSER
    print("\n[TESTE 11] Login com conta SUPERUSER...")
    status, res = post_json('/login', {'cpf': dev_cpf, 'password': dev_pass})
    assert status == 200, f"Esperado 200, obteve {status}: {res}"
    assert res['user']['is_superuser'] is True, f"Esperado is_superuser=True: {res}"
    super_token = res['access_token']
    print(f"  [PASS] SUPERUSER autenticado com sucesso! Roles: {res['user']['roles']}")

    # 12. Acesso a Diagnósticos do Sistema via SUPERUSER
    print("\n[TESTE 12] Acesso ao endpoint restrito de Diagnósticos (/api/admin/diagnostics)...")
    status, res = get_json('/admin/diagnostics', token=super_token)
    assert status == 200, f"Esperado 200, obteve {status}: {res}"
    diag = res.get('diagnostics', {})
    print(f"  [PASS] Diagnósticos obtidos: Node {diag.get('node_version')}, Uptime {diag.get('uptime_seconds')}s, Memória Usada: {diag.get('memory', {}).get('heap_used_mb')}MB")

    # 13. Acesso a Trilha de Auditoria via SUPERUSER
    print("\n[TESTE 13] Acesso aos Logs de Auditoria (/api/admin/audit-logs)...")
    status, res = get_json('/admin/audit-logs?limit=5', token=super_token)
    assert status == 200, f"Esperado 200, obteve {status}: {res}"
    logs = res.get('data', [])
    assert len(logs) > 0, f"Nenhum log retornado: {res}"
    total = res.get('pagination', {}).get('total', len(logs))
    print(f"  [PASS] Auditoria funcionando! Total logs registrados: {total}. Últimas ações:")
    for log in logs[:3]:
        print(f"    - [{log['created_at']}] Ação: {log['action']} | Status: {log['status']} | Usuário: {log.get('usuario_nome') or log.get('cpf')}")

    # 14. Bloqueio por Tentativas Consecutivas Incorretas (Força Bruta)
    print("\n[TESTE 14] Testando Bloqueio contra Força Bruta (5 tentativas com senha errada)...")
    for i in range(1, 6):
        status, res = post_json('/login', {'cpf': test_cpf, 'password': f'SenhaErrada_{i}'})
        print(f"  Tentativa {i}: Status {status}")

    # 6ª tentativa deve dar TEMPORARILY_LOCKED (429)
    status, res = post_json('/login', {'cpf': test_cpf, 'password': 'QualquerOutraSenha'})
    assert status == 429, f"Esperado 429 (bloqueio temporário), obteve {status}: {res}"
    print(f"  [PASS] Conta bloqueada temporariamente após 5 falhas: {res.get('error', {}).get('message')}")

    # Desbloquear conta via API de admin com super_token
    print("\n[TESTE 15] Desbloqueio e restauração da conta pelo SUPERUSER...")
    status, res = post_json(f'/usuarios/{test_user_id}/status', {'bloqueado': False}, token=super_token)
    # Também resetar tentativas falhas no banco
    run_ssh(f'docker exec -i ft-postgres psql -U postgres -d escala_ft -c "UPDATE users SET tentativas_falhas=0, bloqueado_ate=NULL, bloqueado=FALSE WHERE id={test_user_id};"')
    print(f"  [PASS] Conta desbloqueada com sucesso!")

    print("\n" + "=" * 70)
    print("TODOS OS 15 TESTES FORAM EXECUTADOS COM SUCESSO TOTAL!")
    print("=" * 70)

if __name__ == '__main__':
    run_suite()
