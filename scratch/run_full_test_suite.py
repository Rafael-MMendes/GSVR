import requests
import json
import sys

BASE_URL = "http://192.168.1.102:3001"

print("=" * 70)
print(" SUÍTE DE TESTES OBRIGATÓRIOS — ÁREA DO USUÁRIO (MINHAS ESCALAS)")
print("=" * 70)

def login(numero_ordem, password):
    url = f"{BASE_URL}/api/login"
    res = requests.post(url, json={"numero_ordem": numero_ordem, "password": password}, timeout=10)
    if res.status_code != 200:
        raise Exception(f"Login failed for {numero_ordem}: {res.status_code} {res.text}")
    data = res.json()
    return data["access_token"], data["user"]

results = {}

# ----------------------------------------------------------------------
# CENÁRIO E: Usuário não autenticado
# ----------------------------------------------------------------------
print("\n[TESTE E] Validando proteção contra usuário não autenticado...")
try:
    res_no_auth = requests.get(f"{BASE_URL}/api/my-schedules", timeout=10)
    assert res_no_auth.status_code == 401, f"Esperado 401, obtido {res_no_auth.status_code}"
    
    res_no_auth_detail = requests.get(f"{BASE_URL}/api/my-schedules/8430", timeout=10)
    assert res_no_auth_detail.status_code == 401, f"Esperado 401 no detalhe, obtido {res_no_auth_detail.status_code}"
    
    print("  -> SUCESSO: Requisições sem token rejeitadas com 401 Unauthorized.")
    results["Cenário E"] = "PASSOU"
except Exception as e:
    print(f"  -> FALHOU: {e}")
    results["Cenário E"] = f"FALHOU: {e}"

# ----------------------------------------------------------------------
# CENÁRIO A: Usuário com escalas (CARVALHO - 53880)
# ----------------------------------------------------------------------
print("\n[TESTE A] Validando usuário com escalas cadastradas (CARVALHO - 53880)...")
try:
    token_carvalho, user_carvalho = login("53880", "09601191402")
    headers_carvalho = {"Authorization": f"Bearer {token_carvalho}"}
    
    res_a = requests.get(f"{BASE_URL}/api/my-schedules", headers=headers_carvalho, timeout=10)
    assert res_a.status_code == 200, f"Status incorreto: {res_a.status_code}"
    body_a = res_a.json()
    assert body_a["success"] is True
    assert body_a["military"] is not None
    assert body_a["military"]["matricula"] == "53880"
    assert len(body_a["schedules"]) > 0, "Deveria conter escalas"
    assert body_a["summary"]["total_geral"] > 0
    
    # Detalhe de uma escala própria
    primeira_escala_id = body_a["schedules"][0]["id_escala"]
    res_detail = requests.get(f"{BASE_URL}/api/my-schedules/{primeira_escala_id}", headers=headers_carvalho, timeout=10)
    assert res_detail.status_code == 200, f"Detalhe falhou: {res_detail.status_code}"
    body_detail = res_detail.json()
    assert body_detail["success"] is True
    assert body_detail["data"]["id_escala"] == primeira_escala_id
    assert "equipe" in body_detail["data"]
    
    print(f"  -> SUCESSO: Militar {body_a['military']['nome_guerra']} possui {len(body_a['schedules'])} escalas.")
    print(f"     Próxima escala: {body_a['summary']['proxima_escala']['data_formatada'] if body_a['summary']['proxima_escala'] else 'Nenhuma'}")
    results["Cenário A"] = "PASSOU"
except Exception as e:
    print(f"  -> FALHOU: {e}")
    results["Cenário A"] = f"FALHOU: {e}"

