-- Migration 004: Profitability System - Direct Costs & Operational Costs
-- Adds support for calculating Gross Margin (Margen Bruto) and Net Margin (EBIT)
-- Author: Backend Developer
-- Date: 2026-02-11

-- ============================================
-- 1. CLIENT DIRECT COSTS TABLE
-- Stores variable costs specific to a client in a given month
-- ============================================
CREATE TABLE IF NOT EXISTS client_direct_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate entries for same client/month/year
    UNIQUE(client_id, month, year)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_client_direct_costs_client ON client_direct_costs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_direct_costs_period ON client_direct_costs(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_client_direct_costs_client_period ON client_direct_costs(client_id, year DESC, month DESC);

-- ============================================
-- 2. MONTHLY OPERATIONAL COSTS TABLE
-- Stores fixed operational costs for the entire company per month
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_operational_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Only one entry per month/year
    UNIQUE(month, year)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_monthly_operational_costs_period ON monthly_operational_costs(year DESC, month DESC);

-- ============================================
-- 3. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_client_direct_costs_updated_at
    BEFORE UPDATE ON client_direct_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_operational_costs_updated_at
    BEFORE UPDATE ON monthly_operational_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE client_direct_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_operational_costs ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (single tenant)
CREATE POLICY "Allow all for now" ON client_direct_costs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON monthly_operational_costs FOR ALL USING (true);

-- ============================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE client_direct_costs IS 'Stores direct/variable costs specific to a client project in a given month';
COMMENT ON TABLE monthly_operational_costs IS 'Stores fixed operational costs for the entire company per month';
COMMENT ON COLUMN client_direct_costs.amount IS 'Direct cost amount in euros for this client in this month';
COMMENT ON COLUMN monthly_operational_costs.amount IS 'Total operational costs for the company in this month';
