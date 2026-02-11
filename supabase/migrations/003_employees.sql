-- Migration: Create employees and employee_monthly_costs tables
-- Description: Add support for employee cost tracking with monthly variations

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

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
