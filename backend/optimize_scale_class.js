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
        const totalCostMaxB = numB * this.dailyLimit * this.COST_B;

        if (totalCostMaxB <= remainingBudget) {
            scenarioBDays.forEach(d => {
                d.teams = this.dailyLimit;
                d.cost = d.teams * this.COST_B;
            });
            remainingBudget -= totalCostMaxB;
        } else {
            const teamsPerDay = Math.floor(remainingBudget / (numB * this.COST_B));
            scenarioBDays.forEach(d => {
                d.teams = teamsPerDay;
                d.cost = d.teams * this.COST_B;
            });
            remainingBudget -= (teamsPerDay * numB * this.COST_B);
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
}

module.exports = { ScaleOptimizer };
