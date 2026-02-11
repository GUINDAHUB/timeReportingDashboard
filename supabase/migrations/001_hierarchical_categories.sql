-- Migration: Hierarchical Categories System
-- Adds support for parent-child category relationships and keyword priorities

-- ============================================
-- 1. Add parent_id to categories table
-- ============================================
ALTER TABLE categories 
ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Index for efficient parent-child lookups
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================
-- 2. Add priority to keywords table
-- ============================================
ALTER TABLE keywords 
ADD COLUMN priority INTEGER DEFAULT 0;

-- Higher priority = checked first (0 is lowest)
COMMENT ON COLUMN keywords.priority IS 'Keyword matching priority. Higher numbers are checked first.';

-- ============================================
-- 3. Create uncategorized tasks tracking
-- ============================================
CREATE TABLE IF NOT EXISTS uncategorized_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'ignored')),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(time_entry_id)
);

CREATE INDEX idx_uncategorized_status ON uncategorized_tasks(status);
CREATE INDEX idx_uncategorized_created ON uncategorized_tasks(created_at DESC);

-- ============================================
-- 4. Create category assignment history
-- ============================================
CREATE TABLE IF NOT EXISTS category_assignments_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    old_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    new_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('automatic', 'manual', 'bulk')),
    assigned_by TEXT,
    keyword_matched TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assignments_time_entry ON category_assignments_history(time_entry_id);
CREATE INDEX idx_assignments_created ON category_assignments_history(created_at DESC);

-- ============================================
-- 5. Enable RLS on new tables
-- ============================================
ALTER TABLE uncategorized_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_assignments_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON uncategorized_tasks FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON category_assignments_history FOR ALL USING (true);

-- ============================================
-- 6. Helper views
-- ============================================

-- View: Categories with parent info
CREATE OR REPLACE VIEW categories_hierarchical AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.color,
    c.emoji,
    c.is_default,
    c.sort_order,
    c.parent_id,
    p.name as parent_name,
    p.emoji as parent_emoji,
    p.color as parent_color,
    (SELECT COUNT(*) FROM keywords WHERE category_id = c.id) as keyword_count,
    (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as child_count,
    c.created_at
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id;

-- View: Uncategorized tasks summary
CREATE OR REPLACE VIEW uncategorized_tasks_summary AS
SELECT 
    ut.id,
    ut.time_entry_id,
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

-- ============================================
-- 7. Functions
-- ============================================

-- Function: Get category hierarchy path
CREATE OR REPLACE FUNCTION get_category_path(cat_id UUID)
RETURNS TEXT AS $$
DECLARE
    path TEXT;
    parent_name TEXT;
    current_id UUID;
BEGIN
    SELECT name INTO path FROM categories WHERE id = cat_id;
    current_id := cat_id;
    
    LOOP
        SELECT c.parent_id, p.name INTO current_id, parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        WHERE c.id = current_id;
        
        EXIT WHEN current_id IS NULL;
        
        path := parent_name || ' > ' || path;
    END LOOP;
    
    RETURN path;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark task as uncategorized if needed
CREATE OR REPLACE FUNCTION track_uncategorized_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- If category_id is NULL or is the default "Sin clasificar" category
    IF NEW.category_id IS NULL OR 
       (SELECT is_default FROM categories WHERE id = NEW.category_id) THEN
        INSERT INTO uncategorized_tasks (time_entry_id, task_name, status)
        VALUES (NEW.id, NEW.task_name, 'pending')
        ON CONFLICT (time_entry_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-track uncategorized entries
CREATE TRIGGER track_uncategorized_time_entries
    AFTER INSERT ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION track_uncategorized_entry();
