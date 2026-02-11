-- FIX: Agregar time_entry_id a la vista uncategorized_tasks_summary
-- Este script corrige el problema donde time_entry_id estaba faltante

DROP VIEW IF EXISTS uncategorized_tasks_summary;

CREATE OR REPLACE VIEW uncategorized_tasks_summary AS
SELECT 
    ut.id,
    ut.time_entry_id,  -- ← CAMPO FALTANTE AÑADIDO
    ut.task_name,
    ut.status,
    ut.created_at,
    te.date,
    te.employee_name,
    te.duration_hours,
    c.name as client_name,
    sc.name as suggested_category_name,
    sc.color as suggested_category_color,
    sc.emoji as suggested_category_emoji
FROM uncategorized_tasks ut
JOIN time_entries te ON ut.time_entry_id = te.id
LEFT JOIN clients c ON te.client_id = c.id
LEFT JOIN categories sc ON ut.suggested_category_id = sc.id;

-- Verificar que la vista se creó correctamente
SELECT * FROM uncategorized_tasks_summary LIMIT 1;
