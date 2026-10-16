const { setupDB } = require('./backend/db');
(async () => {
  const db = await setupDB();
  const proxima = await db.get(`
    SELECT ep.id_escala, ep.id_guarnicao, ep.data_servico, ep.horario_servico, ep.nome_recurso
    FROM ESCALA_PLANEJAMENTO ep
    WHERE ep.id_militar = 259 AND ep.data_servico >= CURRENT_DATE
    ORDER BY ep.data_servico ASC
    LIMIT 1
  `);
  console.log('Proxima:', proxima);
  if (proxima && proxima.id_guarnicao) {
    const equipe = await db.all(`
      SELECT ep2.id_escala, ep2.funcao, e.posto_graduacao, e.nome_guerra, (ep2.id_militar = 259) as is_current_user
      FROM ESCALA_PLANEJAMENTO ep2
      JOIN EFETIVO e ON ep2.id_militar = e.id_militar
      WHERE ep2.id_guarnicao = $1
      ORDER BY CASE ep2.funcao WHEN 'Comandante' THEN 1 WHEN 'Motorista' THEN 2 WHEN 'Patrulheiro' THEN 3 ELSE 4 END
    `, [proxima.id_guarnicao]);
    console.log('Equipe count:', equipe.length);
    console.log('Equipe:', equipe);
  }
  process.exit(0);
})();
