-- Rollback Migration 005: Operational Costs Distribution Method
-- Removes distribution_method column from monthly_operational_costs
-- Author: Backend Developer
-- Date: 2026-02-12

-- Remove distribution_method column
ALTER TABLE monthly_operational_costs DROP COLUMN IF EXISTS distribution_method;

-- Drop the enum type
DROP TYPE IF EXISTS operational_cost_distribution_method CASCADE;
