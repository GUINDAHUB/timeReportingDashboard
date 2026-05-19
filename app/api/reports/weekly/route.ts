import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
    WEEKLY_REPORT_SYSTEM_PROMPT,
    buildWeeklyReportUserPrompt,
    parseWeeklyReportNarrative,
    narrativeToMarkdown,
    WeeklyReportNarrative,
} from '@/lib/reports/weekly-report-prompt'
import { buildWeeklyReportHtml } from '@/lib/reports/weekly-report-html'
import { computeWeeklyReportData, RawTimeEntry, WeeklyReportData } from '@/lib/reports/weekly-report-data'

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

function isValidISODate(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

function weekRangeFromStart(startDate: string) {
    const start = new Date(`${startDate}T00:00:00Z`)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)
    return {
        startDate,
        endDateExclusive: end.toISOString().slice(0, 10),
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

export async function POST(request: Request) {
    const supabase = createServerClient()

    try {
        let requestedStartDate: string | null = null
        try {
            const contentType = request.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                const body = await request.json().catch(() => null)
                if (body && isValidISODate(body.startDate)) {
                    requestedStartDate = body.startDate
                }
            }
        } catch {
            // ignoramos cuerpo inválido y caemos al rango por defecto
        }

        const { startDate, endDateExclusive } = requestedStartDate
            ? weekRangeFromStart(requestedStartDate)
            : getPreviousWeekRange()

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
        const weekLabel = `${startDate} - ${new Date(
            new Date(endDateExclusive).getTime() - 24 * 60 * 60 * 1000
        )
            .toISOString()
            .slice(0, 10)}`

        const rawEntries: RawTimeEntry[] = typedEntries.map((entry) => ({
            id: entry.id,
            task_name: entry.task_name,
            duration_hours: toNumber(entry.duration_hours),
            date: entry.date,
            employee_name: entry.employee_name,
            client_name: getClientName(entry),
        }))

        const reportData: WeeklyReportData = computeWeeklyReportData({
            entries: rawEntries,
            startDate,
            endDateExclusive,
            weekLabel,
        })

        if (reportData.totalEntries === 0) {
            const emptyNarrative: WeeklyReportNarrative = {
                highlights: ['No hay entradas registradas en este rango.'],
                clientObservations: ['Sin datos de clientes en esta semana.'],
                employeeObservations: ['Sin datos de empleados en esta semana.'],
                doubtfulAnalysis: ['Sin entradas que revisar en este rango.'],
            }
            const emptyHtml = buildWeeklyReportHtml({
                data: reportData,
                narrative: emptyNarrative,
                generatedAtIso: new Date().toISOString(),
                modelName: null,
            })
            const emptyMarkdown = narrativeToMarkdown(emptyNarrative, reportData)
            await supabase.from('weekly_reports').insert({
                week_start: startDate,
                week_end_exclusive: endDateExclusive,
                week_label: weekLabel,
                report_markdown: emptyMarkdown,
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
                report: emptyMarkdown,
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

        const userPrompt = buildWeeklyReportUserPrompt(reportData)
        const claudeResult = await callClaude(WEEKLY_REPORT_SYSTEM_PROMPT, userPrompt)
        const narrative = parseWeeklyReportNarrative(claudeResult.reportText)
        const reportHtml = buildWeeklyReportHtml({
            data: reportData,
            narrative,
            generatedAtIso: new Date().toISOString(),
            modelName: claudeResult.model,
        })
        const reportMarkdown = narrativeToMarkdown(narrative, reportData)
        await supabase.from('weekly_reports').insert({
            week_start: startDate,
            week_end_exclusive: endDateExclusive,
            week_label: weekLabel,
            report_markdown: reportMarkdown,
            report_html: reportHtml,
            model: claudeResult.model,
            meta: {
                startDate,
                endDateExclusive,
                totalEntries: reportData.totalEntries,
                totalHours: reportData.totalHours,
                distinctEmployees: reportData.distinctEmployees,
                distinctClients: reportData.distinctClients,
                longEntries: reportData.longEntries.length,
                sharedTasks: reportData.sharedTasks.length,
                model: claudeResult.model,
                usage: claudeResult.usage,
            },
        })

        return NextResponse.json({
            success: true,
            report: reportMarkdown,
            reportHtml,
            reportFileName: `informe-semanal-${startDate}.html`,
            meta: {
                startDate,
                endDateExclusive,
                totalEntries: reportData.totalEntries,
                totalHours: reportData.totalHours,
                distinctEmployees: reportData.distinctEmployees,
                distinctClients: reportData.distinctClients,
                longEntries: reportData.longEntries.length,
                sharedTasks: reportData.sharedTasks.length,
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

        const { data: latest } = await supabase
            .from('time_entries')
            .select('date')
            .order('date', { ascending: false })
            .limit(1)
        const latestDataDate = latest?.[0]?.date || null

        return NextResponse.json({ success: true, reports, latestDataDate })
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

export async function DELETE(request: Request) {
    const supabase = createServerClient()
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 })
        }

        const { error, count } = await supabase
            .from('weekly_reports')
            .delete({ count: 'exact' })
            .eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!count) {
            return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json(
            {
                error: 'Error eliminando el informe',
                details: err instanceof Error ? err.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
