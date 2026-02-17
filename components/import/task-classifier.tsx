'use client'

import { useState, useMemo, useCallback } from 'react'
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

    const handleClientChange = useCallback((entryId: number, clientName: string) => {
        setClientMappings(prev => ({ ...prev, [entryId]: clientName }))
        // If assigning a client, remove from discarded
        setDiscardedEntries(prev => {
            const newSet = new Set(prev)
            newSet.delete(entryId)
            return newSet
        })
    }, [])

    const handleToggleDiscard = useCallback((entryId: number) => {
        setDiscardedEntries(prev => {
            const newDiscarded = new Set(prev)
            const wasDiscarded = newDiscarded.has(entryId)
            
            if (wasDiscarded) {
                newDiscarded.delete(entryId)
            } else {
                newDiscarded.add(entryId)
                // If discarding, remove client mapping
                setClientMappings(prevMappings => {
                    const newMappings = { ...prevMappings }
                    delete newMappings[entryId]
                    return newMappings
                })
            }
            return newDiscarded
        })
    }, [])

    const handleSelectEntry = useCallback((entryId: number) => {
        setSelectedEntries(prev => {
            const newSelected = new Set(prev)
            if (newSelected.has(entryId)) {
                newSelected.delete(entryId)
            } else {
                newSelected.add(entryId)
            }
            return newSelected
        })
    }, [])

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
        <div className="space-y-3">
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-purple-900">
                        📋 Clasificar {entries.length} tareas
                    </h2>
                    <div className="flex gap-3 text-sm">
                        <span className="text-green-700 font-semibold">✓ {classifiedCount}</span>
                        <span className="text-gray-600">✗ {discardedCount}</span>
                        <span className="text-red-600 font-semibold">⚠ {unclassifiedCount}</span>
                    </div>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-1.5">
                    <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${((classifiedCount + discardedCount) / entries.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Compact Bulk Assignment */}
            {selectedEntries.size > 0 && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-900 whitespace-nowrap">
                            {selectedEntries.size} selec.
                        </span>
                        <Select value={bulkClient} onValueChange={setBulkClient}>
                            <SelectTrigger className="bg-white h-8 text-sm flex-1">
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
                        <Button
                            onClick={handleBulkAssign}
                            disabled={!bulkClient}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 h-8"
                        >
                            ✓ Asignar
                        </Button>
                        <Button
                            onClick={handleBulkDiscard}
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 h-8"
                        >
                            ✗ Descartar
                        </Button>
                    </div>
                </div>
            )}

            {/* Chronological Tasks List */}
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
                {sortedEntries.map(entry => {
                    const isDiscarded = discardedEntries.has(entry.id)
                    const hasClient = !!clientMappings[entry.id]
                    const isClassified = isDiscarded || hasClient

                    return (
                        <div 
                            key={entry.id} 
                            className={`bg-white border rounded-lg p-2 transition-colors ${
                                isDiscarded ? 'opacity-40 bg-gray-50 border-gray-300' : 
                                hasClient ? 'border-green-400 bg-green-50' : 
                                'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {/* Checkbox for selection */}
                                <input
                                    type="checkbox"
                                    checked={selectedEntries.has(entry.id)}
                                    onChange={() => handleSelectEntry(entry.id)}
                                    className="w-4 h-4 text-purple-600 rounded flex-shrink-0"
                                    disabled={isDiscarded}
                                />
                                
                                {/* Task info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`font-medium text-sm flex-1 min-w-0 truncate ${isDiscarded ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                            {entry.taskName}
                                        </span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{entry.date}</span>
                                        <span className="text-xs text-gray-600 font-mono whitespace-nowrap">{entry.durationHours.toFixed(1)}h</span>
                                        
                                        {/* Discard checkbox */}
                                        <label 
                                            className="flex items-center gap-1 cursor-pointer whitespace-nowrap flex-shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isDiscarded}
                                                onChange={() => handleToggleDiscard(entry.id)}
                                                className="w-3.5 h-3.5 text-red-600 rounded"
                                            />
                                            <span className="text-xs text-gray-600">✗</span>
                                        </label>
                                    </div>

                                    {/* Client selector */}
                                    {!isDiscarded && (
                                        <Select
                                            value={clientMappings[entry.id] || ''}
                                            onValueChange={(value) => handleClientChange(entry.id, value)}
                                        >
                                            <SelectTrigger className={`h-8 text-sm ${hasClient ? 'border-green-500 bg-white' : 'border-gray-300'}`}>
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
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Compact Actions */}
            <div className="flex gap-2 sticky bottom-0 bg-white p-2 border-t">
                <Button
                    onClick={onCancel}
                    variant="outline"
                    size="sm"
                >
                    ❌ Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                    {canConfirm 
                        ? `✅ Guardar ${classifiedCount}` 
                        : `⚠️ Faltan ${unclassifiedCount}`
                    }
                </Button>
            </div>
        </div>
    )
}
