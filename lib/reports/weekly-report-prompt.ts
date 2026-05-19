import type { WeeklyReportData } from './weekly-report-data'

export interface WeeklyReportNarrative {
    highlights: string[]
    clientObservations: string[]
    employeeObservations: string[]
    doubtfulAnalysis: string[]
}

export const WEEKLY_REPORT_SYSTEM_PROMPT = `
Eres un analista senior de operaciones de una agencia. Trabajas para los directores de la empresa, que usan tu informe semanal para tomar decisiones de carga de trabajo, asignación y revisión de calidad.

Tu salida debe ser EXCLUSIVAMENTE un objeto JSON válido con esta forma exacta:

{
  "highlights": [string, ...],
  "clientObservations": [string, ...],
  "employeeObservations": [string, ...],
  "doubtfulAnalysis": [string, ...]
}

Reglas:
- Idioma: español.
- Cada string es una frase corta y accionable (máximo ~200 caracteres).
- Devuelve entre 4 y 7 elementos por sección.
- NO inventes datos: usa solo lo que aparece en los agregados precomputados.
- NO escribas markdown fuera de **negritas** puntuales en frases.
- NO incluyas texto fuera del objeto JSON, ni explicaciones, ni bloques de código.
- highlights: insights de alto nivel del rango (tendencias, concentraciones, outliers, riesgos).
- clientObservations: lectura de la carga por cliente: concentración, clientes con poca/excesiva carga, mezcla de empleados, tareas dominantes.
- employeeObservations: lectura por empleado: sobre/infracarga, dispersión entre clientes, presencia de cliente principal claro, días activos.
- doubtfulAnalysis: interpretación cualitativa de las entradas largas (>3h) y de las reuniones/duplicidades detectadas (cuáles llaman la atención y por qué, sin repetir la lista).

Si no hay nada relevante para una sección, devuelve un array con un único string explicándolo brevemente. Nunca devuelvas un array vacío.
`.trim()

function compactClients(data: WeeklyReportData) {
    return data.clients.slice(0, 25).map((c) => ({
        client: c.name,
        hours: c.hours,
        entries: c.entries,
        pct: c.pctOfTotal,
        avg_per_entry: c.avgHoursPerEntry,
        days_active: c.daysActive,
        top_employees: c.topEmployees.slice(0, 3).map((e) => ({ name: e.name, hours: e.hours, pct: e.pct })),
        top_tasks: c.topTasks.slice(0, 3).map((t) => ({ task: t.task, hours: t.hours, count: t.count })),
    }))
}

function compactEmployees(data: WeeklyReportData) {
    return data.employees.slice(0, 50).map((e) => ({
        employee: e.name,
        hours: e.hours,
        entries: e.entries,
        pct: e.pctOfTotal,
        avg_per_entry: e.avgHoursPerEntry,
        days_active: e.daysActive,
        avg_per_active_day: e.avgHoursPerActiveDay,
        principal_client: e.principalClient,
        top_clients: e.topClients.slice(0, 3).map((c) => ({ name: c.name, hours: c.hours, pct: c.pct })),
        top_tasks: e.topTasks.slice(0, 3).map((t) => ({ task: t.task, hours: t.hours, count: t.count })),
    }))
}

function compactLongEntries(data: WeeklyReportData) {
    return data.longEntries.slice(0, 30).map((e) => ({
        employee: e.employee,
        date: e.date,
        hours: e.hours,
        client: e.client,
        task: e.task,
    }))
}

function compactSharedTasks(data: WeeklyReportData) {
    return data.sharedTasks.slice(0, 25).map((s) => ({
        date: s.date,
        task_display: s.displayTask,
        client: s.client,
        flag_type: s.flagType,
        employees_count: s.employeesCount,
        total_hours: s.totalHours,
        breakdown: s.entries.map((e) => ({ employee: e.employee, hours: e.hours })),
    }))
}

function compactPerDay(data: WeeklyReportData) {
    return data.perDayHours.map((d) => ({ date: d.date, hours: d.hours, entries: d.entries }))
}

export function buildWeeklyReportUserPrompt(data: WeeklyReportData): string {
    const payload = {
        week_label: data.weekLabel,
        start_date: data.startDate,
        end_date_exclusive: data.endDateExclusive,
        totals: {
            entries: data.totalEntries,
            hours: data.totalHours,
            distinct_employees: data.distinctEmployees,
            distinct_clients: data.distinctClients,
            distinct_days: data.distinctDays,
        },
        per_day: compactPerDay(data),
        clients: compactClients(data),
        employees: compactEmployees(data),
        long_entries_over_3h: compactLongEntries(data),
        shared_or_meeting_tasks: compactSharedTasks(data),
    }

    return `
Analiza la semana ${data.weekLabel} (rango ${data.startDate} → ${data.endDateExclusive} excl.).
A continuación tienes los agregados precomputados. Devuelve el JSON pedido en el system prompt.

DATOS:
${JSON.stringify(payload)}
`.trim()
}

export function parseWeeklyReportNarrative(rawText: string): WeeklyReportNarrative {
    const fallback: WeeklyReportNarrative = {
        highlights: ['No se pudo interpretar la respuesta del modelo.'],
        clientObservations: ['Sin observaciones disponibles.'],
        employeeObservations: ['Sin observaciones disponibles.'],
        doubtfulAnalysis: ['Sin análisis cualitativo disponible.'],
    }

    if (!rawText) return fallback

    const trimmed = rawText.trim()
    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return fallback

    const jsonChunk = trimmed.slice(firstBrace, lastBrace + 1)

    try {
        const parsed = JSON.parse(jsonChunk) as Partial<WeeklyReportNarrative>
        return {
            highlights: ensureStringArray(parsed.highlights, fallback.highlights),
            clientObservations: ensureStringArray(parsed.clientObservations, fallback.clientObservations),
            employeeObservations: ensureStringArray(parsed.employeeObservations, fallback.employeeObservations),
            doubtfulAnalysis: ensureStringArray(parsed.doubtfulAnalysis, fallback.doubtfulAnalysis),
        }
    } catch {
        return fallback
    }
}

function ensureStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) return fallback
    const cleaned = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    return cleaned.length > 0 ? cleaned : fallback
}

export function narrativeToMarkdown(narrative: WeeklyReportNarrative, data: WeeklyReportData): string {
    const fmtList = (items: string[]) => items.map((i) => `- ${i}`).join('\n')
    return [
        `## Informe semanal ${data.weekLabel}`,
        '',
        '### 1) Highlights',
        fmtList(narrative.highlights),
        '',
        '### 2) Carga por cliente — Observaciones',
        fmtList(narrative.clientObservations),
        '',
        '### 3) Carga por empleado — Observaciones',
        fmtList(narrative.employeeObservations),
        '',
        '### 4) Entradas dudosas a revisar — Análisis',
        fmtList(narrative.doubtfulAnalysis),
    ].join('\n')
}
