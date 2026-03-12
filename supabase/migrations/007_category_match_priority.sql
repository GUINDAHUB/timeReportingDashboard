-- Migration: Category Match Priority
-- Adds an explicit priority field at child-category level for auto-categorization

-- 1) Add match_priority column to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS match_priority INTEGER DEFAULT 0;

COMMENT ON COLUMN categories.match_priority IS 'Prioridad de auto-categorización. Números más altos ganan cuando varias categorías coinciden.';

-- 2) Update categories_hierarchical view to expose match_priority
DROP VIEW IF EXISTS categories_hierarchical;

CREATE OR REPLACE VIEW categories_hierarchical AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.color,
    c.emoji,
    c.is_default,
    c.sort_order,
    c.match_priority,
    c.parent_id,
    p.name as parent_name,
    p.emoji as parent_emoji,
    p.color as parent_color,
    (SELECT COUNT(*) FROM keywords WHERE category_id = c.id) as keyword_count,
    (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as child_count,
    c.created_at
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id;

