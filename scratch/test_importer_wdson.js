const fs = require('fs');
const path = require('path');
const pdf = require(path.resolve(__dirname, '../backend/node_modules/pdf-parse'));
const { extractFromText } = require(path.resolve(__dirname, '../backend/services/PdfExtractor'));
const CycleEngine = require(path.resolve(__dirname, '../backend/services/CycleEngine'));
const { fragmentarComCiclosExplicitos } = require(path.resolve(__dirname, '../backend/services/RequirementImporter'));

const buffer = fs.readFileSync(path.resolve(__dirname, '../util/SGT WDSON - NOV.pdf'));

pdf(buffer).then(async data => {
  const extracted = extractFromText(data.text);
  console.log("Militar:", extracted.name, "Matrícula/Ordem:", extracted.numero_ordem);
  console.log("Dias extraídos do PDF:", Object.keys(extracted.availability).sort((a,b)=>Number(a)-Number(b)));

  // Test with cycles in reverse order [8, 7]
  const ciclosReverse = [
    { id_ciclo: 8, data_inicio: '2026-11-16', data_fim: '2026-12-15', status: 'Fechado' },
    { id_ciclo: 7, data_inicio: '2026-10-16', data_fim: '2026-11-15', status: 'Aberto' }
  ];

  const engine = new CycleEngine(16);

  console.log("\n--- TESTE COM ENTRADA [Ciclo 8, Ciclo 7] (ordem inversa) ---");
  const res1 = fragmentarComCiclosExplicitos(extracted.availability, 2026, 11, ciclosReverse, engine);
  for (const f of res1.fragmentos) {
    console.log(`Fragmento Ciclo ${f.idCiclo}: dias ->`, Object.keys(f.diasMap).sort());
  }

  console.log("\n--- TESTE COM ENTRADA [Ciclo 7, Ciclo 8] (ordem direta) ---");
  const ciclosDirect = [
    { id_ciclo: 7, data_inicio: '2026-10-16', data_fim: '2026-11-15', status: 'Aberto' },
    { id_ciclo: 8, data_inicio: '2026-11-16', data_fim: '2026-12-15', status: 'Fechado' }
  ];
  const res2 = fragmentarComCiclosExplicitos(extracted.availability, 2026, 11, ciclosDirect, engine);
  for (const f of res2.fragmentos) {
    console.log(`Fragmento Ciclo ${f.idCiclo}: dias ->`, Object.keys(f.diasMap).sort());
  }

  // Assertions:
  const c7_dias = Object.keys(res1.fragmentos.find(f => f.idCiclo === 7).diasMap);
  const c8_dias = Object.keys(res1.fragmentos.find(f => f.idCiclo === 8).diasMap);

  const c7_expected = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
  const c8_expected = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-27', '2026-11-28', '2026-11-29'];

  const match7 = JSON.stringify(c7_dias.sort()) === JSON.stringify(c7_expected.sort());
  const match8 = JSON.stringify(c8_dias.sort()) === JSON.stringify(c8_expected.sort());

  console.log("\nCiclo 7 corresponde perfeitamente ao esperado?", match7 ? "✅ SIM" : "❌ NÃO");
  console.log("Ciclo 8 corresponde perfeitamente ao esperado?", match8 ? "✅ SIM" : "❌ NÃO");
});
