-- Guinda Time Tracking SO - Database Schema
-- PostgreSQL/Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CLIENTS TABLE
-- Stores client identity and default fee
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    default_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active clients lookup
CREATE INDEX idx_clients_active ON clients(is_active) WHERE is_active = TRUE;

-- ============================================
-- 2. CLIENT MONTHLY GOALS TABLE
-- Time-series financial data per client/month
-- ============================================
CREATE TABLE IF NOT EXISTS client_monthly_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    fee NUMERIC(10, 2) NOT NULL,
    expected_hours NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate entries for same client/month/year
    UNIQUE(client_id, month, year)
);

-- Index for efficient month/year queries
CREATE INDEX idx_monthly_goals_period ON client_monthly_goals(year DESC, month DESC);
CREATE INDEX idx_monthly_goals_client ON client_monthly_goals(client_id);

-- ============================================
-- 3. CATEGORIES TABLE
-- Service classification master (5 workflow phases)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL, -- Hex color code
    emoji TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one default category allowed
CREATE UNIQUE INDEX idx_categories_default ON categories(is_default) WHERE is_default = TRUE;

-- ============================================
-- 4. KEYWORDS TABLE
-- Auto-classification engine
-- ============================================
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for case-insensitive keyword matching
CREATE INDEX idx_keywords_word ON keywords(LOWER(word));
CREATE INDEX idx_keywords_category ON keywords(category_id);

-- ============================================
-- 5. TIME ENTRIES TABLE
-- The big data - all imported time records
-- ============================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_name TEXT NOT NULL,
    task_id TEXT, -- ClickUp task ID
    duration_hours NUMERIC(10, 2) NOT NULL CHECK (duration_hours >= 0),
    date DATE NOT NULL,
    employee_name TEXT NOT NULL,
    employee_id TEXT, -- ClickUp user ID
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    import_batch_id TEXT NOT NULL,
    folder_name TEXT, -- For audit/debugging
    list_name TEXT, -- For audit/debugging
    raw_data JSONB, -- Store original CSV row for reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Critical indexes for performance
CREATE INDEX idx_time_entries_date ON time_entries(date DESC);
CREATE INDEX idx_time_entries_client ON time_entries(client_id);
CREATE INDEX idx_time_entries_category ON time_entries(category_id);
CREATE INDEX idx_time_entries_employee ON time_entries(employee_name);
CREATE INDEX idx_time_entries_batch ON time_entries(import_batch_id);

-- Composite index for common dashboard queries (date range + client)
CREATE INDEX idx_time_entries_date_client ON time_entries(date DESC, client_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_goals_updated_at BEFORE UPDATE ON client_monthly_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EMPLOYEES TABLES
-- ============================================

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    monthly_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
    monthly_hours NUMERIC(10, 2) NOT NULL DEFAULT 160,
    hourly_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create employee_monthly_costs table (for monthly overrides)
CREATE TABLE IF NOT EXISTS employee_monthly_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    monthly_salary NUMERIC(10, 2) NOT NULL,
    monthly_hours NUMERIC(10, 2) NOT NULL,
    hourly_cost NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_costs_employee ON employee_monthly_costs(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_costs_period ON employee_monthly_costs(year, month);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_monthly_costs_updated_at ON employee_monthly_costs;
CREATE TRIGGER update_employee_monthly_costs_updated_at
    BEFORE UPDATE ON employee_monthly_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE employees IS 'Stores employee information with default monthly salary and hours';
COMMENT ON TABLE employee_monthly_costs IS 'Stores month-specific overrides for employee costs';
COMMENT ON COLUMN employees.hourly_cost IS 'Calculated as monthly_salary / monthly_hours';
COMMENT ON COLUMN employee_monthly_costs.hourly_cost IS 'Calculated as monthly_salary / monthly_hours for this specific month';

-- ============================================
-- PROFITABILITY SYSTEM TABLES
-- ============================================

-- Create client_direct_costs table (variable costs per client/month)
CREATE TABLE IF NOT EXISTS client_direct_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, month, year)
);

-- Create monthly_operational_costs table (fixed costs per month)
CREATE TABLE IF NOT EXISTS monthly_operational_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(month, year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_direct_costs_client ON client_direct_costs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_direct_costs_period ON client_direct_costs(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_client_direct_costs_client_period ON client_direct_costs(client_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_operational_costs_period ON monthly_operational_costs(year DESC, month DESC);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_client_direct_costs_updated_at ON client_direct_costs;
CREATE TRIGGER update_client_direct_costs_updated_at
    BEFORE UPDATE ON client_direct_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_operational_costs_updated_at ON monthly_operational_costs;
CREATE TRIGGER update_monthly_operational_costs_updated_at
    BEFORE UPDATE ON monthly_operational_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE client_direct_costs IS 'Stores direct/variable costs specific to a client project in a given month';
COMMENT ON TABLE monthly_operational_costs IS 'Stores fixed operational costs for the entire company per month';
COMMENT ON COLUMN client_direct_costs.amount IS 'Direct cost amount in euros for this client in this month';
COMMENT ON COLUMN monthly_operational_costs.amount IS 'Total operational costs for the company in this month';

-- ============================================
-- ROW LEVEL SECURITY (Future multi-tenancy)
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_monthly_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_direct_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_operational_costs ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (single tenant)
-- TODO: Add org_id column and policies when multi-tenant
CREATE POLICY "Allow all for now" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON client_monthly_goals FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON keywords FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON time_entries FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON employee_monthly_costs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON client_direct_costs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON monthly_operational_costs FOR ALL USING (true);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Client with current month fee
CREATE OR REPLACE VIEW clients_with_current_fee AS
SELECT 
    c.id,
    c.name,
    c.default_fee,
    c.is_active,
    COALESCE(cmg.fee, c.default_fee) as current_fee,
    cmg.month,
    cmg.year
FROM clients c
LEFT JOIN client_monthly_goals cmg ON c.id = cmg.client_id 
    AND cmg.month = EXTRACT(MONTH FROM CURRENT_DATE)
    AND cmg.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- View: Monthly summary statistics
CREATE OR REPLACE VIEW monthly_stats AS
SELECT 
    DATE_TRUNC('month', date) as month,
    client_id,
    COUNT(*) as entry_count,
    SUM(duration_hours) as total_hours,
    COUNT(DISTINCT employee_name) as employee_count,
    COUNT(DISTINCT category_id) as category_count
FROM time_entries
GROUP BY DATE_TRUNC('month', date), client_id;