# ----------------------------------------------------------------------
# CENÁRIO B: Usuário sem escalas (MATIAS - 7927)
# ----------------------------------------------------------------------
print("\n[TESTE B] Validando usuário sem escalas cadastradas (MATIAS - 7927)...")
try:
    token_matias, user_matias = login("7927", "02579474501")
    headers_matias = {"Authorization": f"Bearer {token_matias}"}
    
    res_b = requests.get(f"{BASE_URL}/api/my-schedules", headers=headers_matias, timeout=10)
    assert res_b.status_code == 200, f"Status incorreto: {res_b.status_code}"
    body_b = res_b.json()
    assert body_b["success"] is True
    assert len(body_b["schedules"]) == 0, f"Esperado 0 escalas, obtido {len(body_b['schedules'])}"
    assert body_b["summary"]["total_geral"] == 0
    assert body_b["summary"]["proxima_escala"] is None
    
    print(f"  -> SUCESSO: Usuário sem escalas retornou lista vazia e indicadores zerados sem erro.")
    results["Cenário B"] = "PASSOU"
except Exception as e:
    print(f"  -> FALHOU: {e}")
    results["Cenário B"] = f"FALHOU: {e}"

# ----------------------------------------------------------------------
# CENÁRIO C: Isolamento entre usuários distintos
# ----------------------------------------------------------------------
print("\n[TESTE C] Validando isolamento rigoroso entre usuários distintos...")
try:
    # Usuário 1: CARVALHO (53880)
    # Usuário 2: WDSON (655120)
    token_wdson, user_wdson = login("655120", "06747113438")
    headers_wdson = {"Authorization": f"Bearer {token_wdson}"}
    
    res_carvalho = requests.get(f"{BASE_URL}/api/my-schedules", headers=headers_carvalho, timeout=10).json()
    res_wdson = requests.get(f"{BASE_URL}/api/my-schedules", headers=headers_wdson, timeout=10).json()
    
    ids_carvalho = {s["id_escala"] for s in res_carvalho["schedules"]}
    ids_wdson = {s["id_escala"] for s in res_wdson["schedules"]}
    
    # Interseção deve ser estritamente vazia (uma escala é individual por id_militar)
    intersecao = ids_carvalho.intersection(ids_wdson)
    assert len(intersecao) == 0, f"Falha de isolamento! Escalas compartilhadas: {intersecao}"
    
    # Garantir que nenhum registro de um tem o id_militar do outro
    militar_id_carvalho = res_carvalho["military"]["id_militar"]
    militar_id_wdson = res_wdson["military"]["id_militar"]
    assert militar_id_carvalho != militar_id_wdson
    
    for s in res_carvalho["schedules"]:
        assert s["id_militar"] == militar_id_carvalho
    for s in res_wdson["schedules"]:
        assert s["id_militar"] == militar_id_wdson
        
    print(f"  -> SUCESSO: Carvalho ({len(ids_carvalho)} escalas, id_militar {militar_id_carvalho}) e Wdson ({len(ids_wdson)} escalas, id_militar {militar_id_wdson}) completamente isolados.")
    results["Cenário C"] = "PASSOU"
except Exception as e:
    print(f"  -> FALHOU: {e}")
    results["Cenário C"] = f"FALHOU: {e}"

# ----------------------------------------------------------------------
# CENÁRIO D: Tentativa de acesso indevido (IDOR / Quebra de autorização)
# ----------------------------------------------------------------------
print("\n[TESTE D] Validando bloqueio a tentativa de acesso indevido a escala de terceiro...")
try:
    # Wdson tenta acessar detalhe de uma escala pertencente a Carvalho
    escala_de_carvalho = list(ids_carvalho)[0]
    res_invasao = requests.get(f"{BASE_URL}/api/my-schedules/{escala_de_carvalho}", headers=headers_wdson, timeout=10)
    
    assert res_invasao.status_code == 403, f"Esperado 403 Forbidden, obtido {res_invasao.status_code}"
    body_invasao = res_invasao.json()
    assert body_invasao["success"] is False
    assert body_invasao["error"]["code"] == "FORBIDDEN"
    
    print(f"  -> SUCESSO: Tentativa de acesso bloqueada com HTTP 403 Forbidden: {body_invasao['error']['message']}")
    results["Cenário D"] = "PASSOU"
