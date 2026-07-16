-- Script de Correção de Datas de Disponibilidade
WITH corrected AS (
  SELECT 
    dr.id_disponibilidade,
    CASE 
      WHEN EXTRACT(DAY FROM dr.dia_mes)::int >= EXTRACT(DAY FROM c.data_inicio)::int THEN
        MAKE_DATE(
          EXTRACT(YEAR FROM c.data_inicio)::int,
          EXTRACT(MONTH FROM c.data_inicio)::int,
          EXTRACT(DAY FROM dr.dia_mes)::int
        )
      ELSE
        MAKE_DATE(
          EXTRACT(YEAR FROM c.data_fim)::int,
          EXTRACT(MONTH FROM c.data_fim)::int,
          EXTRACT(DAY FROM dr.dia_mes)::int
        )
    END as correct_date
  FROM DISPONIBILIDADE_REQUERIMENTO dr
  JOIN REQUERIMENTOS r ON dr.id_requerimento = r.id_requerimento
  JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
)
UPDATE DISPONIBILIDADE_REQUERIMENTO dr
SET dia_mes = corrected.correct_date
FROM corrected
WHERE dr.id_disponibilidade = corrected.id_disponibilidade;
