import urllib.request
import urllib.error
import json
import ssl

BASE_URL = 'http://192.168.1.18:3001/api'

def req(method, endpoint, payload=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(payload).encode('utf-8') if payload else None
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=10) as resp:
            body = resp.read().decode('utf-8')
            try:
                parsed = json.loads(body)
            except:
                parsed = body
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            parsed = json.loads(body)
        except:
            parsed = body
        return e.code, parsed

print("=== SUÍTE DE TESTES DE INTEGRAÇÃO DA API MODULARIZADA ===")

# Test 1: GET /ciclos
status, data = req('GET', '/ciclos')
assert status == 200, f"Expected 200, got {status}"
print(f"✅ 1. GET /api/ciclos -> HTTP {status} (Total de ciclos: {len(data)})")

# Test 2: GET /opms
status, data = req('GET', '/opms')
assert status == 200, f"Expected 200, got {status}"
print(f"✅ 2. GET /api/opms -> HTTP {status} (Total de OPMs: {len(data)})")

# Test 3: GET /tipos-servico
status, data = req('GET', '/tipos-servico')
assert status == 200, f"Expected 200, got {status}"
print(f"✅ 3. GET /api/tipos-servico -> HTTP {status} (Total de tipos: {len(data)})")

# Test 4: GET /ciclo-config
status, data = req('GET', '/ciclo-config')
assert status == 200, f"Expected 200, got {status}"
print(f"✅ 4. GET /api/ciclo-config -> HTTP {status} (dia_inicio={data.get('dia_inicio')})")

# Test 5: POST /login - validação vazia
status, data = req('POST', '/login', {})
assert status == 400, f"Expected 400, got {status}"
assert data.get('error', {}).get('code') == 'MISSING_CREDENTIALS'
print(f"✅ 5. POST /api/login (vazio) -> HTTP {status} (MISSING_CREDENTIALS)")

# Test 6: POST /login - CPF inválido
status, data = req('POST', '/login', {'cpf': '00000000000', 'password': 'teste'})
assert status == 400, f"Expected 400, got {status}"
assert data.get('error', {}).get('code') == 'INVALID_CPF'
print(f"✅ 6. POST /api/login (CPF inválido) -> HTTP {status} (INVALID_CPF)")

# Test 7: GET /me sem token -> 401
status, data = req('GET', '/me')
assert status == 401, f"Expected 401, got {status}"
print(f"✅ 7. GET /api/me (sem token) -> HTTP {status} (UNAUTHORIZED)")

# Test 8: GET /admin/audit-logs sem token -> 401
status, data = req('GET', '/admin/audit-logs')
assert status == 401, f"Expected 401, got {status}"
print(f"✅ 8. GET /api/admin/audit-logs (sem token) -> HTTP {status} (UNAUTHORIZED)")

# Test 9: GET /my-schedules sem token -> 401
status, data = req('GET', '/my-schedules')
assert status == 401, f"Expected 401, got {status}"
print(f"✅ 9. GET /api/my-schedules (sem token) -> HTTP {status} (UNAUTHORIZED)")

# Test 10: Rota inexistente -> 404
status, data = req('GET', '/inexistente')
assert status == 404, f"Expected 404, got {status}"
print(f"✅ 10. GET /api/inexistente -> HTTP {status} (NOT_FOUND)")

print("\n🎉 TODOS OS 10 TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO CONTRA O SERVIDOR DE PRODUÇÃO!")

