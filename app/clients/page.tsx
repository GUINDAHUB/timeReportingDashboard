'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Client, ClientMonthlyGoal } from '@/lib/types'
import { getMonthName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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

interface ClientRow {
    client: Client
    monthlyFees: Map<number, ClientMonthlyGoal> // month (1-12) -> goal
}

export default function ClientsPage() {
    const [clientRows, setClientRows] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [editingCell, setEditingCell] = useState<{ clientId: string; month: number } | null>(null)
    const [editValue, setEditValue] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [newClientName, setNewClientName] = useState('')
    const currentYear = new Date().getFullYear()

    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)

        // Load clients
        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (clientsError) {
            console.error('Error loading clients:', clientsError)
            setLoading(false)
            return
        }

        // Load all monthly goals for current year
        const { data: goals, error: goalsError } = await supabase
            .from('client_monthly_goals')
            .select('*')
            .eq('year', currentYear)

        if (goalsError) {
            console.error('Error loading goals:', goalsError)
        }

        // Build rows
        const rows: ClientRow[] = (clients || []).map(client => {
            const monthlyFees = new Map<number, ClientMonthlyGoal>()

            goals?.forEach(goal => {
                if (goal.client_id === client.id) {
                    monthlyFees.set(goal.month, goal)
                }
            })

            return { client, monthlyFees }
        })

        setClientRows(rows)
        setLoading(false)
    }

    async function handleCellClick(clientId: string, month: number) {
        const row = clientRows.find(r => r.client.id === clientId)
        const currentFee = row?.monthlyFees.get(month)?.fee

        setEditingCell({ clientId, month })
        setEditValue(currentFee?.toString() || '')
    }

    async function handleCellSave() {
        if (!editingCell) return

        const { clientId, month } = editingCell

        // If empty or 0, delete the fee
        if (editValue.trim() === '' || parseFloat(editValue) === 0) {
            const row = clientRows.find(r => r.client.id === clientId)
            const existingGoal = row?.monthlyFees.get(month)

            if (existingGoal) {
                const { error } = await supabase
                    .from('client_monthly_goals')
                    .delete()
                    .eq('id', existingGoal.id)

                if (error) {
                    console.error('Error deleting fee:', error)
                    alert('Error al eliminar')
                    return
                }
            }

            setEditingCell(null)
            loadData()
            return
        }

        const newFee = parseFloat(editValue)

        if (isNaN(newFee) || newFee < 0) {
            alert('Por favor ingresa un número válido')
            return
        }

        // Check if goal exists
        const row = clientRows.find(r => r.client.id === clientId)
        const existingGoal = row?.monthlyFees.get(month)

        if (existingGoal) {
            // Update existing
            const { error } = await supabase
                .from('client_monthly_goals')
                .update({ fee: newFee })
                .eq('id', existingGoal.id)

            if (error) {
                console.error('Error updating fee:', error)
                alert('Error al actualizar')
                return
            }
        } else {
            // Insert new
            const { error } = await supabase
                .from('client_monthly_goals')
                .insert({
                    client_id: clientId,
                    month,
                    year: currentYear,
                    fee: newFee,
                })

            if (error) {
                console.error('Error inserting fee:', error)
                alert('Error al crear')
                return
            }
        }

        setEditingCell(null)
        loadData()
    }



    async function handleDeleteClient(clientId: string) {
        const { error } = await supabase
            .from('clients')
            .update({ is_active: false })
            .eq('id', clientId)

        if (error) {
            console.error('Error deleting client:', error)
            alert('Error al eliminar cliente')
            return
        }

        loadData()
    }

    async function handleAddClient() {
        if (!newClientName.trim()) {
            alert('El nombre es requerido')
            return
        }

        // Check if a client with this name already exists (even if inactive)
        const { data: existingClient, error: checkError } = await supabase
            .from('clients')
            .select('*')
            .eq('name', newClientName.trim())
            .single()

        if (existingClient) {
            // Client exists - reactivate it
            const { error } = await supabase
                .from('clients')
                .update({ is_active: true })
                .eq('id', existingClient.id)

            if (error) {
                console.error('Error reactivating client:', error)
                alert('Error al reactivar cliente: ' + error.message)
                return
            }

            setShowAddDialog(false)
            setNewClientName('')
            loadData()
            return
        }

        // Client doesn't exist - create new
        const { error } = await supabase
            .from('clients')
            .insert({
                name: newClientName.trim(),
                default_fee: 0, // No usado, pero requerido por el schema
            })

        if (error) {
            console.error('Error adding client:', error)
            alert('Error al crear cliente: ' + error.message)
            return
        }

        setShowAddDialog(false)
        setNewClientName('')
        loadData()
    }

    function getFeeForMonth(row: ClientRow, month: number): number | null {
        const goal = row.monthlyFees.get(month)
        return goal ? goal.fee : null
    }

    function hasFee(row: ClientRow, month: number): boolean {
        return row.monthlyFees.has(month)
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p className="text-center text-gray-600">Cargando clientes...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
                        <p className="text-gray-600 mt-1">
                            {clientRows.length} clientes • {currentYear}
                        </p>
                    </div>

                    <Button onClick={() => setShowAddDialog(true)}>
                        ➕ Nuevo Cliente
                    </Button>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                        💡 <strong>Haz clic en cualquier celda</strong> para configurar el fee de ese mes.
                        Las celdas con fee aparecen en <span className="font-bold text-blue-700">azul</span>.
                        Para <strong>eliminar un fee</strong>, edita la celda y deja el campo vacío o escribe 0.
                    </p>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                                    Cliente
                                </th>
                                {months.map(month => (
                                    <th key={month} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[120px]">
                                        {getMonthName(month).slice(0, 3)}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 sticky right-0 bg-gray-50 z-10 min-w-[100px]">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {clientRows.map(row => (
                                <tr key={row.client.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                                        {row.client.name}
                                    </td>
                                    {months.map(month => {
                                        const fee = getFeeForMonth(row, month)
                                        const hasValue = hasFee(row, month)
                                        const isEditing = editingCell?.clientId === row.client.id && editingCell?.month === month

                                        return (
                                            <td
                                                key={month}
                                                className={`px-2 py-2 text-center text-sm transition-colors ${hasValue
                                                    ? 'bg-blue-50'
                                                    : 'hover:bg-gray-100'
                                                    }`}
                                            >
                                                {isEditing ? (
                                                    <Input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={handleCellSave}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleCellSave()
                                                            if (e.key === 'Escape') setEditingCell(null)
                                                        }}
                                                        className="w-full text-sm h-8"
                                                        placeholder="Fee €"
                                                        autoFocus
                                                    />
                                                ) : hasValue ? (
                                                    <button
                                                        onClick={() => handleCellClick(row.client.id, month)}
                                                        className="text-blue-900 font-semibold hover:underline w-full"
                                                    >
                                                        {fee?.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCellClick(row.client.id, month)}
                                                        className="text-gray-400 hover:text-gray-600 w-full"
                                                    >
                                                        —
                                                    </button>
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td className="px-4 py-3 text-center sticky right-0 bg-white">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    🗑️ Eliminar
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        ¿Estás seguro de que quieres eliminar a <strong>{row.client.name}</strong>?
                                                        Se desactivará el cliente y sus datos históricos se mantendrán.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteClient(row.client.id)}>
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {clientRows.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-600">No hay clientes. Añade tu primer cliente.</p>
                    </div>
                )}
            </div>

            {/* Add Client Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                            Añade un nuevo cliente. Podrás configurar sus fees mensuales después.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Nombre del Cliente
                            </label>
                            <Input
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="Ej: Coca-Cola"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddClient()
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddClient}>
                            Crear Cliente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
