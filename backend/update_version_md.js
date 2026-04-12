const fs = require('fs');
const path = require('path');

const filePath = path.join('g:', 'projetos', 'GSVR', 'VERSION.md');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/Força Tarefa/g, 'GSVR');
content = content.replace(/força tarefa/g, 'GSVR');
content = content.replace(/FORÇA TAREFA/g, 'GSVR');

fs.writeFileSync(filePath, content);
console.log('VERSION.md updated successfully');
