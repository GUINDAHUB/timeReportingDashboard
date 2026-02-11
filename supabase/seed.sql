-- Seed data for categories and keywords
-- Based on categorización.md workflow

-- ============================================
-- CATEGORIES (5 Marketing Workflow Phases)
-- ============================================

INSERT INTO categories (name, description, color, emoji, is_default, sort_order) VALUES
(
    'Gestión de Cuenta y Estrategia',
    'Todo tiempo invertido en coordinar al cliente, definir el rumbo y reportar resultados. Fase 0 (Setup) y Fase 1 (Estadísticas y Kick-off).',
    '#10b981',
    '🟢',
    FALSE,
    1
),
(
    'Creatividad y Planificación',
    'El coste de la "materia gris". Tiempo dedicado a pensar qué se va a hacer antes de ejecutarlo. Fase 2 (Ideación y Calendarización).',
    '#f59e0b',
    '🟡',
    FALSE,
    2
),
(
    'Producción de Campo',
    'Recursos logísticos y humanos necesarios para generar el material bruto. Fase 3 (Producción + Sesión).',
    '#f97316',
    '🟠',
    FALSE,
    3
),
(
    'Postproducción y Retrabajo',
    'Transformación del material bruto en entregable final. Fase 4 (Postproducción y Validación).',
    '#ef4444',
    '🔴',
    FALSE,
    4
),
(
    'Operativa Diaria (Run)',
    'Mantenimiento diario del canal. Tareas de alto volumen y recurrencia. Fase 5 (Operación y Programación).',
    '#3b82f6',
    '🔵',
    TRUE,
    5
);

-- ============================================
-- KEYWORDS BY CATEGORY
-- ============================================

-- Get category IDs for reference
DO $$
DECLARE
    cat_gestion UUID;
    cat_creatividad UUID;
    cat_produccion UUID;
    cat_postproduccion UUID;
    cat_operativa UUID;
BEGIN
    SELECT id INTO cat_gestion FROM categories WHERE name = 'Gestión de Cuenta y Estrategia';
    SELECT id INTO cat_creatividad FROM categories WHERE name = 'Creatividad y Planificación';
    SELECT id INTO cat_produccion FROM categories WHERE name = 'Producción de Campo';
    SELECT id INTO cat_postproduccion FROM categories WHERE name = 'Postproducción y Retrabajo';
    SELECT id INTO cat_operativa FROM categories WHERE name = 'Operativa Diaria (Run)';

    -- Keywords for Gestión de Cuenta y Estrategia (🟢)
    INSERT INTO keywords (category_id, word) VALUES
    (cat_gestion, 'onboarding'),
    (cat_gestion, 'offboarding'),
    (cat_gestion, 'estrategia'),
    (cat_gestion, 'informe'),
    (cat_gestion, 'reporte'),
    (cat_gestion, 'kick-off'),
    (cat_gestion, 'kickoff'),
    (cat_gestion, 'reunión'),
    (cat_gestion, 'reunion'),
    (cat_gestion, 'meeting'),
    (cat_gestion, 'insights'),
    (cat_gestion, 'recap'),
    (cat_gestion, 'estadística'),
    (cat_gestion, 'estadisticas'),
    (cat_gestion, 'kpi'),
    (cat_gestion, 'organización'),
    (cat_gestion, 'organizacion'),
    (cat_gestion, 'gestión'),
    (cat_gestion, 'gestion'),
    (cat_gestion, 'pm'),
    (cat_gestion, 'project manager');

    -- Keywords for Creatividad y Planificación (🟡)
    INSERT INTO keywords (category_id, word) VALUES
    (cat_creatividad, 'ideación'),
    (cat_creatividad, 'ideacion'),
    (cat_creatividad, 'ideas'),
    (cat_creatividad, 'brainstorming'),
    (cat_creatividad, 'calendario'),
    (cat_creatividad, 'planificación'),
    (cat_creatividad, 'planificacion'),
    (cat_creatividad, 'esqueleto'),
    (cat_creatividad, 'guión'),
    (cat_creatividad, 'guion'),
    (cat_creatividad, 'guiones'),
    (cat_creatividad, 'ppt'),
    (cat_creatividad, 'presentación'),
    (cat_creatividad, 'presentacion');

    -- Keywords for Producción de Campo (🟠)
    INSERT INTO keywords (category_id, word) VALUES
    (cat_produccion, 'coordinación'),
    (cat_produccion, 'coordinacion'),
    (cat_produccion, 'atrezzo'),
    (cat_produccion, 'alquiler'),
    (cat_produccion, 'compras'),
    (cat_produccion, 'sesión'),
    (cat_produccion, 'sesion'),
    (cat_produccion, 'rodaje'),
    (cat_produccion, 'grabación'),
    (cat_produccion, 'grabacion'),
    (cat_produccion, 'archivos'),
    (cat_produccion, 'drive'),
    (cat_produccion, 'brutos'),
    (cat_produccion, 'producción'),
    (cat_produccion, 'produccion');

    -- Keywords for Postproducción y Retrabajo (🔴)
    INSERT INTO keywords (category_id, word) VALUES
    (cat_postproduccion, 'edición'),
    (cat_postproduccion, 'edicion'),
    (cat_postproduccion, 'montaje'),
    (cat_postproduccion, 'color'),
    (cat_postproduccion, 'diseño'),
    (cat_postproduccion, 'diseno'),
    (cat_postproduccion, 'brief'),
    (cat_postproduccion, 'cambios'),
    (cat_postproduccion, 'correcciones'),
    (cat_postproduccion, 'revisión'),
    (cat_postproduccion, 'revision'),
    (cat_postproduccion, 'retoque'),
    (cat_postproduccion, 'postproducción'),
    (cat_postproduccion, 'postproduccion'),
    (cat_postproduccion, 'vídeo'),
    (cat_postproduccion, 'video'),
    (cat_postproduccion, 'adaptación'),
    (cat_postproduccion, 'adaptacion'),
    (cat_postproduccion, 'formatos');

    -- Keywords for Operativa Diaria (🔵)
    INSERT INTO keywords (category_id, word) VALUES
    (cat_operativa, 'copy'),
    (cat_operativa, 'copywriting'),
    (cat_operativa, 'programación'),
    (cat_operativa, 'programacion'),
    (cat_operativa, 'publicación'),
    (cat_operativa, 'publicacion'),
    (cat_operativa, 'stories'),
    (cat_operativa, 'story'),
    (cat_operativa, 'community'),
    (cat_operativa, 'dm'),
    (cat_operativa, 'dms'),
    (cat_operativa, 'social listening'),
    (cat_operativa, 'interacción'),
    (cat_operativa, 'interaccion'),
    (cat_operativa, 'respuesta'),
    (cat_operativa, 'post'),
    (cat_operativa, 'carrusel'),
    (cat_operativa, 'carru'),
    (cat_operativa, 'reel'),
    (cat_operativa, 'portadilla');
END $$;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to add sample clients:
/*
INSERT INTO clients (name, default_fee) VALUES
('AGAPITO', 2500.00),
('R&B', 3000.00),
('CALIES', 2000.00),
('GUINDA', 1500.00),
('MEX', 3500.00),
('MUJERES EN FARMA', 2800.00),
('MYLITTLEMOMO', 4000.00),
('RAFA MOTA', 2200.00),
('VICTORIA STUDIO', 3200.00);
*/

-- Verify seeding
SELECT 'Categories seeded:' as info, COUNT(*) as count FROM categories;
SELECT 'Keywords seeded:' as info, COUNT(*) as count FROM keywords;
