'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { getMonthName } from '@/lib/utils'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ImportStats {
    batchId: string
    totalRows: number
    validEntries: number
    processedEntries: number
    insertedEntries: number
    replacedEntries: number
    unmappedClients: string[]
    dateRange: { start: string; end: string }
    month: number
    year: number
}

interface ImportHistory {
    id: string // composite key month-year
    month: number
    year: number
    importDate: string
    entriesCount: number
}

export default function ImportPage() {
    const [dragActive, setDragActive] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<ImportStats | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [unmappedClients, setUnmappedClients] = useState<string[]>([])
    const [creatingClients, setCreatingClients] = useState(false)
    const [history, setHistory] = useState<ImportHistory[]>([])
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        loadImportHistory()
    }, [])

    async function loadImportHistory() {
        // Get grouped data by month/year
        const { data, error } = await supabase
            .from('time_entries')
            .select('date, created_at')
            .order('date', { ascending: false })

        if (error) {
            console.error('Error loading history:', error)
            return
        }

        if (!data || data.length === 0) {
            setHistory([])
            return
        }

        // Group by month/year
        const grouped = new Map<string, { count: number; latestImport: string }>()

        data.forEach(entry => {
            const date = new Date(entry.date)
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`

            if (!grouped.has(key)) {
                grouped.set(key, { count: 0, latestImport: entry.created_at })
            }

            const group = grouped.get(key)!
            group.count++

            if (entry.created_at > group.latestImport) {
                group.latestImport = entry.created_at
            }
        })

        // Convert to array
        const historyArray: ImportHistory[] = Array.from(grouped.entries()).map(([key, value]) => {
            const [year, month] = key.split('-').map(Number)
            return {
                id: key,
                month,
                year,
                importDate: value.latestImport,
                entriesCount: value.count,
            }
        })

        // Sort by year/month desc
        historyArray.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year
            return b.month - a.month
        })

        setHistory(historyArray)
    }

    async function handleFile(file: File) {
        setUploading(true)
        setError(null)
        setResult(null)
        setUnmappedClients([])

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                // If it's a "No entries could be mapped" error, capture the list
                if (data.unmappedClients && data.unmappedClients.length > 0) {
                    setUnmappedClients(data.unmappedClients)
                    // Don't show generic error text if we have this specific case
                    // or keep it but minimal
                }
                setError(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''))

                toast.error('Error al importar archivo')
            } else {
                setResult(data.stats)
                if (data.stats.unmappedClients.length > 0) {
                    setUnmappedClients(data.stats.unmappedClients)
                }
                toast.success(`Importados ${data.stats.insertedEntries} registros correctamente`)
                loadImportHistory() // Refresh history
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            setError('Error al procesar el archivo: ' + message)
            toast.error('Error: ' + message)
        } finally {
            setUploading(false)
        }
    }

    async function handleCreateMissingClients() {
        if (unmappedClients.length === 0) return

        setCreatingClients(true)
        try {
            const response = await fetch('/api/clients/batch-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clients: unmappedClients })
            })

            if (!response.ok) throw new Error('Error creating clients')

            const data = await response.json()
            toast.success(`Creados ${data.count} clientes nuevos. ¡Vuelve a subir el CSV!`)
            setUnmappedClients([]) // Clear list
            setError(null) // Clear error

        } catch (error) {
            console.error('Error creating clients:', error)
            toast.error('Error al crear clientes')
        } finally {
            setCreatingClients(false)
        }
    }

    async function handleDelete(month: number, year: number) {
        try {
            const response = await fetch(`/api/import/delete?month=${month}&year=${year}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Error deleting entries')
            }

            const data = await response.json()
            toast.success(`Eliminados ${data.count} registros de ${getMonthName(month)} ${year}`)
            setDeletingId(null)
            loadImportHistory()
        } catch (error) {
            console.error('Error deleting:', error)
            toast.error('Error al eliminar los registros')
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragActive(false)

        const file = e.dataTransfer.files[0]
        if (file && file.name.endsWith('.csv')) {
            handleFile(file)
        } else {
            setError('Por favor sube un archivo CSV válido')
            toast.error('Archivo no válido')
        }
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Importar CSV de ClickUp</h1>
                    <p className="text-gray-600 mt-1">
                        Carga tus registros de tiempo mensuales
                    </p>
                </div>

                {/* Upload Area */}
                <div
                    className={`bg-white rounded-xl border-2 border-dashed p-12 text-center transition-all ${dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    onDragEnter={() => setDragActive(true)}
                    onDragLeave={() => setDragActive(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <div className="text-6xl mb-4">{uploading ? '⏳' : '📤'}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {uploading ? 'Procesando CSV...' : 'Arrastra tu CSV aquí'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {uploading ? 'Esto puede tardar unos segundos' : 'o haz clic para seleccionar un archivo'}
                    </p>
                    {!uploading && (
                        <>
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                id="csv-upload"
                                onChange={handleFileSelect}
                            />
                            <label
                                htmlFor="csv-upload"
                                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                            >
                                Seleccionar archivo CSV
                            </label>
                        </>
                    )}
                    <p className="text-sm text-gray-500 mt-4">
                        Archivos soportados: .csv (exportado desde ClickUp)
                    </p>
                </div>

                {/* Success Result */}
                {result && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-green-900 mb-4">✅ Importación exitosa</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-green-800"><strong>Periodo:</strong> {getMonthName(result.month)} {result.year}</p>
                                <p className="text-sm text-green-800"><strong>Rango:</strong> {result.dateRange.start} → {result.dateRange.end}</p>
                                <p className="text-sm text-green-800"><strong>Filas CSV:</strong> {result.totalRows}</p>
                            </div>
                            <div>
                                <p className="text-sm text-green-800"><strong>Entradas válidas:</strong> {result.validEntries}</p>
                                <p className="text-sm text-green-800"><strong>Entradas procesadas:</strong> {result.processedEntries}</p>
                                <p className="text-sm text-green-800"><strong>Insertadas:</strong> {result.insertedEntries}</p>
                                {result.replacedEntries > 0 && (
                                    <p className="text-sm text-green-800"><strong>Reemplazadas:</strong> {result.replacedEntries}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <Button onClick={() => window.location.href = '/dashboard'}>
                                📊 Ver Dashboard
                            </Button>
                        </div>
                    </div>
                )}

                {/* Error & Unmapped Clients Logic */}
                {((error && unmappedClients && unmappedClients.length > 0) || (result?.unmappedClients && result.unmappedClients.length > 0)) && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-yellow-900 mb-2">⚠️ Clientes no encontrados</h3>
                        <p className="text-sm text-yellow-800 mb-4">
                            Los siguientes clientes del CSV no existen en la base de datos:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(unmappedClients.length > 0 ? unmappedClients : result?.unmappedClients || []).map(client => (
                                <span key={client} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-mono text-xs">
                                    {client}
                                </span>
                            ))}
                        </div>

                        {unmappedClients.length > 0 && (
                            <Button
                                onClick={handleCreateMissingClients}
                                disabled={creatingClients}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white border-none"
                            >
                                {creatingClients ? 'Creando clientes...' : `✨ Crear ${unmappedClients.length} clientes automáticamente`}
                            </Button>
                        )}

                        {/* Remove redundant warning from result block if we show it here */}
                    </div>
                )}

                {/* Generic Error */}
                {error && !error.includes('Clientes no mapeados') && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-red-900 mb-2">❌ Error</h3>
                        <p className="text-sm text-red-800 whitespace-pre-wrap">{error}</p>
                    </div>
                )}

                {/* Import History */}
                {history.length > 0 && (
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">📅 Histórico de Importaciones</h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {history.map((h) => (
                                <div key={h.id} className="p-4 border rounded-lg hover:bg-gray-50 flex flex-col justify-between h-full bg-white transition-all hover:shadow-md">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-gray-900">
                                                {getMonthName(h.month)} {h.year}
                                            </h4>
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                                {h.entriesCount} regs
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 mb-4">
                                            Última importación: {new Date(h.importDate).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 mt-auto pt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                                            onClick={() => window.location.href = `/import/history/${h.year}/${h.month}`}
                                        >
                                            👁️ Ver datos
                                        </Button>

                                        <AlertDialog open={deletingId === h.id} onOpenChange={(open) => setDeletingId(open ? h.id : null)}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                                    🗑️ Borrar
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar datos de {getMonthName(h.month)} {h.year}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Estás a punto de eliminar <strong>{h.entriesCount} registros</strong>.
                                                        Esta acción no se puede deshacer. Tendrás que volver a importar el CSV si quieres recuperarlos.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(h.month, h.year)}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        Eliminar definitivamente
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        📋 Cómo exportar desde ClickUp
                    </h3>
                    <ol className="space-y-3 text-gray-700">
                        <li className="flex items-start">
                            <span className="font-bold text-blue-600 mr-3">1.</span>
                            <span>Ve a <strong>Time Tracking</strong> en ClickUp</span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold text-blue-600 mr-3">2.</span>
                            <span>Selecciona el rango de fechas del mes que quieres analizar</span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold text-blue-600 mr-3">3.</span>
                            <span>Haz clic en <strong>Export</strong> → <strong>CSV</strong></span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold text-blue-600 mr-3">4.</span>
                            <span>Sube el archivo descargado aquí</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    )
}
