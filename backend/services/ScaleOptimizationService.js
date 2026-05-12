const db = require('../db');

class ScaleOptimizer {
    constructor(config) {
        this.budget = parseFloat(config.budget) || 0;
        this.startDate = new Date(config.startDate + 'T00:00:00');
        this.endDate = new Date(config.endDate + 'T00:00:00');
        this.holidays = config.holidays || [];
        this.dailyLimit = parseInt(config.dailyLimit) || 0;
        
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
                scenario: this.getScenario(tempDate),
                teams: 0,
                cost: 0
            });
            tempDate.setDate(tempDate.getDate() + 1);
        }

        let remainingBudget = this.budget;
        const scenarioBDays = schedule.filter(d => d.scenario === 'B');
        const scenarioADays = schedule.filter(d => d.scenario === 'A');

        // Função auxiliar para distribuir equipes em camadas
        const distributeLayer = (days, maxInLayer, costPerTeam) => {
            if (days.length === 0 || remainingBudget < costPerTeam) return;
            
            // Tenta dar 1 equipe por vez para cada dia do grupo até atingir o limite da camada
            let added = true;
            while (added && remainingBudget >= costPerTeam) {
                added = false;
                for (let d of days) {
                    if (d.teams < maxInLayer && d.teams < this.dailyLimit && remainingBudget >= costPerTeam) {
                        d.teams += 1;
                        d.cost += costPerTeam;
                        remainingBudget -= costPerTeam;
                        added = true;
                    }
                }
            }
        };

        // --- ESTRATÉGIA DE CAMADAS PARA EQUILÍBRIO ---
        
        // Camada 1: Garantir o mínimo operacional (1 equipe) em dias críticos (B)
        distributeLayer(scenarioBDays, 1, this.COST_B);

        // Camada 2: Garantir o mínimo operacional (1 equipe) em dias ordinários (A)
        distributeLayer(scenarioADays, 1, this.COST_A);

        // Camada 3: Reforço em dias críticos (Até 50% do limite diário)
        distributeLayer(scenarioBDays, Math.ceil(this.dailyLimit * 0.5), this.COST_B);

        // Camada 4: Reforço em dias ordinários (Até 40% do limite diário)
        distributeLayer(scenarioADays, Math.ceil(this.dailyLimit * 0.4), this.COST_A);

        // Camada 5: Maximizar dias críticos (B) até o limite total
        distributeLayer(scenarioBDays, this.dailyLimit, this.COST_B);

        // Camada 6: Maximizar dias ordinários (A) até o limite total
        distributeLayer(scenarioADays, this.dailyLimit, this.COST_A);

        return {
            schedule,
            totalCost: parseFloat((this.budget - remainingBudget).toFixed(2)),
            remainingBudget: parseFloat(remainingBudget.toFixed(2))
        };
    }
}

async function recalculateMetas(id_ciclo) {
    console.log(`[Optimization] Recalculating metas for ciclo ${id_ciclo}...`);
    
    // 1. Fetch cycle data with OPM sigla
    const cycle = await db.get(`
        SELECT c.*, o.sigla as opm_sigla 
        FROM CICLOS c 
        JOIN OPM o ON c.id_opm = o.id_opm 
        WHERE c.id_ciclo = $1
    `, [id_ciclo]);
    if (!cycle) throw new Error("Ciclo não encontrado.");

    // 2. Fetch executed cost (ONLY for the same OPM as the cycle)
    const executedRes = await db.get(`
        SELECT SUM(valor_remuneracao) as total 
        FROM SERVICOS_EXECUTADOS 
        WHERE id_ciclo = $1 
        AND UPPER(TRIM(opm_origem)) = UPPER(TRIM($2))
    `, [id_ciclo, cycle.opm_sigla]);
    const spent = parseFloat(executedRes.total) || 0;
    const remainingBudget = Math.max(0, parseFloat(cycle.valor_total_previsto) - parseFloat(cycle.valor_contingencia || 0) - spent);

    // 3. Determine remaining period (Optimization starts TODAY)
    const today = new Date();
    today.setHours(0,0,0,0);
    const cycleStart = new Date(cycle.data_inicio);
    const cycleEnd = new Date(cycle.data_fim);
    
    // Se o ciclo já começou, otimizamos a partir de HOJE. 
    // Se não começou, otimizamos a partir da data de início prevista.
    const optStart = today > cycleStart ? today : cycleStart;
    
    if (optStart > cycleEnd) {
        console.log(`[Optimization] Cycle ${id_ciclo} has already ended. No remaining days to optimize.`);
        return;
    }

    // 4. Fetch holidays for the remaining period
    const holidaysRows = await db.all(
        'SELECT data FROM FERIADOS WHERE data BETWEEN $1 AND $2',
        [optStart, cycleEnd]
    );
    const holidays = holidaysRows.map(r => {
        const d = new Date(r.data);
        return d.toISOString().split('T')[0];
    });

    // 5. Run optimization for the remaining period
    const optimizer = new ScaleOptimizer({
        budget: remainingBudget,
        startDate: optStart.toISOString().split('T')[0],
        endDate: cycleEnd.toISOString().split('T')[0],
        holidays: holidays,
        dailyLimit: cycle.limite_equipes_diario || 6
    });

    const result = optimizer.optimize();

    // 6. Persistence (Partial Upsert)
    try {
        await db.transaction(async (client) => {
            // Remove future metas only (preserve past planning)
            await client.query('DELETE FROM METAS_ALOCACAO WHERE id_ciclo = $1 AND data >= $2', [id_ciclo, optStart]);
            
            // Insert new ones for the remaining period
            for (const day of result.schedule) {
                const dateStr = day.date.toISOString().split('T')[0];
                await client.query(
                    'INSERT INTO METAS_ALOCACAO (id_ciclo, data, cenario, qtd_equipes_planejadas, custo_estimado) VALUES ($1, $2, $3, $4, $5)',
                    [id_ciclo, dateStr, day.scenario, day.teams, day.cost]
                );
            }
        });
        console.log(`[Optimization] Metas for ciclo ${id_ciclo} (from ${optStart.toISOString().split('T')[0]}) updated successfully.`);
    } catch (e) {
        console.error(`[Optimization] Error updating metas for ciclo ${id_ciclo}:`, e.message);
        throw e;
    }
}

module.exports = { recalculateMetas };
