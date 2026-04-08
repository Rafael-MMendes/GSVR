const XLSX = require('xlsx');
const { setupDB } = require('./db');
const path = require('path');

async function importFromEfetivoExcel() {
  console.log('--- Iniciando Importação de Efetivo (Excel) ---');
  
  // Caminho do arquivo informado pelo usuário
  const filePath = path.resolve(__dirname, '..', 'utilitarios-dev', 'efetivo.xlsx');
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converte para objeto JSON usando a primeira linha como cabeçalho
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Arquivo carregado. Total de registros: ${data.length}`);
    
    const db = await setupDB();
    
    let imported = 0;
    let errors = 0;
    let skipped = 0;

    for (const row of data) {
      // Mapeamento dinâmico baseado em nomes de colunas comuns
      const nome_completo = row['Nome'] || row['Nome Completo'] || row['NOME COMPLETO'] || row['nome_completo'];
      const matricula = String(row['Matrícula'] || row['Matricula'] || row['MATRICULA'] || row['n_ordem'] || '').trim();
      const numero_ordem = String(row['Nº Ordem'] || row['Numero Ordem'] || row['NÚMERO ORDEM'] || '').trim();
      const cpf = String(row['CPF'] || row['Cpf'] || '').trim();
      const posto_graduacao = row['Posto/Graduação'] || row['Posto'] || row['Graduacão'] || row['RANK'] || row['POSTO'];
      const nome_guerra = row['Nome de Guerra'] || row['Guerra'] || row['NOME DE GUERRA'] || row['Nome Guerra'] || '';
      const telefone = String(row['Telefone'] || row['Celular'] || '');
      const opm = row['Unidade'] || row['OPM'] || row['ORGANIZAÇÃO'] || '';

      if ((matricula || numero_ordem) && cpf && nome_completo) {
        try {
          await db.run(
            `INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, numero_ordem, cpf, opm, telefone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (cpf) 
             DO UPDATE SET 
               nome_completo = EXCLUDED.nome_completo,
               nome_guerra = EXCLUDED.nome_guerra,
               posto_graduacao = EXCLUDED.posto_graduacao,
               matricula = COALESCE(EXCLUDED.matricula, EFETIVO.matricula),
               numero_ordem = COALESCE(EXCLUDED.numero_ordem, EFETIVO.numero_ordem),
               opm = EXCLUDED.opm,
               telefone = EXCLUDED.telefone,
               status_ativo = TRUE`,
            [nome_completo, nome_guerra, posto_graduacao || 'Militar', matricula || null, numero_ordem || null, cpf, opm, telefone]
          );

          // Criar usuário para login caso não exista (Matrícula / CPF)
          await db.run(
            `INSERT INTO users (numero_ordem, password) 
             VALUES (?, ?) 
             ON CONFLICT (numero_ordem) DO NOTHING`,
            [matricula, cpf]
          );

          imported++;
        } catch (e) {
          console.error(`Erro ao inserir militar (${matricula}):`, e.message);
          errors++;
        }
      } else {
        skipped++;
      }
    }

    console.log(`--- Resumo da Importação ---`);
    console.log(`Sucesso: ${imported}`);
    console.log(`Pulados (dados incompletos): ${skipped}`);
    console.log(`Erros: ${errors}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Falha crítica ao ler o arquivo Excel:', err.message);
    process.exit(1);
  }
}

importFromEfetivoExcel();
