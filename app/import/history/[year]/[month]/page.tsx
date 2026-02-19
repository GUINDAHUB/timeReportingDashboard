'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatHours, getMonthName } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { TaskClassifier } from '@/components/import/task-classifier'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface TimeEntry {
    id: string
    date: string
    task_name: string
    duration_hours: number
    employee_name: string
    client: { name: string } | null
    category: { name: string } | null
}

export default function ImportCheckPage() {
    const params = useParams()
    const router = useRouter()
    const year = parseInt(params.year as string)
    const month = parseInt(params.month as string)

    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filterEmployee, setFilterEmployee] = useState<string>('all')
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
    const [deleting, setDeleting] = useState(false)
    const [showClassifier, setShowClassifier] = useState(false)
    const [classifyingEntries, setClassifyingEntries] = useState<any[]>([])
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
    const [reclassifying, setReclassifying] = useState(false)

    useEffect(() => {
        loadEntries()
        loadClients()
    }, [])

    async function loadEntries() {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

        const { data, error } = await supabase
            .from('time_entries')
            .select(`
        id,
        date,
        task_name,
        duration_hours,
        employee_name,
        client:clients(name),
        category:categories(name)
      `)
            .gte('date', startDate)
            .lt('date', endDate)
            .order('date', { ascending: false })

        if (error) {
            console.error('Error loading entries:', error)
        } else {
            setEntries(data as any)
        }
        setLoading(false)
    }

    async function loadClients() {
        const { data, error } = await supabase
            .from('clients')
            .select('id, name')
            .order('name')

        if (error) {
            console.error('Error loading clients:', error)
        } else {
            // Filter out "Sin Clasificar" from the options
            setClients((data || []).filter(c => c.name !== 'Sin Clasificar'))
        }
    }

    function getUniqueEmployees(): string[] {
        const employees = new Set<string>()
        entries.forEach(entry => {
            if (entry.employee_name) {
                employees.add(entry.employee_name)
            }
        })
        return Array.from(employees).sort()
    }

    function getFilteredEntries(): TimeEntry[] {
        if (filterEmployee === 'all') {
            return entries
        }
        return entries.filter(e => e.employee_name === filterEmployee)
    }

    function toggleEntrySelection(entryId: string) {
        const newSelected = new Set(selectedEntries)
        if (newSelected.has(entryId)) {
            newSelected.delete(entryId)
        } else {
            newSelected.add(entryId)
        }
        setSelectedEntries(newSelected)
    }

    function selectAllFiltered() {
        const filtered = getFilteredEntries()
        const newSelected = new Set<string>()
        filtered.forEach(e => newSelected.add(e.id))
        setSelectedEntries(newSelected)
    }

    function deselectAll() {
        setSelectedEntries(new Set())
    }

    async function handleBulkDelete() {
        if (selectedEntries.size === 0) return

        const confirmed = window.confirm(
            `¿Estás seguro de que quieres eliminar ${selectedEntries.size} registros seleccionados?\n\nEsta acción no se puede deshacer.`
        )

        if (!confirmed) return

        setDeleting(true)
        try {
            const entriesToDelete = Array.from(selectedEntries)

            const { error } = await supabase
                .from('time_entries')
                .delete()
                .in('id', entriesToDelete)

            if (error) throw error

            toast.success(`Eliminados ${selectedEntries.size} registros correctamente`)
            setSelectedEntries(new Set())
            loadEntries() // Reload data
        } catch (error) {
            console.error('Error deleting entries:', error)
            toast.error('Error al eliminar los registros')
        } finally {
            setDeleting(false)
        }
    }

    function handleStartReclassification() {
        // Get all "Sin Clasificar" entries
        const unclassifiedEntries = entries
            .filter(e => e.client?.name === 'Sin Clasificar')
            .map((e, index) => ({
                id: index, // Temporary ID for the classifier
                dbId: e.id, // Real database ID
                taskName: e.task_name,
                durationHours: e.duration_hours,
                date: e.date,
                employeeName: e.employee_name,
                clientName: 'Sin Clasificar',
            }))

        if (unclassifiedEntries.length === 0) {
            toast.info('No hay entradas sin clasificar')
            return
        }

        setClassifyingEntries(unclassifiedEntries)
        setShowClassifier(true)
    }

    async function handleConfirmReclassification(mappings: Record<number, string>) {
        setReclassifying(true)
        try {
            // Separate entries into: to update and to delete
            const entriesToUpdate: Array<{ id: string; clientName: string }> = []
            const entriesToDelete: string[] = []

            classifyingEntries.forEach((entry, index) => {
                if (mappings[index]) {
                    // Has a client mapping -> update
                    entriesToUpdate.push({
                        id: entry.dbId,
                        clientName: mappings[index],
                    })
                } else {
                    // No mapping (discarded) -> delete
                    entriesToDelete.push(entry.dbId)
                }
            })

            // Update entries with new clients
            if (entriesToUpdate.length > 0) {
                const response = await fetch('/api/categorization/recategorize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: entriesToUpdate }),
                })

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(result.error || 'Error al reclasificar')
                }

                toast.success(result.message)
            }

            // Delete discarded entries
            if (entriesToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('time_entries')
                    .delete()
                    .in('id', entriesToDelete)

                if (deleteError) {
                    throw deleteError
                }

                toast.success(`Eliminadas ${entriesToDelete.length} entradas descartadas`)
            }

            setShowClassifier(false)
            setClassifyingEntries([])
            loadEntries() // Reload to show updated data
        } catch (error) {
            console.error('Error reclassifying:', error)
            toast.error('Error al reclasificar las entradas')
        } finally {
            setReclassifying(false)
        }
    }

    const filteredEntries = getFilteredEntries()
    const totalHours = filteredEntries.reduce((acc, curr) => acc + curr.duration_hours, 0)
    const selectedCount = selectedEntries.size
    const selectedHours = entries
        .filter(e => selectedEntries.has(e.id))
        .reduce((acc, curr) => acc + curr.duration_hours, 0)
    
    const unclassifiedCount = entries.filter(e => e.client?.name === 'Sin Clasificar').length

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Importar
                </Button>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Registros de {getMonthName(month)} {year}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Verificando datos importados
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {unclassifiedCount > 0 && (
                            <Button
                                onClick={handleStartReclassification}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                disabled={loading}
                            >
                                🏷️ Reclasificar {unclassifiedCount} sin clasificar
                            </Button>
                        )}
                        <div className="text-right bg-slate-100 p-3 rounded-lg">
                            <p className="text-sm text-gray-500">Total Horas</p>
                            <p className="text-2xl font-bold text-slate-800">{formatHours(totalHours)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Bulk Actions */}
            {!loading && entries.length > 0 && (
                <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
                    <div className="flex items-center justify-between gap-4">
                        {/* Filter by employee */}
                        <div className="flex items-center gap-4 flex-1">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                Filtrar por empleado:
                            </label>
                            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los empleados</SelectItem>
                                    {getUniqueEmployees().map((emp) => (
                                        <SelectItem key={emp} value={emp}>
                                            {emp}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-gray-500">
                                Mostrando {filteredEntries.length} de {entries.length} registros
                            </span>
                        </div>

                        {/* Selection buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={selectAllFiltered}
                                variant="outline"
                                size="sm"
                                disabled={filteredEntries.length === 0}
                            >
                                ☑️ Seleccionar {filteredEntries.length}
                            </Button>
                            {selectedCount > 0 && (
                                <Button
                                    onClick={deselectAll}
                                    variant="outline"
                                    size="sm"
                                >
                                    ❌ Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk delete banner */}
            {selectedCount > 0 && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="font-bold text-red-900">
                            {selectedCount} {selectedCount === 1 ? 'registro seleccionado' : 'registros seleccionados'}
                        </p>
                        <p className="text-sm text-red-700">
                            {formatHours(selectedHours)} horas en total
                        </p>
                    </div>
                    <Button
                        onClick={handleBulkDelete}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {deleting ? '⏳ Eliminando...' : `🗑️ Eliminar ${selectedCount}`}
                    </Button>
                </div>
            )}

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="px-4 py-3 w-12"></th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Tarea / Proyecto</th>
                                <th className="px-6 py-3">Categoría</th>
                                <th className="px-6 py-3">Empleado</th>
                                <th className="px-6 py-3 text-right">Horas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Cargando registros...
                                    </td>
                                </tr>
                            ) : filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        {entries.length === 0 
                                            ? 'No hay registros para este mes.' 
                                            : 'No hay registros para el filtro seleccionado.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr 
                                        key={entry.id} 
                                        className={`hover:bg-gray-50 ${
                                            selectedEntries.has(entry.id) ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedEntries.has(entry.id)}
                                                onChange={() => toggleEntrySelection(entry.id)}
                                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                                            {new Date(entry.date).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {entry.client?.name || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-700 max-w-xs truncate" title={entry.task_name}>
                                            {entry.task_name}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {entry.category?.name || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {entry.employee_name}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-gray-700">
                                            {formatHours(entry.duration_hours)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {!loading && filteredEntries.length > 0 && (
                <p className="text-center text-xs text-gray-400 mt-4">
                    Mostrando {filteredEntries.length} registros ({formatHours(totalHours)} horas)
                </p>
            )}

            {/* Reclassification Dialog */}
            <Dialog open={showClassifier} onOpenChange={setShowClassifier}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Reclasificar entradas sin clasificar</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                        {showClassifier && (
                            <TaskClassifier
                                entries={classifyingEntries}
                                clients={clients}
                                onConfirm={handleConfirmReclassification}
                                onCancel={() => {
                                    setShowClassifier(false)
                                    setClassifyingEntries([])
                                }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