except Exception as e:
    print(f"  -> FALHOU: {e}")
    results["Cenário D"] = f"FALHOU: {e}"

# ----------------------------------------------------------------------
# CENÁRIO F: Perfil Administrador preservado
# ----------------------------------------------------------------------
print("\n[TESTE F] Validando perfil administrativo e funcionalidades preservadas...")
try:
    token_admin, user_admin = login("999999", "00000000000")
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    
    # 1. Rota administrativa de roles
    res_roles = requests.get(f"{BASE_URL}/api/roles", headers=headers_admin, timeout=10)
    assert res_roles.status_code == 200, f"Admin /api/roles falhou: {res_roles.status_code}"
    
    # 2. Rota administrativa de relatórios
    res_rep = requests.get(f"{BASE_URL}/api/reports/operacional-detalhado", headers=headers_admin, timeout=10)
    assert res_rep.status_code == 200, f"Admin relatório operacional falhou: {res_rep.status_code}"
    
    # 3. Admin também pode chamar /api/my-schedules sem quebrar
    res_admin_my = requests.get(f"{BASE_URL}/api/my-schedules", headers=headers_admin, timeout=10)
    assert res_admin_my.status_code == 200, f"Admin /api/my-schedules falhou: {res_admin_my.status_code}"
    
    # 4. Usuário padrão NÃO PODE acessar rota admin
    res_bloqueio_padrao = requests.get(f"{BASE_URL}/api/roles", headers=headers_carvalho, timeout=10)
    assert res_bloqueio_padrao.status_code in [401, 403], f"Usuário padrão não deveria acessar /api/roles, obteve {res_bloqueio_padrao.status_code}"
    
    print("  -> SUCESSO: Rotas administrativas continuam operando integralmente e usuário padrão continua bloqueado de recursos administrativos.")
    results["Cenário F"] = "PASSOU"
except Exception as e:
    print(f"  -> FALHOU: {e}")
    results["Cenário F"] = f"FALHOU: {e}"

# ----------------------------------------------------------------------
# CENÁRIO G: Filtros e datas
# ----------------------------------------------------------------------
print("\n[TESTE G] Validando funcionamento de filtros de pesquisa e datas...")
try:
    # Filtro por situação 'realizadas'
    res_realizadas = requests.get(f"{BASE_URL}/api/my-schedules?situacao=realizadas", headers=headers_carvalho, timeout=10).json()
    assert res_realizadas["success"] is True
    for s in res_realizadas["schedules"]:
        assert s["situacao"] == "Realizada", f"Esperado situacao Realizada, obtido {s['situacao']}"
        assert s["id_militar"] == militar_id_carvalho
        
    # Filtro por busca textual
    res_search = requests.get(f"{BASE_URL}/api/my-schedules?search=Piranhas", headers=headers_carvalho, timeout=10).json()
    assert res_search["success"] is True
    for s in res_search["schedules"]:
        assert "piranhas" in s["nome_recurso"].lower() or "piranhas" in (s["tipo_servico"] or "").lower()
        assert s["id_militar"] == militar_id_carvalho
        
    print("  -> SUCESSO: Filtros por situação e busca textual filtraram precisamente sem expor terceiros.")
    results["Cenário G"] = "PASSOU"
except Exception as e:
    print(f"  -> FALHOU: {e}")
    results["Cenário G"] = f"FALHOU: {e}"

print("\n" + "=" * 70)
print(" RESUMO FINAL DOS TESTES EXECUTADOS:")
print("=" * 70)
all_passed = True
for c, r in results.items():
    print(f"  {c}: {r}")
    if "PASSOU" not in r:
        all_passed = False

if all_passed:
    print("\n>>> TODOS OS CENÁRIOS DE SEGURANÇA E FUNCIONALIDADE FORAM APROVADOS! <<<")
    sys.exit(0)
else:
    print("\n>>> HOUVE FALHA EM UM OU MAIS CENÁRIOS! <<<")
    sys.exit(1)
