-- Rollback for Migration 004: Profitability System - Direct Costs & Operational Costs
-- This script reverses all changes made by 004_profitability_costs.sql
-- Author: Backend Developer
-- Date: 2026-02-11

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- Run this script if you need to undo the changes from migration 004
-- WARNING: This will permanently delete all data from these tables!

-- ============================================
-- 1. DROP ROW LEVEL SECURITY POLICIES
-- ============================================
DROP POLICY IF EXISTS "Allow all for now" ON client_direct_costs;
DROP POLICY IF EXISTS "Allow all for now" ON monthly_operational_costs;

-- ============================================
-- 2. DROP TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_client_direct_costs_updated_at ON client_direct_costs;
DROP TRIGGER IF EXISTS update_monthly_operational_costs_updated_at ON monthly_operational_costs;

-- ============================================
-- 3. DROP INDEXES
-- ============================================
DROP INDEX IF EXISTS idx_client_direct_costs_client;
DROP INDEX IF EXISTS idx_client_direct_costs_period;
DROP INDEX IF EXISTS idx_client_direct_costs_client_period;
DROP INDEX IF EXISTS idx_monthly_operational_costs_period;

-- ============================================
-- 4. DROP TABLES
-- ============================================
DROP TABLE IF EXISTS client_direct_costs CASCADE;
DROP TABLE IF EXISTS monthly_operational_costs CASCADE;

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================
-- All tables, indexes, triggers, and policies from migration 004 have been removed
