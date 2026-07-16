const fs = require('fs');
const pdfParser = require('pdf-parse');

async function test() {
  const buf = fs.readFileSync('c:\\Users\\PMAL-DATEN\\Desktop\\projetos\\GSVR\\2026-04\\REQUERIMENTO - SGT FEITOSA.pdf');
  const pdf = await pdfParser(buf);
  console.log("TEXT START\n" + pdf.text.slice(0, 500) + "\nTEXT END");
  
  const text = pdf.text;
  const data = { numero_ordem: '', name: '', rank: '', phone: '', motorist: 'Nao', availability: {}, month_key: '', numero_requerimento: '' };

  const reqNumMatch = text.match(/(?:Requerido nº|REQUERIMENTO)\s*[:\.]?\s*(\d{1,10}\/\d{4}[^\n]*)/i);
  if (reqNumMatch) {
    data.numero_requerimento = reqNumMatch[1].trim();
  }
  
  const rankRegex = /(?:CEL|TC|MAJ|CAP|1º\s*TEN|2º\s*TEN|SUB|1º\s*SGT|2º\s*SGT|3º\s*SGT|CB|SD)\s+PM/i;
  const rankMatch = text.match(rankRegex);
  if (rankMatch) {
    data.rank = rankMatch[0].toUpperCase().replace(/\s+/g, ' ');
  } else {
    const rankRegexAlt = /(?:CORONEL|TENENTE\s*CORONEL|MAJOR|CAPIT[ÃA]O|TENENTE|SUBTENENTE|SARGENTO|CABO|SOLDADO)/i;
    const rankMatchAlt = text.match(rankRegexAlt);
    if (rankMatchAlt) data.rank = rankMatchAlt[0].toUpperCase();
  }
  
  console.log("Extracted Data (Partial):", data);
}

test().catch(console.error);
