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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { TaskClassifier } from '@/components/import/task-classifier'

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
    id: string // batch_id
    batchId: string
    importDate: string
    entriesCount: number
    employeeName: string | null
    month: number
    year: number
    dateRange: { start: string; end: string }
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
    const [distributionMethod, setDistributionMethod] = useState<'revenue' | 'workload'>('revenue')
    const [savingDistribution, setSavingDistribution] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileType, setFileType] = useState<'csv' | 'ics' | null>(null)
    const [employeeName, setEmployeeName] = useState('')
    const [filterMonth, setFilterMonth] = useState<number>(1) // Default to January
    const [filterYear, setFilterYear] = useState<number>(2026)
    const [classifyingEntries, setClassifyingEntries] = useState<any[]>([])
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
    const [showClassifier, setShowClassifier] = useState(false)
    const [employees, setEmployees] = useState<string[]>([])
    const [loadingEmployees, setLoadingEmployees] = useState(false)

    useEffect(() => {
        loadImportHistory()
        loadDistributionMethod()
        loadClients()
        loadEmployees()
    }, [])

    async function loadClients() {
        const { data, error } = await supabase
            .from('clients')
            .select('id, name')
            .eq('is_active', true)
            .order('name')

        if (error) {
            console.error('Error loading clients:', error)
            return
        }

        setClients(data || [])
    }

    async function loadEmployees() {
        setLoadingEmployees(true)
        try {
            // Get unique employee names from time_entries
            const { data, error } = await supabase
                .from('time_entries')
                .select('employee_name')

            if (error) {
                console.error('Error loading employees:', error)
                return
            }

            if (!data || data.length === 0) {
                setEmployees([])
                return
            }

            // Extract unique employee names and sort
            const uniqueEmployees = Array.from(new Set(data.map(e => e.employee_name)))
                .filter(name => name && name.trim() !== '')
                .sort()

            setEmployees(uniqueEmployees)
        } finally {
            setLoadingEmployees(false)
        }
    }

    async function loadDistributionMethod() {
        // Get any operational cost settings to read distribution method
        // We get the most recent one since they all should have the same method
        const { data, error } = await supabase
            .from('monthly_operational_costs')
            .select('distribution_method')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (data && data.distribution_method) {
            setDistributionMethod(data.distribution_method as 'revenue' | 'workload')
        }
    }

    async function handleSaveDistributionMethod() {
        setSavingDistribution(true)
        try {
            // Update all existing operational costs to use the new distribution method
            const { data: existingCosts, error: fetchError } = await supabase
                .from('monthly_operational_costs')
                .select('id, month, year, amount, notes')

            if (fetchError) throw fetchError

            if (existingCosts && existingCosts.length > 0) {
                // Update each record with the new distribution method
                for (const cost of existingCosts) {
                    const response = await fetch('/api/operational-costs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            month: cost.month,
                            year: cost.year,
                            amount: cost.amount,
                            notes: cost.notes,
                            distribution_method: distributionMethod
                        })
                    })

                    if (!response.ok) throw new Error('Error updating distribution method')
                }

                toast.success(`Método de reparto actualizado a "${distributionMethod === 'revenue' ? 'Facturación' : 'Carga de Trabajo'}"`)
                
                // Recargar el método de distribución para confirmar el cambio
                await loadDistributionMethod()
            } else {
                toast.info('No hay costes operativos configurados todavía')
            }
        } catch (error) {
            console.error('Error saving distribution method:', error)
            toast.error('Error al guardar el método de reparto')
        } finally {
            setSavingDistribution(false)
        }
    }

    async function loadImportHistory() {
        // Get grouped data by import_batch_id
        const { data, error } = await supabase
            .from('time_entries')
            .select('import_batch_id, date, created_at, employee_name')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error loading history:', error)
            return
        }

        if (!data || data.length === 0) {
            setHistory([])
            return
        }

        // Group by import_batch_id
        const grouped = new Map<string, {
            count: number
            importDate: string
            dates: string[]
            employees: Set<string>
        }>()

        data.forEach(entry => {
            const batchId = entry.import_batch_id

            if (!grouped.has(batchId)) {
                grouped.set(batchId, {
                    count: 0,
                    importDate: entry.created_at,
                    dates: [],
                    employees: new Set()
                })
            }

            const group = grouped.get(batchId)!
            group.count++
            group.dates.push(entry.date)
            if (entry.employee_name) {
                group.employees.add(entry.employee_name)
            }
        })

        // Convert to array
        const historyArray: ImportHistory[] = Array.from(grouped.entries()).map(([batchId, value]) => {
            // Sort dates to get range
            const sortedDates = value.dates.sort()
            const startDate = sortedDates[0]
            const endDate = sortedDates[sortedDates.length - 1]
            
            // Get month/year from start date
            const date = new Date(startDate)
            const month = date.getMonth() + 1
            const year = date.getFullYear()

            // Get employee name (for ICS imports, single employee; for CSV, might be multiple)
            const employeeName = value.employees.size === 1 
                ? Array.from(value.employees)[0] 
                : value.employees.size > 1 
                    ? `${value.employees.size} empleados`
                    : null

            return {
                id: batchId,
                batchId,
                importDate: value.importDate,
                entriesCount: value.count,
                employeeName,
                month,
                year,
                dateRange: { start: startDate, end: endDate }
            }
        })

        // Sort by import date desc
        historyArray.sort((a, b) => 
            new Date(b.importDate).getTime() - new Date(a.importDate).getTime()
        )

        setHistory(historyArray)
    }

    function handleFileSelection(file: File) {
        const fileName = file.name.toLowerCase()
        const isCSV = fileName.endsWith('.csv')
        const isICS = fileName.endsWith('.ics') || fileName.endsWith('.ical')

        if (!isCSV && !isICS) {
            setError('Solo se aceptan archivos .csv o .ics')
            toast.error('Formato no válido')
            return
        }

        setSelectedFile(file)
        setFileType(isCSV ? 'csv' : 'ics')
        setError(null)
        setResult(null)
        setUnmappedClients([])
    }

    async function handleUpload() {
        if (!selectedFile) {
            toast.error('Por favor selecciona un archivo')
            return
        }

        // Validate ICS requirements
        if (fileType === 'ics' && !employeeName.trim()) {
            toast.error('Por favor ingresa el nombre del empleado')
            return
        }

        setUploading(true)
        setError(null)
        setResult(null)
        setUnmappedClients([])

        const formData = new FormData()
        formData.append('file', selectedFile)

        if (fileType === 'ics') {
            formData.append('employeeName', employeeName.trim())
            formData.append('filterMonth', filterMonth.toString())
            formData.append('filterYear', filterYear.toString())
            formData.append('previewMode', 'true') // Request preview for classification
        }

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                if (data.unmappedClients && data.unmappedClients.length > 0) {
                    setUnmappedClients(data.unmappedClients)
                }
                setError(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''))
                toast.error('Error al importar archivo')
                setUploading(false)
                return
            }

            // If it's a preview response (ICS), show classifier
            if (data.preview) {
                setClassifyingEntries(data.entries)
                setShowClassifier(true)
                setUploading(false)
                return
            }

            // Otherwise it's a direct import (CSV)
            setResult(data.stats)
            if (data.stats.unmappedClients.length > 0) {
                setUnmappedClients(data.stats.unmappedClients)
            }
            toast.success(`Importados ${data.stats.insertedEntries} registros correctamente`)
            loadImportHistory()
            
            // Reset form
            setSelectedFile(null)
            setFileType(null)
            setEmployeeName('')
            setUploading(false)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            setError('Error al procesar el archivo: ' + message)
            toast.error('Error: ' + message)
            setUploading(false)
        }
    }

    async function handleConfirmClassification(clientMappings: Record<number, string>) {
        if (!selectedFile) return

        setUploading(true)
        setShowClassifier(false)

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('employeeName', employeeName.trim())
        formData.append('filterMonth', filterMonth.toString())
        formData.append('filterYear', filterYear.toString())
        formData.append('previewMode', 'false')
        formData.append('clientMappings', JSON.stringify(clientMappings))

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''))
                toast.error('Error al guardar las entradas')
                setUploading(false)
                return
            }

            setResult(data.stats)
            toast.success(`Guardadas ${data.stats.insertedEntries} entradas correctamente`)
            loadImportHistory()

            // Reset form
            setSelectedFile(null)
            setFileType(null)
            setEmployeeName('')
            setClassifyingEntries([])
            setUploading(false)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            setError('Error al guardar: ' + message)
            toast.error('Error: ' + message)
            setUploading(false)
        }
    }

    function handleCancelClassification() {
        setShowClassifier(false)
        setClassifyingEntries([])
        setSelectedFile(null)
        setFileType(null)
        toast.info('Importación cancelada')
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

    async function handleDelete(batchId: string) {
        try {
            const response = await fetch(`/api/import/delete?batchId=${batchId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Error deleting entries')
            }

            const data = await response.json()
            toast.success(`Eliminados ${data.count} registros de la importación`)
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
        if (file) {
            handleFileSelection(file)
        }
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelection(file)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Show Classifier Modal */}
            {showClassifier && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                        <div className="p-6 overflow-y-auto max-h-[90vh]">
                            <TaskClassifier
                                entries={classifyingEntries}
                                clients={clients}
                                onConfirm={handleConfirmClassification}
                                onCancel={handleCancelClassification}
                            />
                        </div>
                    </div>
                </div>
            )}

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
                    <div className="text-6xl mb-4">{uploading ? '⏳' : selectedFile ? '✅' : '📤'}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {uploading ? `Procesando ${fileType?.toUpperCase()}...` : selectedFile ? selectedFile.name : 'Arrastra tu archivo aquí'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {uploading ? 'Esto puede tardar unos segundos' : selectedFile ? `Archivo ${fileType?.toUpperCase()} seleccionado` : 'o haz clic para seleccionar un archivo'}
                    </p>
                    {!uploading && !selectedFile && (
                        <>
                            <input
                                type="file"
                                accept=".csv,.ics,.ical"
                                className="hidden"
                                id="file-upload"
                                onChange={handleFileSelect}
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                            >
                                Seleccionar archivo
                            </label>
                        </>
                    )}
                    <p className="text-sm text-gray-500 mt-4">
                        Archivos soportados: .csv (ClickUp) o .ics (Google Calendar)
                    </p>
                </div>

                {/* ICS Configuration (shown when ICS file is selected) */}
                {selectedFile && fileType === 'ics' && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-blue-900 mb-4">📅 Configuración de Google Calendar</h3>
                        
                        <div className="space-y-4">
                            {/* Employee Name */}
                            <div>
                                <label className="block text-sm font-medium text-blue-900 mb-2">
                                    Nombre del Empleado *
                                </label>
                                {loadingEmployees ? (
                                    <div className="w-full px-4 py-2 border border-blue-300 rounded-lg bg-blue-50 text-blue-700">
                                        Cargando empleados...
                                    </div>
                                ) : employees.length > 0 ? (
                                    <Select value={employeeName} onValueChange={setEmployeeName} disabled={uploading}>
                                        <SelectTrigger className="w-full border-blue-300 focus:ring-2 focus:ring-blue-500">
                                            <SelectValue placeholder="Selecciona un empleado..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map((emp) => (
                                                <SelectItem key={emp} value={emp}>
                                                    {emp}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="w-full px-4 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                                        ⚠️ No hay empleados en la base de datos. Importa primero datos desde ClickUp para crear la lista de empleados.
                                    </div>
                                )}
                                <p className="text-xs text-blue-700 mt-1">
                                    Lista de empleados extraída de importaciones anteriores
                                </p>
                            </div>

                            {/* Month/Year Filter */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-900 mb-2">
                                        Mes a importar *
                                    </label>
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={uploading}
                                    >
                                        {[
                                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                                        ].map((month, idx) => (
                                            <option key={idx} value={idx + 1}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-900 mb-2">
                                        Año *
                                    </label>
                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={uploading}
                                    >
                                        {[2024, 2025, 2026, 2027].map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <p className="text-sm text-blue-800 bg-blue-100 p-3 rounded-lg">
                                ℹ️ Solo se importarán los eventos del mes y año seleccionado. Las tareas se asignarán a un cliente "Sin Clasificar" que podrás reasignar después.
                            </p>
                        </div>
                    </div>
                )}

                {/* Upload Button (shown when file is selected) */}
                {selectedFile && !uploading && (
                    <div className="flex gap-3">
                        <Button
                            onClick={handleUpload}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                        >
                            ✅ Importar {fileType?.toUpperCase()}
                        </Button>
                        <Button
                            onClick={() => {
                                setSelectedFile(null)
                                setFileType(null)
                                setEmployeeName('')
                            }}
                            variant="outline"
                            className="px-6 text-red-600 border-red-300 hover:bg-red-50"
                        >
                            ❌ Cancelar
                        </Button>
                    </div>
                )}

                {/* Distribution Method Selector */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-purple-900 mb-2">⚙️ Método de Reparto de Costes Operativos</h3>
                            <p className="text-sm text-purple-800 mb-4">
                                Los costes operativos de la empresa se distribuyen entre los clientes según el método seleccionado:
                            </p>
                            
                            <div className="space-y-3">
                                <label className="flex items-start p-3 bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-md"
                                    style={{
                                        borderColor: distributionMethod === 'revenue' ? '#7c3aed' : '#e5e7eb'
                                    }}>
                                    <input
                                        type="radio"
                                        name="distribution"
                                        value="revenue"
                                        checked={distributionMethod === 'revenue'}
                                        onChange={(e) => setDistributionMethod(e.target.value as 'revenue')}
                                        className="mt-1 mr-3 w-4 h-4 text-purple-600"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-900">💰 Reparto por Volumen de Facturación</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Los costes se distribuyen proporcionalmente según la facturación de cada cliente. 
                                            El cliente que más factura, asume mayor parte de los gastos fijos.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-start p-3 bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-md"
                                    style={{
                                        borderColor: distributionMethod === 'workload' ? '#7c3aed' : '#e5e7eb'
                                    }}>
                                    <input
                                        type="radio"
                                        name="distribution"
                                        value="workload"
                                        checked={distributionMethod === 'workload'}
                                        onChange={(e) => setDistributionMethod(e.target.value as 'workload')}
                                        className="mt-1 mr-3 w-4 h-4 text-purple-600"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-900">⏱️ Reparto por Carga de Trabajo</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Los costes se distribuyen proporcionalmente según las horas trabajadas en cada cliente.
                                            El cliente que consume más tiempo del equipo, asume mayor parte de los gastos fijos.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <Button 
                            onClick={handleSaveDistributionMethod}
                            disabled={savingDistribution}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {savingDistribution ? 'Guardando...' : '💾 Guardar Método de Reparto'}
                        </Button>
                        <p className="text-xs text-purple-700">
                            Este cambio afecta a todos los meses con costes operativos configurados
                        </p>
                    </div>
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
                        <p className="text-sm text-gray-600 mb-4">
                            Cada importación se puede borrar individualmente sin afectar a las demás
                        </p>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {history.map((h) => (
                                <div key={h.id} className="p-4 border-2 rounded-lg hover:bg-gray-50 flex flex-col justify-between h-full bg-white transition-all hover:shadow-md">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-900">
                                                    {getMonthName(h.month)} {h.year}
                                                </h4>
                                                {h.employeeName && (
                                                    <p className="text-sm text-purple-700 font-medium mt-1">
                                                        👤 {h.employeeName}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                                {h.entriesCount} regs
                                            </span>
                                        </div>
                                        <div className="space-y-1 mt-3">
                                            <p className="text-xs text-gray-600">
                                                📅 {h.dateRange.start === h.dateRange.end 
                                                    ? h.dateRange.start 
                                                    : `${h.dateRange.start} → ${h.dateRange.end}`
                                                }
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                🕐 Importado: {new Date(h.importDate).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono truncate" title={h.batchId}>
                                                ID: {h.batchId.slice(0, 8)}...
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-auto pt-4">
                                        <AlertDialog open={deletingId === h.id} onOpenChange={(open) => setDeletingId(open ? h.id : null)}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                                    🗑️ Borrar
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar esta importación?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Estás a punto de eliminar <strong>{h.entriesCount} registros</strong>
                                                        {h.employeeName && ` de ${h.employeeName}`} del periodo {h.dateRange.start} - {h.dateRange.end}.
                                                        <br /><br />
                                                        <strong>Solo se borrarán los datos de esta importación</strong>, no afectará a otras importaciones del mismo mes.
                                                        <br /><br />
                                                        Esta acción no se puede deshacer.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(h.batchId)}
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
                <div className="grid md:grid-cols-2 gap-6">
                    {/* ClickUp Instructions */}
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            📋 Exportar desde ClickUp (.csv)
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

                    {/* Google Calendar Instructions */}
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            📅 Exportar desde Google Calendar (.ics)
                        </h3>
                        <ol className="space-y-3 text-gray-700">
                            <li className="flex items-start">
                                <span className="font-bold text-purple-600 mr-3">1.</span>
                                <span>Ve a <strong>Google Calendar</strong> en tu navegador</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold text-purple-600 mr-3">2.</span>
                                <span>Haz clic en <strong>Configuración ⚙️</strong> → <strong>Importar y exportar</strong></span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold text-purple-600 mr-3">3.</span>
                                <span>En "Exportar", haz clic en <strong>Exportar</strong> para descargar todos tus calendarios</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold text-purple-600 mr-3">4.</span>
                                <span>Descomprime el archivo .zip y busca el calendario del empleado (archivo .ics)</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold text-purple-600 mr-3">5.</span>
                                <span>Sube el archivo .ics aquí y selecciona el mes a importar</span>
                            </li>
                        </ol>
                        <p className="text-xs text-purple-700 bg-purple-50 p-3 rounded mt-3">
                            💡 <strong>Tip:</strong> Las tareas se asignarán a "Sin Clasificar". Luego podrás reasignarlas a los clientes correctos desde el dashboard.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
