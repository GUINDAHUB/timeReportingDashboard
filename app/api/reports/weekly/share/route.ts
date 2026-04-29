import { NextResponse } from 'next/server'

interface ShareWeeklyReportBody {
    reportHtml?: string
    reportMarkdown?: string
    reportFileName?: string
    weekLabel?: string
    meta?: {
        startDate?: string
        endDateExclusive?: string
        totalEntries?: number
        totalHours?: number
        model?: string
    }
}

export async function POST(request: Request) {
    try {
        const webhookUrl = process.env.N8N_WEEKLY_REPORT_WEBHOOK_URL
        if (!webhookUrl) {
            return NextResponse.json(
                { error: 'Falta configurar N8N_WEEKLY_REPORT_WEBHOOK_URL en el entorno' },
                { status: 500 }
            )
        }

        const body = (await request.json()) as ShareWeeklyReportBody
        if (!body?.reportHtml) {
            return NextResponse.json({ error: 'No hay HTML de informe para enviar' }, { status: 400 })
        }

        const reportFileName = body.reportFileName || 'informe-semanal.html'
        const htmlBase64 = Buffer.from(body.reportHtml, 'utf8').toString('base64')

        const webhookPayload = {
            event: 'weekly_report_ready',
            source: 'timeReportingDashboard',
            sentAt: new Date().toISOString(),
            weekLabel: body.weekLabel || body.meta?.startDate || 'Semana sin etiqueta',
            subject: `Informe semanal ${body.weekLabel || body.meta?.startDate || ''}`.trim(),
            report: {
                markdown: body.reportMarkdown || '',
                html: body.reportHtml,
                fileName: reportFileName,
                attachment: {
                    fileName: reportFileName,
                    contentType: 'text/html',
                    contentBase64: htmlBase64,
                },
            },
            meta: body.meta || {},
            audience: 'socios',
        }

        const sendToWebhook = (url: string) =>
            fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(webhookPayload),
            })

        let response = await sendToWebhook(webhookUrl)
        let targetUrl = webhookUrl

        // Si se configuró endpoint de test y no hay listener activo, reintentar en endpoint productivo.
        if (!response.ok && response.status === 404 && webhookUrl.includes('/webhook-test/')) {
            targetUrl = webhookUrl.replace('/webhook-test/', '/webhook/')
            response = await sendToWebhook(targetUrl)
        }

        if (!response.ok) {
            const errorBody = await response.text()
            return NextResponse.json(
                {
                    error: `Error llamando al webhook de n8n (${response.status})`,
                    details: errorBody,
                    webhookUrlTried: targetUrl,
                },
                { status: 502 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json(
            {
                error: 'No se pudo enviar el informe al webhook',
                details: err instanceof Error ? err.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
