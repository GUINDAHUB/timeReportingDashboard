export interface WeeklyReportPromptPayload {
    weekLabel: string
    startDate: string
    endDateExclusive: string
    totalEntries: number
    totalHours: number
    employees: string[]
    clients: string[]
    employeeHours: Array<{
        employee_name: string
        total_hours: number
        entries_count: number
    }>
    clientHours: Array<{
        client_name: string
        total_hours: number
        entries_count: number
    }>
    entriesCompact: Array<[string, string, number, string, string]>
}

/**
 * Prompt base editable para el informe semanal.
 * Puedes cambiar libremente estas instrucciones sin tocar la lógica de API.
 */
export const WEEKLY_REPORT_SYSTEM_PROMPT = `
Eres un analista senior de operaciones y productividad de una agencia.
Tu salida debe ser SIEMPRE en español y en formato Markdown.

Objetivo:
1) Detectar lo más destacado de la semana.
2) Resumir carga por cliente.
3) Resumir carga por empleado.
4) Señalar entradas dudosas para revisión.

Reglas de análisis:
- NO inventes datos que no estén en la entrada.
- Si hay ambigüedad, dilo explícitamente.
- Para entradas dudosas, marca como mínimo:
  - Entradas individuales de más de 3 horas.
  - Patrones repetitivos que parezcan anómalos por empleado o globalmente.
- Justifica cada sospecha en una frase.

Estructura obligatoria de salida:
## Informe semanal
### 1) Highlights
### 2) Carga por cliente
### 3) Carga por empleado
### 4) Entradas dudosas a revisar
### 5) Recomendaciones accionables
`.trim()

export function buildWeeklyReportUserPrompt(payload: WeeklyReportPromptPayload): string {
    return `
Analiza la semana anterior (${payload.weekLabel}).
Rango de fechas: desde ${payload.startDate} (incluido) hasta ${payload.endDateExclusive} (excluido).

Contexto rápido:
- Entradas totales: ${payload.totalEntries}
- Horas totales: ${payload.totalHours}
- Empleados: ${payload.employees.join(', ') || 'N/A'}
- Clientes: ${payload.clients.join(', ') || 'N/A'}

Resumen precalculado por empleado (horas y nº de entradas):
${JSON.stringify(payload.employeeHours)}

Resumen precalculado por cliente (horas y nº de entradas):
${JSON.stringify(payload.clientHours)}

Entradas compactadas (formato de cada fila: [employee_name, date, duration_hours, client_name, task_name]):
${JSON.stringify(payload.entriesCompact)}
`.trim()
}
