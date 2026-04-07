const fs = require('fs');
const pdf = require('pdf-parse');

const buffer = fs.readFileSync('D:\\Nova pasta\\Gestão de Força Tarefa\\documentos\\2026-04\\REQUERIMENTO - SGT FLAVIANA.pdf');
pdf(buffer).then(data => {
  const lines = data.text.split('\n');
  
  console.log('=== PROCURANDO TURNO E LINHAS DE DIAS ===\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detecta linhas de turno
    if (line.includes('07:00') || line.includes('13:00') || line.includes('19:00') || line.includes('01:00')) {
      console.log(`TURNO ENCONTRADO NA LINHA ${i}: "${line}"`);
      console.log(`   Linha ${i+1} (cabeçalho): "${lines[i+1]?.trim()}"`);
      console.log(`   Linha ${i+2} (dados): "${lines[i+2]?.trim()}"`);
      console.log('');
    }
  }
  
  console.log('\n=== PRIMEIRAS 60 LINHAS DO DOCUMENTO ===\n');
  for (let i = 0; i < Math.min(60, lines.length); i++) {
    if (lines[i].trim()) {
      console.log(`[${i}] ${lines[i]}`);
    }
  }
});