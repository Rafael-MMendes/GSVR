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
    console.log('--- BUSCANDO TURNOS E MARCAS ---');
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l.includes('07:00') || l.includes('13:00') || l.includes('19:00') || l.includes('01:00') || lines[i].includes('X')) {
            console.log(`L${i.toString().padStart(3, '0')}: |${lines[i]}|`);
        }
    }
}).catch(err => {
    console.error('Erro ao processar PDF:', err);
});
