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
    const [discardedEntries, setDiscardedEntries] = useState<Set<number>>(new Set())
    const [bulkClient, setBulkClient] = useState<string>('')
    const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set())

    // Sort entries chronologically
    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime()
        })
    }, [entries])

    const handleClientChange = (entryId: number, clientName: string) => {
        setClientMappings(prev => ({ ...prev, [entryId]: clientName }))
        // If assigning a client, remove from discarded
        setDiscardedEntries(prev => {
            const newSet = new Set(prev)
            newSet.delete(entryId)
            return newSet
        })
    }

    const handleToggleDiscard = (entryId: number) => {
        const newDiscarded = new Set(discardedEntries)
        if (newDiscarded.has(entryId)) {
            newDiscarded.delete(entryId)
        } else {
            newDiscarded.add(entryId)
            // If discarding, remove client mapping
            setClientMappings(prev => {
                const newMappings = { ...prev }
                delete newMappings[entryId]
                return newMappings
            })
        }
        setDiscardedEntries(newDiscarded)
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

    const handleBulkAssign = () => {
        if (!bulkClient || selectedEntries.size === 0) return

        const newMappings = { ...clientMappings }
        const newDiscarded = new Set(discardedEntries)
        
        selectedEntries.forEach(entryId => {
            newMappings[entryId] = bulkClient
            // Remove from discarded if assigning client
            newDiscarded.delete(entryId)
        })
        
        setClientMappings(newMappings)
        setDiscardedEntries(newDiscarded)
        setSelectedEntries(new Set())
        setBulkClient('')
    }

    const handleBulkDiscard = () => {
        if (selectedEntries.size === 0) return

        const newDiscarded = new Set(discardedEntries)
        const newMappings = { ...clientMappings }
        
        selectedEntries.forEach(entryId => {
            newDiscarded.add(entryId)
            // Remove client mapping if discarding
            delete newMappings[entryId]
        })
        
        setDiscardedEntries(newDiscarded)
        setClientMappings(newMappings)
        setSelectedEntries(new Set())
    }

    const unclassifiedCount = entries.filter(e => !clientMappings[e.id] && !discardedEntries.has(e.id)).length
    const discardedCount = discardedEntries.size
    const classifiedCount = Object.keys(clientMappings).length
    const canConfirm = unclassifiedCount === 0

    const handleConfirm = () => {
        // Filter out discarded entries from mappings
        const finalMappings: Record<number, string> = {}
        entries.forEach(entry => {
            if (!discardedEntries.has(entry.id) && clientMappings[entry.id]) {
                finalMappings[entry.id] = clientMappings[entry.id]
            }
        })
        onConfirm(finalMappings)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-purple-900 mb-2">
                    📋 Clasificar Tareas por Cliente
                </h2>
                <p className="text-purple-800">
                    Asigna un cliente a cada tarea o descártala. Total: <strong>{entries.length} tareas</strong>
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border-2 border-green-200">
                        <div className="text-sm text-green-700 font-medium">Con cliente</div>
                        <div className="text-2xl font-bold text-green-600">{classifiedCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">Descartadas</div>
                        <div className="text-2xl font-bold text-gray-600">{discardedCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border-2 border-red-200">
                        <div className="text-sm text-red-700 font-medium">Sin clasificar</div>
                        <div className="text-2xl font-bold text-red-600">{unclassifiedCount}</div>
                    </div>
                </div>
                <div className="mt-3">
                    <div className="w-full bg-purple-200 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${((classifiedCount + discardedCount) / entries.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Bulk Assignment */}
            {selectedEntries.size > 0 && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-900 mb-3">
                        Acción masiva ({selectedEntries.size} seleccionadas)
                    </p>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-blue-800 mb-1 block">Asignar cliente</label>
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
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            ✓ Asignar
                        </Button>
                        <Button
                            onClick={handleBulkDiscard}
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                            ✗ Descartar {selectedEntries.size}
                        </Button>
                    </div>
                </div>
            )}

            {/* Chronological Tasks List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {sortedEntries.map(entry => {
                    const isDiscarded = discardedEntries.has(entry.id)
                    const hasClient = !!clientMappings[entry.id]
                    const isClassified = isDiscarded || hasClient

                    return (
                        <div 
                            key={entry.id} 
                            className={`bg-white border-2 rounded-lg p-3 hover:shadow-md transition-all ${
                                isDiscarded ? 'opacity-50 bg-gray-50 border-gray-300' : 
                                hasClient ? 'border-green-300 bg-green-50' : 
                                'border-gray-200'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox for selection */}
                                <input
                                    type="checkbox"
                                    checked={selectedEntries.has(entry.id)}
                                    onChange={() => handleSelectEntry(entry.id)}
                                    className="mt-1 w-5 h-5 text-purple-600 rounded"
                                    disabled={isDiscarded}
                                />
                                
                                {/* Task info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-semibold text-gray-900 mb-1 ${isDiscarded ? 'line-through' : ''}`}>
                                                {entry.taskName}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                <span>📅 {entry.date}</span>
                                                <span>⏱️ {entry.durationHours.toFixed(2)}h</span>
                                            </div>
                                        </div>
                                        
                                        {/* Discard checkbox */}
                                        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={isDiscarded}
                                                onChange={() => handleToggleDiscard(entry.id)}
                                                className="w-4 h-4 text-red-600 rounded"
                                            />
                                            <span className="text-sm text-gray-700">Descartar</span>
                                        </label>
                                    </div>

                                    {/* Client selector */}
                                    {!isDiscarded && (
                                        <div className="w-full max-w-md">
                                            <Select
                                                value={clientMappings[entry.id] || ''}
                                                onValueChange={(value) => handleClientChange(entry.id, value)}
                                            >
                                                <SelectTrigger className={hasClient ? 'border-green-500 bg-white' : 'border-gray-300'}>
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
                                    )}
                                    
                                    {isDiscarded && (
                                        <div className="text-sm text-gray-500 italic">
                                            Esta tarea no se guardará
                                        </div>
                                    )}
                                </div>
                            </div>
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
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg"
                >
                    {canConfirm 
                        ? `✅ Guardar ${classifiedCount} ${classifiedCount === 1 ? 'tarea' : 'tareas'}` 
                        : `⚠️ Faltan ${unclassifiedCount} por clasificar o descartar`
                    }
                </Button>
            </div>
        </div>
    )
}
