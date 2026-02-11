-- Migration: Convert existing flat categories to hierarchical structure
-- This script reorganizes the 5 existing categories into parent-child relationships

DO $$
DECLARE
    -- Parent category IDs
    cat_gestion_parent UUID;
    cat_creatividad_parent UUID;
    cat_produccion_parent UUID;
    cat_postproduccion_parent UUID;
    cat_operativa_parent UUID;
    cat_sin_clasificar UUID;
    
    -- Child category IDs
    cat_gestion_onboarding UUID;
    cat_gestion_kpis UUID;
    cat_gestion_reuniones UUID;
    cat_gestion_pm UUID;
    
    cat_creatividad_ideacion UUID;
    cat_creatividad_planificacion UUID;
    cat_creatividad_guiones UUID;
    
    cat_produccion_rodaje UUID;
    cat_produccion_coordinacion UUID;
    cat_produccion_logistica UUID;
    
    cat_postprod_edicion UUID;
    cat_postprod_diseno UUID;
    cat_postprod_correcciones UUID;
    
    cat_operativa_community UUID;
    cat_operativa_publicacion UUID;
    cat_operativa_copy UUID;
BEGIN
    -- ============================================
    -- STEP 1: Update existing categories to be parent categories
    -- ============================================
    
    -- Update sort order and make them parent categories
    UPDATE categories SET sort_order = 10, is_default = FALSE WHERE name = 'Gestión de Cuenta y Estrategia';
    UPDATE categories SET sort_order = 20, is_default = FALSE WHERE name = 'Creatividad y Planificación';
    UPDATE categories SET sort_order = 30, is_default = FALSE WHERE name = 'Producción de Campo';
    UPDATE categories SET sort_order = 40, is_default = FALSE WHERE name = 'Postproducción y Retrabajo';
    UPDATE categories SET sort_order = 50, is_default = FALSE WHERE name = 'Operativa Diaria (Run)';
    
    -- Get parent category IDs
    SELECT id INTO cat_gestion_parent FROM categories WHERE name = 'Gestión de Cuenta y Estrategia';
    SELECT id INTO cat_creatividad_parent FROM categories WHERE name = 'Creatividad y Planificación';
    SELECT id INTO cat_produccion_parent FROM categories WHERE name = 'Producción de Campo';
    SELECT id INTO cat_postproduccion_parent FROM categories WHERE name = 'Postproducción y Retrabajo';
    SELECT id INTO cat_operativa_parent FROM categories WHERE name = 'Operativa Diaria (Run)';
    
    -- ============================================
    -- STEP 2: Create "Sin Clasificar" category
    -- ============================================
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES (
        'Sin Clasificar',
        'Tareas que no han sido categorizadas automáticamente y requieren revisión manual.',
        '#6b7280',
        '❓',
        TRUE,
        0,
        NULL
    ) RETURNING id INTO cat_sin_clasificar;
    
    -- ============================================
    -- STEP 3: Create child categories for Gestión de Cuenta
    -- ============================================
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Onboarding y Setup',
        'Incorporación de nuevos clientes, configuración inicial y kick-offs',
        '#10b981',
        '🚀',
        FALSE,
        11,
        cat_gestion_parent
    ) RETURNING id INTO cat_gestion_onboarding;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'KPIs y Reportes',
        'Informes, estadísticas, análisis de resultados y presentación de insights',
        '#10b981',
        '📊',
        FALSE,
        12,
        cat_gestion_parent
    ) RETURNING id INTO cat_gestion_kpis;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Reuniones Estratégicas',
        'Reuniones con clientes, definición de estrategia y recaps',
        '#10b981',
        '🤝',
        FALSE,
        13,
        cat_gestion_parent
    ) RETURNING id INTO cat_gestion_reuniones;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Project Management',
        'Gestión de proyectos, organización y coordinación interna',
        '#10b981',
        '📋',
        FALSE,
        14,
        cat_gestion_parent
    ) RETURNING id INTO cat_gestion_pm;
    
    -- ============================================
    -- STEP 4: Create child categories for Creatividad
    -- ============================================
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Ideación y Brainstorming',
        'Generación de ideas, sesiones creativas y conceptualización',
        '#f59e0b',
        '💡',
        FALSE,
        21,
        cat_creatividad_parent
    ) RETURNING id INTO cat_creatividad_ideacion;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Planificación Editorial',
        'Calendarios de contenido, planificación de campañas y esqueletos',
        '#f59e0b',
        '📅',
        FALSE,
        22,
        cat_creatividad_parent
    ) RETURNING id INTO cat_creatividad_planificacion;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Desarrollo de Guiones',
        'Redacción de guiones, storyboards y presentaciones',
        '#f59e0b',
        '📝',
        FALSE,
        23,
        cat_creatividad_parent
    ) RETURNING id INTO cat_creatividad_guiones;
    
    -- ============================================
    -- STEP 5: Create child categories for Producción
    -- ============================================
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Rodaje y Sesión',
        'Grabaciones, sesiones fotográficas y producción en campo',
        '#f97316',
        '🎬',
        FALSE,
        31,
        cat_produccion_parent
    ) RETURNING id INTO cat_produccion_rodaje;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Coordinación de Producción',
        'Coordinación de equipos, producción y gestión de recursos humanos',
        '#f97316',
        '🎯',
        FALSE,
        32,
        cat_produccion_parent
    ) RETURNING id INTO cat_produccion_coordinacion;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Logística y Recursos',
        'Gestión de atrezzo, alquileres, compras, archivos y material bruto',
        '#f97316',
        '📦',
        FALSE,
        33,
        cat_produccion_parent
    ) RETURNING id INTO cat_produccion_logistica;
    
    -- ============================================
    -- STEP 6: Create child categories for Postproducción
    -- ============================================
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Edición y Montaje',
        'Edición de video, montaje y postproducción técnica',
        '#ef4444',
        '✂️',
        FALSE,
        41,
        cat_postproduccion_parent
    ) RETURNING id INTO cat_postprod_edicion;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Diseño y Retoque',
        'Diseño gráfico, corrección de color, briefs creativos y retoques',
        '#ef4444',
        '🎨',
        FALSE,
        42,
        cat_postproduccion_parent
    ) RETURNING id INTO cat_postprod_diseno;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Correcciones y Revisiones',
        'Cambios solicitados, revisiones, adaptaciones de formato y retrabajo',
        '#ef4444',
        '🔄',
        FALSE,
        43,
        cat_postproduccion_parent
    ) RETURNING id INTO cat_postprod_correcciones;
    
    -- ============================================
    -- STEP 7: Create child categories for Operativa Diaria
    -- ============================================
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Community Management',
        'Respuestas, DMs, interacciones, social listening y gestión de comunidad',
        '#3b82f6',
        '💬',
        FALSE,
        51,
        cat_operativa_parent
    ) RETURNING id INTO cat_operativa_community;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Publicación de Contenido',
        'Programación, publicación de posts, stories y gestión de contenido',
        '#3b82f6',
        '📱',
        FALSE,
        52,
        cat_operativa_parent
    ) RETURNING id INTO cat_operativa_publicacion;
    
    INSERT INTO categories (name, description, color, emoji, is_default, sort_order, parent_id)
    VALUES 
    (
        'Creación de Copy',
        'Copywriting, redacción de textos para posts, carruseles y reels',
        '#3b82f6',
        '✍️',
        FALSE,
        53,
        cat_operativa_parent
    ) RETURNING id INTO cat_operativa_copy;
    
    -- ============================================
    -- STEP 8: Migrate keywords to child categories
    -- ============================================
    
    -- Gestión de Cuenta - Onboarding y Setup
    UPDATE keywords SET category_id = cat_gestion_onboarding, priority = 10
    WHERE category_id = cat_gestion_parent 
    AND word IN ('onboarding', 'offboarding', 'kick-off', 'kickoff');
    
    -- Gestión de Cuenta - KPIs y Reportes
    UPDATE keywords SET category_id = cat_gestion_kpis, priority = 10
    WHERE category_id = cat_gestion_parent 
    AND word IN ('informe', 'reporte', 'insights', 'recap', 'estadística', 'estadisticas', 'kpi');
    
    -- Gestión de Cuenta - Reuniones Estratégicas
    UPDATE keywords SET category_id = cat_gestion_reuniones, priority = 10
    WHERE category_id = cat_gestion_parent 
    AND word IN ('reunión', 'reunion', 'meeting', 'estrategia');
    
    -- Gestión de Cuenta - Project Management
    UPDATE keywords SET category_id = cat_gestion_pm, priority = 10
    WHERE category_id = cat_gestion_parent 
    AND word IN ('organización', 'organizacion', 'gestión', 'gestion', 'pm', 'project manager');
    
    -- Creatividad - Ideación y Brainstorming
    UPDATE keywords SET category_id = cat_creatividad_ideacion, priority = 10
    WHERE category_id = cat_creatividad_parent 
    AND word IN ('ideación', 'ideacion', 'ideas', 'brainstorming');
    
    -- Creatividad - Planificación Editorial
    UPDATE keywords SET category_id = cat_creatividad_planificacion, priority = 10
    WHERE category_id = cat_creatividad_parent 
    AND word IN ('calendario', 'planificación', 'planificacion', 'esqueleto');
    
    -- Creatividad - Desarrollo de Guiones
    UPDATE keywords SET category_id = cat_creatividad_guiones, priority = 10
    WHERE category_id = cat_creatividad_parent 
    AND word IN ('guión', 'guion', 'guiones', 'ppt', 'presentación', 'presentacion');
    
    -- Producción - Rodaje y Sesión
    UPDATE keywords SET category_id = cat_produccion_rodaje, priority = 10
    WHERE category_id = cat_produccion_parent 
    AND word IN ('sesión', 'sesion', 'rodaje', 'grabación', 'grabacion');
    
    -- Producción - Coordinación
    UPDATE keywords SET category_id = cat_produccion_coordinacion, priority = 10
    WHERE category_id = cat_produccion_parent 
    AND word IN ('coordinación', 'coordinacion', 'producción', 'produccion');
    
    -- Producción - Logística
    UPDATE keywords SET category_id = cat_produccion_logistica, priority = 10
    WHERE category_id = cat_produccion_parent 
    AND word IN ('atrezzo', 'alquiler', 'compras', 'archivos', 'drive', 'brutos');
    
    -- Postproducción - Edición y Montaje
    UPDATE keywords SET category_id = cat_postprod_edicion, priority = 10
    WHERE category_id = cat_postproduccion_parent 
    AND word IN ('edición', 'edicion', 'montaje', 'postproducción', 'postproduccion', 'vídeo', 'video');
    
    -- Postproducción - Diseño y Retoque
    UPDATE keywords SET category_id = cat_postprod_diseno, priority = 10
    WHERE category_id = cat_postproduccion_parent 
    AND word IN ('color', 'diseño', 'diseno', 'brief', 'retoque');
    
    -- Postproducción - Correcciones
    UPDATE keywords SET category_id = cat_postprod_correcciones, priority = 10
    WHERE category_id = cat_postproduccion_parent 
    AND word IN ('cambios', 'correcciones', 'revisión', 'revision', 'adaptación', 'adaptacion', 'formatos');
    
    -- Operativa - Community Management
    UPDATE keywords SET category_id = cat_operativa_community, priority = 10
    WHERE category_id = cat_operativa_parent 
    AND word IN ('community', 'dm', 'dms', 'social listening', 'interacción', 'interaccion', 'respuesta');
    
    -- Operativa - Publicación
    UPDATE keywords SET category_id = cat_operativa_publicacion, priority = 10
    WHERE category_id = cat_operativa_parent 
    AND word IN ('publicación', 'publicacion', 'programación', 'programacion', 'post', 'stories', 'story');
    
    -- Operativa - Copy
    UPDATE keywords SET category_id = cat_operativa_copy, priority = 10
    WHERE category_id = cat_operativa_parent 
    AND word IN ('copy', 'copywriting', 'carrusel', 'carru', 'reel', 'portadilla');
    
    -- ============================================
    -- STEP 9: Update existing time_entries with default category
    -- ============================================
    
    -- Update entries that were using the old default category to use new "Sin Clasificar"
    UPDATE time_entries 
    SET category_id = cat_sin_clasificar
    WHERE category_id = cat_operativa_parent;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Created 1 "Sin Clasificar" category';
    RAISE NOTICE 'Created 4 child categories for Gestión de Cuenta';
    RAISE NOTICE 'Created 3 child categories for Creatividad';
    RAISE NOTICE 'Created 3 child categories for Producción';
    RAISE NOTICE 'Created 3 child categories for Postproducción';
    RAISE NOTICE 'Created 3 child categories for Operativa Diaria';
    RAISE NOTICE 'Total: 17 new categories (16 children + 1 Sin Clasificar)';
    RAISE NOTICE 'Keywords have been reassigned to appropriate child categories';
END $$;

-- Verify the migration
SELECT 'Categories with parent' as category_type, COUNT(*) as count 
FROM categories WHERE parent_id IS NOT NULL
UNION ALL
SELECT 'Root categories' as category_type, COUNT(*) as count 
FROM categories WHERE parent_id IS NULL
UNION ALL
SELECT 'Total keywords' as category_type, COUNT(*) as count FROM keywords;
