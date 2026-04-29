-- Weekly reports persistence
CREATE TABLE IF NOT EXISTS weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    week_end_exclusive DATE NOT NULL,
    week_label TEXT NOT NULL,
    report_markdown TEXT NOT NULL,
    report_html TEXT NOT NULL,
    model TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_created_at ON weekly_reports(created_at DESC);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for now" ON weekly_reports;
CREATE POLICY "Allow all for now" ON weekly_reports FOR ALL USING (true);
