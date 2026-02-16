'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Client, ClientMonthlyGoal, ClientDirectCost, MonthlyOperationalCost } from '@/lib/types'
import { getMonthName, formatCurrency } from '@/lib/utils'
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
import { toast } from 'sonner'

interface ClientRow {
    client: Client
    monthlyFees: Map<number, ClientMonthlyGoal> // month (1-12) -> goal
    directCosts: Map<number, ClientDirectCost> // month (1-12) -> direct cost
}

export default function ClientsPage() {
    const [clientRows, setClientRows] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [editingCell, setEditingCell] = useState<{ clientId: string; month: number; type: 'fee' | 'cost' } | null>(null)
    const [editValue, setEditValue] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [newClientName, setNewClientName] = useState('')
    const [operationalCosts, setOperationalCosts] = useState<Map<number, MonthlyOperationalCost>>(new Map())
    const [editingOpCost, setEditingOpCost] = useState<number | null>(null)
    const [editOpCostValue, setEditOpCostValue] = useState('')
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

        // Load all direct costs for current year
        const { data: costs, error: costsError } = await supabase
            .from('client_direct_costs')
            .select('*')
            .eq('year', currentYear)

        if (costsError) {
            console.error('Error loading direct costs:', costsError)
        }

        // Load operational costs for current year
        const { data: opCosts, error: opCostsError } = await supabase
            .from('monthly_operational_costs')
            .select('*')
            .eq('year', currentYear)

        if (opCostsError) {
            console.error('Error loading operational costs:', opCostsError)
        }

        // Build operational costs map
        const opCostsMap = new Map<number, MonthlyOperationalCost>()
        opCosts?.forEach(cost => {
            opCostsMap.set(cost.month, cost)
        })
        setOperationalCosts(opCostsMap)

        // Build rows
        const rows: ClientRow[] = (clients || []).map(client => {
            const monthlyFees = new Map<number, ClientMonthlyGoal>()
            const directCosts = new Map<number, ClientDirectCost>()

            goals?.forEach(goal => {
                if (goal.client_id === client.id) {
                    monthlyFees.set(goal.month, goal)
                }
            })

            costs?.forEach(cost => {
                if (cost.client_id === client.id) {
                    directCosts.set(cost.month, cost)
                }
            })

            return { client, monthlyFees, directCosts }
        })

        setClientRows(rows)
        setLoading(false)
    }

    async function handleCellClick(clientId: string, month: number, type: 'fee' | 'cost') {
        const row = clientRows.find(r => r.client.id === clientId)
        const currentValue = type === 'fee' 
            ? row?.monthlyFees.get(month)?.fee
            : row?.directCosts.get(month)?.amount

        setEditingCell({ clientId, month, type })
        setEditValue(currentValue?.toString() || '')
    }

    async function handleCellSave() {
        if (!editingCell) return

        const { clientId, month, type } = editingCell

        if (type === 'fee') {
            await saveFee(clientId, month)
        } else {
            await saveDirectCost(clientId, month)
        }
    }

    async function saveFee(clientId: string, month: number) {
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
                    toast.error('Error al eliminar')
                    return
                }
                toast.success('Ingreso eliminado')
            }

            setEditingCell(null)
            loadData()
            return
        }

        const newFee = parseFloat(editValue)

        if (isNaN(newFee) || newFee < 0) {
            toast.error('Por favor ingresa un número válido')
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
                toast.error('Error al actualizar')
                return
            }
            toast.success('Ingreso actualizado')
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
                toast.error('Error al crear')
                return
            }
            toast.success('Ingreso creado')
        }

        setEditingCell(null)
        loadData()
    }

    async function saveDirectCost(clientId: string, month: number) {
        // If empty or 0, delete the cost
        if (editValue.trim() === '' || parseFloat(editValue) === 0) {
            const row = clientRows.find(r => r.client.id === clientId)
            const existingCost = row?.directCosts.get(month)

            if (existingCost) {
                const response = await fetch(`/api/client-direct-costs?id=${existingCost.id}`, {
                    method: 'DELETE'
                })

                if (!response.ok) {
                    toast.error('Error al eliminar')
                    return
                }
                toast.success('Gasto directo eliminado')
            }

            setEditingCell(null)
            loadData()
            return
        }

        const newAmount = parseFloat(editValue)

        if (isNaN(newAmount) || newAmount < 0) {
            toast.error('Por favor ingresa un número válido')
            return
        }

        const response = await fetch('/api/client-direct-costs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                month,
                year: currentYear,
                amount: newAmount
            })
        })

        if (!response.ok) {
            toast.error('Error al guardar')
            return
        }

        toast.success('Gasto directo guardado')
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

    function getDirectCostForMonth(row: ClientRow, month: number): number | null {
        const cost = row.directCosts.get(month)
        return cost ? cost.amount : null
    }

    function hasFee(row: ClientRow, month: number): boolean {
        return row.monthlyFees.has(month)
    }

    function hasDirectCost(row: ClientRow, month: number): boolean {
        return row.directCosts.has(month)
    }

    async function handleOpCostClick(month: number) {
        const currentCost = operationalCosts.get(month)?.amount
        setEditingOpCost(month)
        setEditOpCostValue(currentCost?.toString() || '')
    }

    async function handleOpCostSave() {
        if (editingOpCost === null) return

        const month = editingOpCost

        // If empty or 0, delete
        if (editOpCostValue.trim() === '' || parseFloat(editOpCostValue) === 0) {
            const existingCost = operationalCosts.get(month)

            if (existingCost) {
                const response = await fetch(`/api/operational-costs?id=${existingCost.id}`, {
                    method: 'DELETE'
                })

                if (!response.ok) {
                    toast.error('Error al eliminar')
                    return
                }
                toast.success('Gasto operativo eliminado')
            }

            setEditingOpCost(null)
            loadData()
            return
        }

        const newAmount = parseFloat(editOpCostValue)

        if (isNaN(newAmount) || newAmount < 0) {
            toast.error('Por favor ingresa un número válido')
            return
        }

        const response = await fetch('/api/operational-costs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                month,
                year: currentYear,
                amount: newAmount
            })
        })

        if (!response.ok) {
            toast.error('Error al guardar')
            return
        }

        toast.success('Gasto operativo guardado')
        setEditingOpCost(null)
        loadData()
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
                        <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes & Costes</h1>
                        <p className="text-gray-600 mt-1">
                            {clientRows.length} clientes • {currentYear}
                        </p>
                    </div>

                    <Button onClick={() => setShowAddDialog(true)}>
                        ➕ Nuevo Cliente
                    </Button>
                </div>

                {/* Operational Costs Section */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                    <h2 className="text-lg font-bold text-amber-900 mb-3">💰 Gastos Operativos Generales por Mes</h2>
                    <p className="text-sm text-amber-700 mb-4">
                        Costes fijos de la empresa que no se asignan a un cliente específico. Haz clic en cada mes para editar.
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {months.map(month => {
                            const cost = operationalCosts.get(month)
                            const hasCost = operationalCosts.has(month)
                            const isEditing = editingOpCost === month

                            return (
                                <div key={month} className={`p-3 rounded-lg border-2 transition-all ${
                                    hasCost ? 'bg-amber-100 border-amber-300' : 'bg-white border-amber-200'
                                }`}>
                                    <p className="text-xs font-medium text-amber-900 mb-1">
                                        {getMonthName(month)}
                                    </p>
                                    {isEditing ? (
                                        <Input
                                            type="number"
                                            value={editOpCostValue}
                                            onChange={(e) => setEditOpCostValue(e.target.value)}
                                            onBlur={handleOpCostSave}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleOpCostSave()
                                                if (e.key === 'Escape') setEditingOpCost(null)
                                            }}
                                            className="w-full text-sm h-8"
                                            placeholder="0 €"
                                            autoFocus
                                        />
                                    ) : hasCost ? (
                                        <button
                                            onClick={() => handleOpCostClick(month)}
                                            className="text-amber-900 font-bold hover:underline w-full text-left text-sm"
                                        >
                                            {formatCurrency(cost?.amount || 0)}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleOpCostClick(month)}
                                            className="text-amber-400 hover:text-amber-600 w-full text-left text-sm"
                                        >
                                            0 €
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                        💡 <strong>Haz clic en cualquier celda</strong> para editar.
                        Las celdas con <span className="font-bold text-blue-700">Ingresos</span> aparecen en azul,
                        las de <span className="font-bold text-purple-700">Gastos Directos</span> en morado.
                        Para <strong>eliminar un valor</strong>, edita la celda y deja el campo vacío o escribe 0.
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
                                    <th key={month} className="px-2 py-3 text-center text-sm font-semibold text-gray-900 min-w-[140px]">
                                        <div>{getMonthName(month).slice(0, 3)}</div>
                                        <div className="flex gap-1 justify-center mt-1">
                                            <span className="text-xs font-normal text-blue-700">Ing</span>
                                            <span className="text-xs font-normal text-gray-400">|</span>
                                            <span className="text-xs font-normal text-purple-700">Gas</span>
                                        </div>
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
                                        const directCost = getDirectCostForMonth(row, month)
                                        const hasFeeValue = hasFee(row, month)
                                        const hasCostValue = hasDirectCost(row, month)
                                        const isEditingFee = editingCell?.clientId === row.client.id && editingCell?.month === month && editingCell?.type === 'fee'
                                        const isEditingCost = editingCell?.clientId === row.client.id && editingCell?.month === month && editingCell?.type === 'cost'

                                        return (
                                            <td key={month} className="px-2 py-2 text-center text-sm">
                                                <div className="flex flex-col gap-1">
                                                    {/* Fee (Ingreso) */}
                                                    <div className={`transition-colors rounded px-1 ${hasFeeValue ? 'bg-blue-50' : 'hover:bg-gray-100'}`}>
                                                        {isEditingFee ? (
                                                            <Input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={handleCellSave}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleCellSave()
                                                                    if (e.key === 'Escape') setEditingCell(null)
                                                                }}
                                                                className="w-full text-xs h-7"
                                                                placeholder="Ing €"
                                                                autoFocus
                                                            />
                                                        ) : hasFeeValue ? (
                                                            <button
                                                                onClick={() => handleCellClick(row.client.id, month, 'fee')}
                                                                className="text-blue-900 font-semibold hover:underline w-full text-xs py-1"
                                                            >
                                                                {fee?.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleCellClick(row.client.id, month, 'fee')}
                                                                className="text-gray-400 hover:text-gray-600 w-full text-xs py-1"
                                                            >
                                                                —
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Direct Cost (Gasto) */}
                                                    <div className={`transition-colors rounded px-1 ${hasCostValue ? 'bg-purple-50' : 'hover:bg-gray-100'}`}>
                                                        {isEditingCost ? (
                                                            <Input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={handleCellSave}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleCellSave()
                                                                    if (e.key === 'Escape') setEditingCell(null)
                                                                }}
                                                                className="w-full text-xs h-7"
                                                                placeholder="Gas €"
                                                                autoFocus
                                                            />
                                                        ) : hasCostValue ? (
                                                            <button
                                                                onClick={() => handleCellClick(row.client.id, month, 'cost')}
                                                                className="text-purple-900 font-semibold hover:underline w-full text-xs py-1"
                                                            >
                                                                {directCost?.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleCellClick(row.client.id, month, 'cost')}
                                                                className="text-gray-400 hover:text-gray-600 w-full text-xs py-1"
                                                            >
                                                                —
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        )
                                    })}
                                    <td className="px-4 py-3 text-center sticky right-0 bg-white">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    🗑️
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
