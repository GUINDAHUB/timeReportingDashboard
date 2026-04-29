import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
    WEEKLY_REPORT_SYSTEM_PROMPT,
    buildWeeklyReportUserPrompt,
    WeeklyReportPromptPayload,
} from '@/lib/reports/weekly-report-prompt'
import { buildWeeklyReportHtml } from '@/lib/reports/weekly-report-html'

interface TimeEntryRow {
    id: string
    task_name: string
    duration_hours: number
    date: string
    employee_name: string
    client_id: string | null
    clients: { name: string } | { name: string }[] | null
}

interface WeeklyReportRow {
    id: string
    week_start: string
    week_end_exclusive: string
    week_label: string
    report_markdown: string
    report_html: string
    model: string | null
    meta: Record<string, unknown> | null
    created_at: string
}

function getPreviousWeekRange(today = new Date()) {
    const utcNow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const day = utcNow.getUTCDay() // 0 domingo, 1 lunes, ...
    const daysSinceMonday = (day + 6) % 7

    const startOfCurrentWeek = new Date(utcNow)
    startOfCurrentWeek.setUTCDate(utcNow.getUTCDate() - daysSinceMonday)

    const startOfPreviousWeek = new Date(startOfCurrentWeek)
    startOfPreviousWeek.setUTCDate(startOfCurrentWeek.getUTCDate() - 7)

    return {
        startDate: startOfPreviousWeek.toISOString().slice(0, 10),
        endDateExclusive: startOfCurrentWeek.toISOString().slice(0, 10),
    }
}

function getClientName(entry: TimeEntryRow): string {
    if (!entry.clients) return 'Sin cliente'
    if (Array.isArray(entry.clients)) return entry.clients[0]?.name || 'Sin cliente'
    return entry.clients.name || 'Sin cliente'
}

function toNumber(value: unknown): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') return Number(value) || 0
    return 0
}

async function callClaude(systemPrompt: string, userPrompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    const preferredModel = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7'

    if (!apiKey) {
        throw new Error('Falta la variable de entorno ANTHROPIC_API_KEY')
    }

    const candidateModels = Array.from(
        new Set([
            preferredModel,
            'claude-sonnet-4-6',
            'claude-sonnet-4-5',
            'claude-sonnet-4-5-20250929',
            'claude-haiku-4-5',
            'claude-haiku-4-5-20251001',
            'claude-opus-4-6',
            'claude-opus-4-7',
            'claude-opus-4-5',
            'claude-opus-4-5-20251101',
            'claude-opus-4-1',
            'claude-opus-4-1-20250805',
            'claude-mythos-preview',
        ])
    )

    let lastError = ''

    for (const model of candidateModels) {
        const buildBody = (includeTemperature: boolean) => ({
            model,
            max_tokens: 2500,
            ...(includeTemperature ? { temperature: 0.2 } : {}),
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
        })

        const requestClaude = async (includeTemperature: boolean) =>
            fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify(buildBody(includeTemperature)),
            })

        let response = await requestClaude(true)
        let errorBody = response.ok ? '' : await response.text()

        // Algunos modelos nuevos (ej: claude-opus-4-7) deprecian temperature.
        if (
            !response.ok &&
            response.status === 400 &&
            errorBody.toLowerCase().includes('temperature') &&
            errorBody.toLowerCase().includes('deprecated')
        ) {
            response = await requestClaude(false)
            errorBody = response.ok ? '' : await response.text()
        }

        if (response.ok) {
            const data = await response.json()
            const textBlocks = (data?.content || []).filter((block: any) => block?.type === 'text')
            const reportText = textBlocks.map((block: any) => block.text).join('\n\n').trim()

            if (!reportText) {
                throw new Error('Claude no devolvió contenido de texto')
            }

            return {
                reportText,
                usage: data?.usage || null,
                model: data?.model || model,
            }
        }

        lastError = `Claude API error (${response.status}) con modelo "${model}": ${errorBody}`

        // Solo reintentamos con otro modelo si el problema es "modelo no encontrado".
        if (!(response.status === 404 && errorBody.includes('model'))) {
            throw new Error(lastError)
        }
    }

    throw new Error(lastError || 'No se encontró un modelo Claude compatible')
}

