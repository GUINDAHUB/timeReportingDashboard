// Database table types
export interface Client {
    id: string
    name: string
    default_fee: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface Employee {
    id: string
    name: string
    monthly_salary: number
    monthly_hours: number
    hourly_cost: number // Calculated: monthly_salary / monthly_hours
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface EmployeeMonthlyCost {
    id: string
    employee_id: string
    month: number
    year: number
    monthly_salary: number
    monthly_hours: number
    hourly_cost: number
    notes: string | null
    created_at: string
    updated_at: string
}

export interface ClientMonthlyGoal {
    id: string
    client_id: string
    month: number
    year: number
    fee: number
    expected_hours: number | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface Category {
    id: string
    name: string
    description: string | null
    color: string
    emoji: string | null
    is_default: boolean
    sort_order: number
    parent_id: string | null
    created_at: string
}

export interface CategoryHierarchical extends Category {
    parent_name?: string | null
    parent_emoji?: string | null
    parent_color?: string | null
    keyword_count?: number
    child_count?: number
    children?: CategoryHierarchical[]
}

export interface Keyword {
    id: string
    category_id: string
    word: string
    priority: number
    created_at: string
}

export interface UncategorizedTask {
    id: string
    time_entry_id: string
    task_name: string
    suggested_category_id: string | null
    status: 'pending' | 'reviewed' | 'ignored'
    reviewed_at: string | null
    reviewed_by: string | null
    created_at: string
}

export interface UncategorizedTaskSummary extends UncategorizedTask {
    date: string
    employee_name: string
    duration_hours: number
    client_name: string | null
    suggested_category_name: string | null
    suggested_category_color: string | null
    suggested_category_emoji: string | null
}

export interface CategoryAssignmentHistory {
    id: string
    time_entry_id: string
    old_category_id: string | null
    new_category_id: string
    assignment_type: 'automatic' | 'manual' | 'bulk'
    assigned_by: string | null
    keyword_matched: string | null
    notes: string | null
    created_at: string
}

export interface TimeEntry {
    id: string
    task_name: string
    task_id: string | null
    duration_hours: number
    date: string
    employee_name: string
    employee_id: string | null
    client_id: string | null
    category_id: string | null
    import_batch_id: string
    folder_name: string | null
    list_name: string | null
    raw_data: any | null
    created_at: string
}

// Business logic types
export interface ClientWithMonthlyFee extends Client {
    monthly_fee?: number
    monthly_goal_id?: string
    effective_fee: number // The fee to use (monthly override or default)
}

export interface TimeEntryWithRelations extends TimeEntry {
    client?: Client
    category?: Category
}

// Dashboard KPI types
export interface MonthlyKPIs {
    total_revenue: number
    total_hours: number
    total_cost: number
    profit_margin: number
    profit_margin_percentage: number
    active_clients: number
    average_hourly_rate: number
}

export interface ClientProfitability {
    client_id: string
    client_name: string
    fee: number
    hours_incurred: number
    cost_imputed: number
    margin: number
    margin_percentage: number
    entry_count: number
}

export interface CategoryDistribution {
    category_id: string
    category_name: string
    category_color: string
    hours: number
    percentage: number
    entry_count: number
}

export interface TrendDataPoint {
    month: string
    year: number
    month_num: number
    revenue: number
    cost: number
    profit: number
    hours: number
}

export interface AdvancedKPIs {
    tasa_friccion: number // % of postproduction time on revisions
    coste_gestion: number // % of time on account management
    eficiencia_rodaje: number // Content pieces per production hour
    peso_operativo: number // % of time on daily operations
    desviacion_planificacion: number // Actual vs estimated planning hours
}

// CSV Import types
export interface CSVRow {
    'User ID': string
    'Username': string
    'Time Entry ID': string
    'Task Name': string
    'Time Tracked': string // milliseconds
    'Start Text': string
    'Folder Name': string
    'List Name': string
    'Task ID': string
    [key: string]: string // Allow other columns
}

export interface ParsedTimeEntry {
    task_name: string
    task_id: string
    duration_hours: number
    date: string
    employee_name: string
    employee_id: string
    folder_name: string
    list_name: string
    client_name: string // Extracted from folder/list
    raw_data: any
}

export interface ImportSummary {
    batch_id: string
    total_rows: number
    successful_imports: number
    failed_imports: number
    date_range: {
        start: string
        end: string
    }
    clients_detected: string[]
    unmapped_clients: string[]
    errors: Array<{
        row: number
        error: string
    }>
}

// Date filter types
export type DateFilterMode = 'month' | 'ytd' | 'all'

export interface DateFilter {
    mode: DateFilterMode
    month: number // 1-12
    year: number
}

export interface DateRange {
    start_date: string
    end_date: string
}

// Client mapping for CSV import
export interface ClientMapping {
    csv_name: string // Name as it appears in CSV
    client_id: string | null // Mapped database client
    confidence: 'exact' | 'fuzzy' | 'manual' | 'unmapped'
}
