-- cleanup_duplicates.sql
DO $$
DECLARE
    r_dup RECORD;
    v_id_principal INT;
    v_id_duplicado INT;
BEGIN
    FOR r_dup IN 
        SELECT id_militar, id_ciclo, COUNT(*)
        FROM REQUERIMENTOS
        GROUP BY id_militar, id_ciclo
        HAVING COUNT(*) > 1
    LOOP
        -- Define o de maior id_requerimento como o principal
        SELECT id_requerimento INTO v_id_principal
        FROM REQUERIMENTOS
        WHERE id_militar = r_dup.id_militar AND id_ciclo = r_dup.id_ciclo
        ORDER BY id_requerimento DESC
        LIMIT 1;

        FOR v_id_duplicado IN
            SELECT id_requerimento
            FROM REQUERIMENTOS
            WHERE id_militar = r_dup.id_militar AND id_ciclo = r_dup.id_ciclo
              AND id_requerimento <> v_id_principal
        LOOP
            -- 1. Redireciona escalas planejadas que apontavam para turnos conflitantes do duplicado
            -- para os turnos correspondentes no principal
            UPDATE ESCALA_PLANEJAMENTO ep
            SET id_disponibilidade = dr_p.id_disponibilidade
            FROM DISPONIBILIDADE_REQUERIMENTO dr_d
            JOIN DISPONIBILIDADE_REQUERIMENTO dr_p ON dr_p.id_requerimento = v_id_principal
              AND dr_p.dia_mes = dr_d.dia_mes
              AND dr_p.horario_turno = dr_d.horario_turno
            WHERE ep.id_disponibilidade = dr_d.id_disponibilidade
              AND dr_d.id_requerimento = v_id_duplicado;

            -- 2. Move os turnos do duplicado que NÃO existem no principal
            UPDATE DISPONIBILIDADE_REQUERIMENTO dr
            SET id_requerimento = v_id_principal
            WHERE dr.id_requerimento = v_id_duplicado
              AND NOT EXISTS (
                  SELECT 1 FROM DISPONIBILIDADE_REQUERIMENTO dr2
                  WHERE dr2.id_requerimento = v_id_principal
                    AND dr2.dia_mes = dr.dia_mes
                    AND dr2.horario_turno = dr.horario_turno
              );

            -- 3. Deleta as disponibilidades restantes (repetidas) do duplicado
            DELETE FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = v_id_duplicado;

            -- 4. Reassocia logs
            UPDATE IMPORTACAO_LOG SET id_requerimento = v_id_principal WHERE id_requerimento = v_id_duplicado;

            -- 5. Deleta o requerimento duplicado
            DELETE FROM REQUERIMENTOS WHERE id_requerimento = v_id_duplicado;
        END LOOP;
    END LOOP;
END $$;
