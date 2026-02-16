-- Migration 005: Operational Costs Distribution Method
-- Adds distribution_method to monthly_operational_costs table
-- Author: Backend Developer
-- Date: 2026-02-12

-- ============================================
-- 1. ADD DISTRIBUTION METHOD COLUMN
-- ============================================
-- Drop existing enum if it exists
DROP TYPE IF EXISTS operational_cost_distribution_method CASCADE;

-- Create enum for distribution methods
CREATE TYPE operational_cost_distribution_method AS ENUM (
    'revenue',      -- Distribute by revenue proportion
    'workload'      -- Distribute by workload/hours proportion
);

-- Add distribution_method column to monthly_operational_costs
ALTER TABLE monthly_operational_costs 
ADD COLUMN IF NOT EXISTS distribution_method operational_cost_distribution_method 
NOT NULL DEFAULT 'revenue';

-- ============================================
-- 2. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN monthly_operational_costs.distribution_method IS 
'Method to distribute operational costs among clients: revenue (proportional to billing) or workload (proportional to hours worked)';

COMMENT ON TYPE operational_cost_distribution_method IS 
'Defines how operational costs are distributed: revenue = by billing amount, workload = by hours worked';