export async function POST() {
    const supabase = createServerClient()

    try {
        const { startDate, endDateExclusive } = getPreviousWeekRange()

        const { data: entries, error } = await supabase
            .from('time_entries')
            .select('id, task_name, duration_hours, date, employee_name, client_id, clients(name)')
            .gte('date', startDate)
            .lt('date', endDateExclusive)
            .order('employee_name', { ascending: true })
            .order('date', { ascending: true })

        if (error) {
            console.error('Error loading weekly time entries:', error)
            return NextResponse.json(
                { error: 'No se pudieron cargar las entradas de la semana anterior' },
                { status: 500 }
            )
        }

        const typedEntries = (entries || []) as TimeEntryRow[]

        if (typedEntries.length === 0) {
            const emptyPayload: WeeklyReportPromptPayload = {
                weekLabel: `${startDate} - ${new Date(
                    new Date(endDateExclusive).getTime() - 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .slice(0, 10)}`,
                startDate,
                endDateExclusive,
                totalEntries: 0,
                totalHours: 0,
                employees: [],
                clients: [],
                employeeHours: [],
                clientHours: [],
                entriesCompact: [],
            }
            const emptyReport = '## Informe semanal\n\nNo hay entradas de tiempo para la semana anterior.'
            const emptyHtml = buildWeeklyReportHtml({
                reportMarkdown: emptyReport,
                payload: emptyPayload,
                generatedAtIso: new Date().toISOString(),
            })
            await supabase.from('weekly_reports').insert({
                week_start: startDate,
                week_end_exclusive: endDateExclusive,
                week_label: emptyPayload.weekLabel,
                report_markdown: emptyReport,
                report_html: emptyHtml,
                model: null,
                meta: {
                    startDate,
                    endDateExclusive,
                    totalEntries: 0,
                    totalHours: 0,
                },
            })
            return NextResponse.json({
                success: true,
                report: emptyReport,
                reportHtml: emptyHtml,
                reportFileName: `informe-semanal-${startDate}.html`,
                meta: {
                    startDate,
                    endDateExclusive,
                    totalEntries: 0,
                    totalHours: 0,
                },
            })
        }

        const employeeStats = new Map<string, { hours: number; entries: number }>()
        const clientStats = new Map<string, { hours: number; entries: number }>()

        const entriesCompact: WeeklyReportPromptPayload['entriesCompact'] = typedEntries.map((entry) => {
            const hours = toNumber(entry.duration_hours)
            const clientName = getClientName(entry)

            const emp = employeeStats.get(entry.employee_name) || { hours: 0, entries: 0 }
            emp.hours += hours
            emp.entries += 1
            employeeStats.set(entry.employee_name, emp)

            const cli = clientStats.get(clientName) || { hours: 0, entries: 0 }
            cli.hours += hours
            cli.entries += 1
            clientStats.set(clientName, cli)

            return [entry.employee_name, entry.date, Number(hours.toFixed(2)), clientName, entry.task_name]
        })

        const totalHours = entriesCompact.reduce((sum, entry) => sum + entry[2], 0)

        const payload: WeeklyReportPromptPayload = {
            weekLabel: `${startDate} - ${new Date(
                new Date(endDateExclusive).getTime() - 24 * 60 * 60 * 1000
            )
                .toISOString()
                .slice(0, 10)}`,
            startDate,
            endDateExclusive,
            totalEntries: typedEntries.length,
            totalHours: Number(totalHours.toFixed(2)),
            employees: Array.from(employeeStats.keys()).sort(),
            clients: Array.from(clientStats.keys()).sort(),
            employeeHours: Array.from(employeeStats.entries())
                .map(([employee_name, v]) => ({
                    employee_name,
                    total_hours: Number(v.hours.toFixed(2)),
                    entries_count: v.entries,
                }))
                .sort((a, b) => b.total_hours - a.total_hours),
            clientHours: Array.from(clientStats.entries())
                .map(([client_name, v]) => ({
                    client_name,
                    total_hours: Number(v.hours.toFixed(2)),
                    entries_count: v.entries,
                }))
                .sort((a, b) => b.total_hours - a.total_hours),
            entriesCompact,
        }

        const userPrompt = buildWeeklyReportUserPrompt(payload)
        const claudeResult = await callClaude(WEEKLY_REPORT_SYSTEM_PROMPT, userPrompt)
        const reportHtml = buildWeeklyReportHtml({
            reportMarkdown: claudeResult.reportText,
            payload,
            generatedAtIso: new Date().toISOString(),
        })
        await supabase.from('weekly_reports').insert({
            week_start: startDate,
            week_end_exclusive: endDateExclusive,
            week_label: payload.weekLabel,
            report_markdown: claudeResult.reportText,
            report_html: reportHtml,
            model: claudeResult.model,
            meta: {
                startDate,
                endDateExclusive,
                totalEntries: payload.totalEntries,
                totalHours: payload.totalHours,
                model: claudeResult.model,
                usage: claudeResult.usage,
            },
        })

        return NextResponse.json({
            success: true,
            report: claudeResult.reportText,
            reportHtml,
            reportFileName: `informe-semanal-${startDate}.html`,
            meta: {
                startDate,
                endDateExclusive,
                totalEntries: payload.totalEntries,
                totalHours: payload.totalHours,
                model: claudeResult.model,
                usage: claudeResult.usage,
            },
        })
    } catch (err) {
        console.error('Weekly report error:', err)
        return NextResponse.json(
            {
                error: 'Error generando el informe semanal',
                details: err instanceof Error ? err.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export async function GET() {
    const supabase = createServerClient()
    try {
        const { data, error } = await supabase
            .from('weekly_reports')
            .select('id, week_start, week_end_exclusive, week_label, report_markdown, report_html, model, meta, created_at')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            return NextResponse.json({ error: 'No se pudo cargar el histórico de informes' }, { status: 500 })
        }

        const reports = ((data || []) as WeeklyReportRow[]).map((row) => ({
            id: row.id,
            weekLabel: row.week_label,
            report: row.report_markdown,
            reportHtml: row.report_html,
            reportFileName: `informe-semanal-${row.week_start}.html`,
            model: row.model,
            createdAt: row.created_at,
            meta: row.meta || {},
        }))

        return NextResponse.json({ success: true, reports })
    } catch (err) {
        return NextResponse.json(
            {
                error: 'Error cargando histórico de informes',
                details: err instanceof Error ? err.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
