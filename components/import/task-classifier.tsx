'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select'

interface TaskEntry {
    id: number
    taskName: string
    durationHours: number
    date: string
    employeeName: string
    clientName: string
}

interface TaskClassifierProps {
    entries: TaskEntry[]
    clients: Array<{ id: string; name: string }>
    onConfirm: (mappings: Record<number, string>) => void
    onCancel: () => void
}

export function TaskClassifier({ entries, clients, onConfirm, onCancel }: TaskClassifierProps) {
    // Initialize all entries with empty client selection
    const [clientMappings, setClientMappings] = useState<Record<number, string>>({})
    const [bulkClient, setBulkClient] = useState<string>('')
    const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set())

    // Group entries by task name for easier classification
    const groupedEntries = useMemo(() => {
        const groups = new Map<string, TaskEntry[]>()
        entries.forEach(entry => {
            const taskName = entry.taskName.toLowerCase().trim()
            if (!groups.has(taskName)) {
                groups.set(taskName, [])
            }
            groups.get(taskName)!.push(entry)
        })
        return Array.from(groups.entries()).map(([taskName, entries]) => ({
            taskName,
            entries,
            totalHours: entries.reduce((sum, e) => sum + e.durationHours, 0),
            count: entries.length,
        }))
    }, [entries])

    const handleClientChange = (entryId: number, clientName: string) => {
        setClientMappings(prev => ({ ...prev, [entryId]: clientName }))
    }

    const handleGroupClientChange = (groupTaskName: string, clientName: string) => {
        const group = groupedEntries.find(g => g.taskName === groupTaskName)
        if (!group) return

        const newMappings = { ...clientMappings }
        group.entries.forEach(entry => {
            newMappings[entry.id] = clientName
        })
        setClientMappings(newMappings)
    }

    const handleSelectEntry = (entryId: number) => {
        const newSelected = new Set(selectedEntries)
        if (newSelected.has(entryId)) {
            newSelected.delete(entryId)
        } else {
            newSelected.add(entryId)
        }
        setSelectedEntries(newSelected)
    }

    const handleSelectAllInGroup = (groupTaskName: string) => {
        const group = groupedEntries.find(g => g.taskName === groupTaskName)
        if (!group) return

        const newSelected = new Set(selectedEntries)
        const allSelected = group.entries.every(e => selectedEntries.has(e.id))

        if (allSelected) {
            // Deselect all
            group.entries.forEach(e => newSelected.delete(e.id))
        } else {
            // Select all
            group.entries.forEach(e => newSelected.add(e.id))
        }
        setSelectedEntries(newSelected)
    }

    const handleBulkAssign = () => {
        if (!bulkClient || selectedEntries.size === 0) return

        const newMappings = { ...clientMappings }
        selectedEntries.forEach(entryId => {
            newMappings[entryId] = bulkClient
        })
        setClientMappings(newMappings)
        setSelectedEntries(new Set())
        setBulkClient('')
    }

    const unclassifiedCount = entries.filter(e => !clientMappings[e.id]).length
    const canConfirm = unclassifiedCount === 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-purple-900 mb-2">
                    📋 Clasificar Tareas por Cliente
                </h2>
                <p className="text-purple-800">
                    Asigna un cliente a cada tarea antes de guardar. Total: <strong>{entries.length} tareas</strong>
                </p>
                <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1">
                        <div className="text-sm text-purple-700">
                            Sin clasificar: <strong className={unclassifiedCount > 0 ? 'text-red-600' : 'text-green-600'}>
                                {unclassifiedCount}
                            </strong>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                            <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${((entries.length - unclassifiedCount) / entries.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Assignment */}
            {selectedEntries.size > 0 && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 mb-2">
                                Asignación masiva ({selectedEntries.size} seleccionadas)
                            </p>
                            <Select value={bulkClient} onValueChange={setBulkClient}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecciona un cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.name}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={handleBulkAssign}
                            disabled={!bulkClient}
                            className="bg-blue-600 hover:bg-blue-700 mt-6"
                        >
                            Asignar a {selectedEntries.size} tareas
                        </Button>
                    </div>
                </div>
            )}

            {/* Grouped Tasks */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {groupedEntries.map(group => {
                    const allSelected = group.entries.every(e => selectedEntries.has(e.id))
                    const someSelected = group.entries.some(e => selectedEntries.has(e.id))
                    const allClassified = group.entries.every(e => clientMappings[e.id])
                    const assignedClient = allClassified ? clientMappings[group.entries[0].id] : null
                    const sameClient = assignedClient && group.entries.every(e => clientMappings[e.id] === assignedClient)

                    return (
                        <div key={group.taskName} className="bg-white border-2 rounded-xl p-4 hover:shadow-md transition-shadow">
                            {/* Group Header */}
                            <div className="flex items-start gap-4 mb-3">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={input => {
                                        if (input) input.indeterminate = someSelected && !allSelected
                                    }}
                                    onChange={() => handleSelectAllInGroup(group.taskName)}
                                    className="mt-1 w-5 h-5 text-purple-600 rounded"
                                />
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 mb-1">
                                        {group.entries[0].taskName}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span>📊 {group.count} {group.count === 1 ? 'entrada' : 'entradas'}</span>
                                        <span>⏱️ {group.totalHours.toFixed(2)}h</span>
                                        {sameClient && (
                                            <span className="text-green-700 font-medium">
                                                ✅ {assignedClient}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-64">
                                    <Select
                                        value={sameClient ? assignedClient : ''}
                                        onValueChange={(value) => handleGroupClientChange(group.taskName, value)}
                                    >
                                        <SelectTrigger className={sameClient ? 'border-green-500 bg-green-50' : 'border-gray-300'}>
                                            <SelectValue placeholder="Selecciona cliente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map(client => (
                                                <SelectItem key={client.id} value={client.name}>
                                                    {client.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Individual Entries (collapsed by default if all same client) */}
                            {!sameClient && group.count > 1 && (
                                <div className="ml-9 mt-3 space-y-2 border-l-2 border-gray-200 pl-4">
                                    {group.entries.map(entry => (
                                        <div key={entry.id} className="flex items-center gap-4 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedEntries.has(entry.id)}
                                                onChange={() => handleSelectEntry(entry.id)}
                                                className="w-4 h-4 text-purple-600 rounded"
                                            />
                                            <span className="text-gray-600">{entry.date}</span>
                                            <span className="text-gray-700">{entry.durationHours.toFixed(2)}h</span>
                                            <div className="flex-1">
                                                <Select
                                                    value={clientMappings[entry.id] || ''}
                                                    onValueChange={(value) => handleClientChange(entry.id, value)}
                                                >
                                                    <SelectTrigger className={clientMappings[entry.id] ? 'border-green-500 bg-green-50 h-8' : 'h-8'}>
                                                        <SelectValue placeholder="Cliente..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {clients.map(client => (
                                                            <SelectItem key={client.id} value={client.name}>
                                                                {client.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Actions */}
            <div className="flex gap-4 sticky bottom-0 bg-white p-4 border-t-2 rounded-xl">
                <Button
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1"
                >
                    ❌ Cancelar
                </Button>
                <Button
                    onClick={() => onConfirm(clientMappings)}
                    disabled={!canConfirm}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg"
                >
                    {canConfirm ? '✅ Guardar y Finalizar' : `⚠️ Faltan ${unclassifiedCount} por clasificar`}
                </Button>
            </div>
        </div>
    )
}
