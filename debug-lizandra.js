const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = 'D:\\GSVR\\GSVR\\2026-04\\REQUERIMENTO - SD LIZANDRA.pdf';

if (!fs.existsSync(filePath)) {
    console.error('Arquivo não encontrado:', filePath);
    process.exit(1);
}

const buffer = fs.readFileSync(filePath);
pdf(buffer).then(data => {
    const lines = data.text.split('\n');
    console.log('--- TEXTO EXTRAÍDO (POSIÇÕES PRESERVADAS) ---');
    for (let i = 0; i < lines.length; i++) {
        // Mostramos a linha entre aspas para ver os espaços
        console.log(`L${i.toString().padStart(3, '0')}: |${lines[i]}|`);
    }
}).catch(err => {
    console.error('Erro ao processar PDF:', err);
});
