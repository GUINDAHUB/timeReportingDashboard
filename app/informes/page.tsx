'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, Send, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { WeekSelector } from '@/components/informes/week-selector'

interface WeeklyReportMeta {
    startDate: string
    endDateExclusive: string
    totalEntries: number
    totalHours: number
    model?: string
    usage?: {
        input_tokens?: number
        output_tokens?: number
    }
}

interface SavedWeeklyReport {
    id: string
    weekLabel: string
    report: string
    reportHtml: string
    reportFileName: string
    model?: string
    createdAt: string
    meta?: WeeklyReportMeta
}

function getDefaultPreviousWeekStart(): string {
    const today = new Date()
    const utcNow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const day = utcNow.getUTCDay()
    const daysSinceMonday = (day + 6) % 7
    utcNow.setUTCDate(utcNow.getUTCDate() - daysSinceMonday - 7)
    return utcNow.toISOString().slice(0, 10)
}

function mondayOfWeekISO(dateISO: string): string {
    const [y, m, d] = dateISO.split('-').map(Number)
    const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
    const day = date.getUTCDay()
    const daysSinceMonday = (day + 6) % 7
    date.setUTCDate(date.getUTCDate() - daysSinceMonday)
    return date.toISOString().slice(0, 10)
}

export default function InformesPage() {
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState('')
    const [reportHtml, setReportHtml] = useState('')
    const [reportFileName, setReportFileName] = useState('informe-semanal.html')
    const [meta, setMeta] = useState<WeeklyReportMeta | null>(null)
    const [error, setError] = useState('')
    const [sendingToPartners, setSendingToPartners] = useState(false)
    const [shareMessage, setShareMessage] = useState('')
    const [savedReports, setSavedReports] = useState<SavedWeeklyReport[]>([])
    const [loadingSavedReports, setLoadingSavedReports] = useState(false)
    const [weekStart, setWeekStart] = useState<string | null>(null)
    const [latestDataDate, setLatestDataDate] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const weekLabel = useMemo(() => {
        if (!meta) return ''
        return `${meta.startDate} - ${new Date(
            new Date(meta.endDateExclusive).getTime() - 24 * 60 * 60 * 1000
        )
            .toISOString()
            .slice(0, 10)}`
    }, [meta])

    useEffect(() => {
        let cancelled = false
        async function loadSavedReports() {
            setLoadingSavedReports(true)
            try {
                const response = await fetch('/api/reports/weekly')
                const data = await response.json()
                if (!cancelled && response.ok && data?.success) {
                    setSavedReports(data.reports || [])
                    if (data.latestDataDate) {
                        setLatestDataDate(data.latestDataDate)
                    }
                    setWeekStart((current) => {
                        if (current) return current
                        if (data.latestDataDate) return mondayOfWeekISO(data.latestDataDate)
                        return getDefaultPreviousWeekStart()
                    })
                }
            } finally {
                if (!cancelled) setLoadingSavedReports(false)
            }
        }
        loadSavedReports()
        return () => {
            cancelled = true
        }
    }, [])

    async function handleGenerateReport() {
        if (!weekStart) return
        setLoading(true)
        setError('')
        setShareMessage('')

        try {
            const response = await fetch('/api/reports/weekly', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ startDate: weekStart }),
            })

            const data = await response.json()

            if (!response.ok || !data?.success) {
                throw new Error(data?.error || 'No se pudo generar el informe')
            }

            setReport(data.report || '')
            setReportHtml(data.reportHtml || '')
            setReportFileName(data.reportFileName || 'informe-semanal.html')
            setMeta(data.meta || null)
            if (data.report && data.reportHtml) {
                setSavedReports((prev) => [
                    {
                        id: crypto.randomUUID(),
                        weekLabel: data.meta?.startDate
                            ? `${data.meta.startDate} - ${new Date(
                                  new Date(data.meta.endDateExclusive).getTime() - 24 * 60 * 60 * 1000
                              )
                                  .toISOString()
                                  .slice(0, 10)}`
                            : 'Semana actual',
                        report: data.report,
                        reportHtml: data.reportHtml,
                        reportFileName: data.reportFileName || 'informe-semanal.html',
                        model: data.meta?.model,
                        createdAt: new Date().toISOString(),
                        meta: data.meta || undefined,
                    },
                    ...prev,
                ])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido')
        } finally {
            setLoading(false)
        }
    }

    function handleDownloadHtml() {
        if (!reportHtml) return

        const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = reportFileName
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
    }

    async function handleSendToPartners() {
        if (!reportHtml) return
        setSendingToPartners(true)
        setShareMessage('')

        try {
            const response = await fetch('/api/reports/weekly/share', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    reportHtml,
                    reportMarkdown: report,
                    reportFileName,
                    weekLabel,
                    meta,
                }),
            })
            const data = await response.json()
            if (!response.ok || !data?.success) {
                throw new Error(data?.error || 'No se pudo enviar el informe al webhook')
            }
            setShareMessage('Informe enviado al webhook de socios correctamente.')
        } catch (err) {
            setShareMessage(err instanceof Error ? err.message : 'Error enviando informe al webhook')
        } finally {
            setSendingToPartners(false)
        }
    }

    function handleLoadSavedReport(savedReport: SavedWeeklyReport) {
        setReport(savedReport.report)
        setReportHtml(savedReport.reportHtml)
        setReportFileName(savedReport.reportFileName || 'informe-semanal.html')
        setMeta(savedReport.meta || null)
        setError('')
        setShareMessage('Informe guardado cargado correctamente.')
    }

    async function handleDeleteSavedReport(savedReport: SavedWeeklyReport) {
        const confirmed = window.confirm(
            `¿Eliminar el informe de la semana "${savedReport.weekLabel}"? Esta acción no se puede deshacer.`
        )
        if (!confirmed) return

        setDeletingId(savedReport.id)
        setError('')
        setShareMessage('')

        try {
            const response = await fetch(
                `/api/reports/weekly?id=${encodeURIComponent(savedReport.id)}`,
                { method: 'DELETE' }
            )
            const data = await response.json().catch(() => null)
            if (!response.ok || !data?.success) {
                throw new Error(data?.error || 'No se pudo eliminar el informe')
            }
            setSavedReports((prev) => prev.filter((r) => r.id !== savedReport.id))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error eliminando el informe')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Informes</h1>
                        <p className="text-gray-600 mt-1">
                            Genera un informe automático de la semana seleccionada con Claude.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {weekStart ? (
                            <WeekSelector
                                weekStart={weekStart}
                                onWeekChange={setWeekStart}
                                latestDataDate={latestDataDate}
                            />
                        ) : (
                            <div className="text-sm text-gray-500 px-4 py-2 bg-white border rounded-lg shadow-sm">
                                Cargando semana...
                            </div>
                        )}
                        <Button onClick={handleGenerateReport} disabled={loading || !weekStart}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {loading ? 'Generando informe...' : 'Generar informe semanal'}
                        </Button>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    Se envían entradas de tiempo compactadas de la semana seleccionada (sin categoría), junto con
                    empleados y clientes, para reducir tokens y delegar la categorización al LLM.
                    {latestDataDate && (
                        <span className="block mt-1 text-blue-800/80">
                            Último dato disponible en tu base: <strong>{latestDataDate}</strong>.
                        </span>
                    )}
                </div>

                <div className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-gray-900">Informes guardados</h2>
                        {loadingSavedReports && <p className="text-sm text-gray-500">Cargando...</p>}
                    </div>
                    {savedReports.length === 0 ? (
                        <p className="text-sm text-gray-600">
                            Aun no hay informes guardados. Al generar uno, se guardara automaticamente.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {savedReports.slice(0, 8).map((savedReport) => (
                                <div
                                    key={savedReport.id}
                                    className="border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{savedReport.weekLabel}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(savedReport.createdAt).toLocaleString('es-ES')}
                                            {savedReport.model ? ` · ${savedReport.model}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => handleLoadSavedReport(savedReport)}>
                                            Cargar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDeleteSavedReport(savedReport)}
                                            disabled={deletingId === savedReport.id}
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                            title="Eliminar informe"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            {deletingId === savedReport.id ? 'Eliminando...' : 'Eliminar'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-start gap-3">
                        <TriangleAlert className="w-5 h-5 mt-0.5" />
                        <div>
                            <p className="font-semibold">No se pudo generar el informe</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {meta && (
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="bg-white border rounded-lg p-4">
                            <p className="text-xs text-gray-500">Semana analizada</p>
                            <p className="font-semibold text-gray-900">{weekLabel}</p>
                        </div>
                        <div className="bg-white border rounded-lg p-4">
                            <p className="text-xs text-gray-500">Entradas</p>
                            <p className="font-semibold text-gray-900">{meta.totalEntries}</p>
                        </div>
                        <div className="bg-white border rounded-lg p-4">
                            <p className="text-xs text-gray-500">Horas</p>
                            <p className="font-semibold text-gray-900">{meta.totalHours.toFixed(2)}h</p>
                        </div>
                        <div className="bg-white border rounded-lg p-4">
                            <p className="text-xs text-gray-500">Modelo</p>
                            <p className="font-semibold text-gray-900">{meta.model || 'Claude'}</p>
                        </div>
                    </div>
                )}

                {report ? (
                    <div className="bg-white border rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h2 className="text-xl font-semibold text-gray-900">Resultado del informe</h2>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button onClick={handleDownloadHtml} disabled={!reportHtml} variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Descargar HTML interactivo
                                </Button>
                                <Button
                                    onClick={handleSendToPartners}
                                    disabled={!reportHtml || sendingToPartners}
                                    className="bg-[#E40046] hover:bg-[#8D1737] text-white"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {sendingToPartners ? 'Enviando a socios...' : 'Enviar a socios'}
                                </Button>
                            </div>
                        </div>
                        {shareMessage && (
                            <div className="mb-4 rounded-lg border border-pink-200 bg-pink-50 p-3 text-sm text-[#8D1737]">
                                {shareMessage}
                            </div>
                        )}
                        <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-800 font-sans">
                            {report}
                        </pre>
                        {reportHtml && (
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Vista previa del HTML</h3>
                                <iframe
                                    title="Vista previa del informe HTML"
                                    srcDoc={reportHtml}
                                    className="w-full h-[720px] border rounded-xl"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed rounded-xl p-10 text-center text-gray-600">
                        Pulsa <span className="font-medium">"Generar informe semanal"</span> para crear el informe.
                    </div>
                )}
            </div>
        </div>
    )
}
