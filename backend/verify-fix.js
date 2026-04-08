const mockData = "  S XXS  XS X S   S  XS  XS  XS "; // Original line from SD LIZANDRA PDF

function processMarksLineSim(line) {
    const chars = line.split('');
    const data = { motorist: 'Nao', availability: {} };
    
    const motoristChar = chars[0];
    data.motorist = (motoristChar && motoristChar.toUpperCase() === 'X') ? 'Sim' : 'Nao';
    
    let dayCounter = 0;
    for (let pos = 1; pos < chars.length && dayCounter < 31; pos++) {
        const char = chars[pos];
        dayCounter++;
        const dayStr = String(dayCounter).padStart(2, '0');
        const isAvailable = (char && char.toUpperCase() === 'X');
        if (isAvailable) {
            if (!data.availability[dayStr]) data.availability[dayStr] = [];
            data.availability[dayStr].push('MANHA');
        }
    }
    return data;
}

const result = processMarksLineSim(mockData);
console.log('Result for Day 4:', result.availability['04']);
console.log('Result for Day 2:', result.availability['02']);
console.log('Motorista:', result.motorist);

if (result.availability['04'] && !result.availability['02'] && result.motorist === 'Nao') {
    console.log('FIX VERIFIED: Positional mapping is correct.');
} else {
    console.error('FIX FAILED: Positional mapping is still wrong!');
    process.exit(1);
}
