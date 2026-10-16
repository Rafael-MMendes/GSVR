import psycopg2
import psycopg2.extras

conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/gsvr_prod")
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

cur.execute("""
    SELECT ep.id_escala, ep.id_guarnicao, ep.data_servico, ep.horario_servico, ep.nome_recurso
    FROM ESCALA_PLANEJAMENTO ep
    WHERE ep.id_militar = 259 AND ep.data_servico >= CURRENT_DATE
    ORDER BY ep.data_servico ASC
    LIMIT 1
""")
proxima = cur.fetchone()
print("Proxima:", proxima)

if proxima:
    cur.execute("""
        SELECT ep2.id_escala, ep2.funcao, e.posto_graduacao, e.nome_guerra, (ep2.id_militar = 259) as is_current_user
        FROM ESCALA_PLANEJAMENTO ep2
        JOIN EFETIVO e ON ep2.id_militar = e.id_militar
        WHERE ep2.id_guarnicao = %s
        ORDER BY CASE ep2.funcao WHEN 'Comandante' THEN 1 WHEN 'Motorista' THEN 2 WHEN 'Patrulheiro' THEN 3 ELSE 4 END
    """, [proxima['id_guarnicao']])
    equipe = cur.fetchall()
    print("Equipe:", equipe)

conn.close()
