const fs = require('fs');

/**
 * ScaleOptimizer GSVR
 */
class ScaleOptimizer {
    constructor(config) {
        this.budget = config.budget;
        this.startDate = new Date(config.startDate + 'T00:00:00');
        this.endDate = new Date(config.endDate + 'T00:00:00');
        this.holidays = config.holidays || [];
        this.dailyLimit = config.dailyLimit;
        
        this.COST_A = 576.09; // 192.03 * 3
        this.COST_B = 750.00; // 250.00 * 3
    }

    isHoliday(date) {
        const iso = date.toISOString().split('T')[0];
        return this.holidays.includes(iso);
    }

    getScenario(date) {
        const day = date.getDay(); // 0-Dom, 5-Sex, 6-Sab
        if (day === 0 || day === 5 || day === 6 || this.isHoliday(date)) {
            return 'B';
        }
        return 'A';
    }

    optimize() {
        const schedule = [];
        let tempDate = new Date(this.startDate);
        while (tempDate <= this.endDate) {
            schedule.push({
                date: new Date(tempDate),
                dayName: tempDate.toLocaleDateString('pt-BR', { weekday: 'long' }),
                scenario: this.getScenario(tempDate),
                teams: 0,
                cost: 0
            });
            tempDate.setDate(tempDate.getDate() + 1);
        }

        let remainingBudget = this.budget;

        // --- SCENARIO B ALLOCATION ---
        const scenarioBDays = schedule.filter(d => d.scenario === 'B');
        const numB = scenarioBDays.length;
        
        // Max possible for B
        const totalPossibleB = numB * this.dailyLimit;
        const totalCostMaxB = totalPossibleB * this.COST_B;

        if (totalCostMaxB <= remainingBudget) {
            // Can saturate all B days
            scenarioBDays.forEach(d => {
                d.teams = this.dailyLimit;
                d.cost = d.teams * this.COST_B;
            });
            remainingBudget -= totalCostMaxB;
        } else {
            // Budget insufficient for B saturation, apply uniform reduction
            const teamsPerDay = Math.floor(remainingBudget / (numB * this.COST_B));
            scenarioBDays.forEach(d => {
                d.teams = teamsPerDay;
                d.cost = d.teams * this.COST_B;
            });
            remainingBudget -= (teamsPerDay * numB * this.COST_B);

            // Distribute remaining units one by one
            let extraTeams = Math.floor(remainingBudget / this.COST_B);
            for (let i = 0; i < extraTeams && i < numB; i++) {
                scenarioBDays[i].teams += 1;
                scenarioBDays[i].cost += this.COST_B;
                remainingBudget -= this.COST_B;
            }
        }

        // --- SCENARIO A ALLOCATION ---
        const scenarioADays = schedule.filter(d => d.scenario === 'A');
        const numA = scenarioADays.length;

        if (numA > 0 && remainingBudget >= this.COST_A) {
            const teamsPerDay = Math.min(this.dailyLimit, Math.floor(remainingBudget / (numA * this.COST_A)));
            scenarioADays.forEach(d => {
                d.teams = teamsPerDay;
                d.cost = d.teams * this.COST_A;
            });
            remainingBudget -= (teamsPerDay * numA * this.COST_A);

            // Distribute remaining units one by one up to limit
            let extraTeams = Math.floor(remainingBudget / this.COST_A);
            for (let i = 0; i < extraTeams && i < numA; i++) {
                if (scenarioADays[i].teams < this.dailyLimit) {
                    scenarioADays[i].teams += 1;
                    scenarioADays[i].cost += this.COST_A;
                    remainingBudget -= this.COST_A;
                }
            }
        }

        return {
            schedule,
            totalCost: this.budget - remainingBudget,
            remainingBudget: parseFloat(remainingBudget.toFixed(2))
        };
    }

    formatTable(result) {
        let table = "| Data | Dia | Cenário | Equipes | Custo Diário | Saldo |\n";
        table += "| :--- | :--- | :--- | :--- | :--- | :--- |\n";
        let currentBalance = this.budget;

        result.schedule.forEach(d => {
            currentBalance -= d.cost;
            const dateStr = d.date.toLocaleDateString('pt-BR');
            const dayName = d.dayName.charAt(0).toUpperCase() + d.dayName.slice(1);
            table += `| ${dateStr} | ${dayName} | ${d.scenario} | ${d.teams} | R$ ${d.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} |\n`;
        });

        return table;
    }
}

// Data from DB
const config = {
    budget: 85000.00,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    holidays: ['2026-04-03', '2026-04-21'],
    dailyLimit: 6 // Assumption
};

const optimizer = new ScaleOptimizer(config);
const result = optimizer.optimize();
console.log(optimizer.formatTable(result));
console.log(`\nResumo:`);
console.log(`Custo Total: R$ ${result.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`Saldo Final: R$ ${result.remainingBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
