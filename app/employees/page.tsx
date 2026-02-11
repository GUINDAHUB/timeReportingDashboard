'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Employee, EmployeeMonthlyCost } from '@/lib/types'
import { formatCurrency, getMonthName } from '@/lib/utils'
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

interface EmployeeRow {
    employee: Employee
    monthlyCosts: Map<number, EmployeeMonthlyCost> // month (1-12) -> cost
}

interface EditingCell {
    employeeId: string
    month: number
    field: 'salary' | 'hours'
}

interface NewEmployeeData {
    name: string
    salary: string
    hours: string
}

export default function EmployeesPage() {
    const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([])
    const [loading, setLoading] = useState(true)
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
    const [editValue, setEditValue] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showSyncDialog, setShowSyncDialog] = useState(false)
    const [showSyncConfigDialog, setShowSyncConfigDialog] = useState(false)
    const [syncResult, setSyncResult] = useState<{ created: number; existing: string[] } | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [newEmployeesData, setNewEmployeesData] = useState<NewEmployeeData[]>([])
    const [newEmployeeName, setNewEmployeeName] = useState('')
    const [newEmployeeSalary, setNewEmployeeSalary] = useState('')
    const [newEmployeeHours, setNewEmployeeHours] = useState('160')
    const currentYear = new Date().getFullYear()

    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)

        // Load employees
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (employeesError) {
            console.error('Error loading employees:', employeesError)
            setLoading(false)
            return
        }

        // Load all monthly costs for current year
        const { data: costs, error: costsError } = await supabase
            .from('employee_monthly_costs')
            .select('*')
            .eq('year', currentYear)

        if (costsError) {
            console.error('Error loading costs:', costsError)
        }

        // Build rows
        const rows: EmployeeRow[] = (employees || []).map(employee => {
            const monthlyCosts = new Map<number, EmployeeMonthlyCost>()

            costs?.forEach(cost => {
                if (cost.employee_id === employee.id) {
                    monthlyCosts.set(cost.month, cost)
                }
            })

            return { employee, monthlyCosts }
        })

        setEmployeeRows(rows)
        setLoading(false)
    }

    async function handleCellClick(employeeId: string, month: number, field: 'salary' | 'hours') {
        const row = employeeRows.find(r => r.employee.id === employeeId)
        const currentCost = row?.monthlyCosts.get(month)
        
        let currentValue = ''
        if (currentCost) {
            currentValue = field === 'salary' ? currentCost.monthly_salary.toString() : currentCost.monthly_hours.toString()
        } else {
            // Use employee default values
            currentValue = field === 'salary' ? row?.employee.monthly_salary.toString() || '' : row?.employee.monthly_hours.toString() || ''
        }

        setEditingCell({ employeeId, month, field })
        setEditValue(currentValue)
    }

    async function handleCellSave() {
        if (!editingCell) return

        const { employeeId, month, field } = editingCell

        // Parse the new value
        const newValue = parseFloat(editValue)

        if (isNaN(newValue) || newValue < 0) {
            alert('Por favor ingresa un número válido')
            return
        }

        // Find existing cost entry
        const row = employeeRows.find(r => r.employee.id === employeeId)
        const existingCost = row?.monthlyCosts.get(month)

        // Prepare the data
        const otherFieldValue = existingCost 
            ? (field === 'salary' ? existingCost.monthly_hours : existingCost.monthly_salary)
            : (field === 'salary' ? row?.employee.monthly_hours : row?.employee.monthly_salary) || 0

        const salary = field === 'salary' ? newValue : otherFieldValue
        const hours = field === 'hours' ? newValue : otherFieldValue
        const hourlyCost = hours > 0 ? salary / hours : 0

        if (existingCost) {
            // Update existing
            const { error } = await supabase
                .from('employee_monthly_costs')
                .update({
                    monthly_salary: salary,
                    monthly_hours: hours,
                    hourly_cost: hourlyCost,
                })
                .eq('id', existingCost.id)

            if (error) {
                console.error('Error updating cost:', error)
                alert('Error al actualizar')
                return
            }
        } else {
            // Insert new
            const { error } = await supabase
                .from('employee_monthly_costs')
                .insert({
                    employee_id: employeeId,
                    month,
                    year: currentYear,
                    monthly_salary: salary,
                    monthly_hours: hours,
                    hourly_cost: hourlyCost,
                })

            if (error) {
                console.error('Error inserting cost:', error)
                alert('Error al crear')
                return
            }
        }

        setEditingCell(null)
        loadData()
    }

    async function handleDeleteEmployee(employeeId: string) {
        const { error } = await supabase
            .from('employees')
            .update({ is_active: false })
            .eq('id', employeeId)

        if (error) {
            console.error('Error deleting employee:', error)
            alert('Error al eliminar empleado')
            return
        }

        loadData()
    }

    async function handleAddEmployee() {
        if (!newEmployeeName.trim()) {
            alert('El nombre es requerido')
            return
        }

        const salary = parseFloat(newEmployeeSalary)
        const hours = parseFloat(newEmployeeHours)

        if (isNaN(salary) || salary < 0) {
            alert('El salario debe ser un número válido')
            return
        }

        if (isNaN(hours) || hours <= 0) {
            alert('Las horas deben ser un número válido mayor a 0')
            return
        }

        const hourlyCost = salary / hours

        // Check if an employee with this name already exists (even if inactive)
        const { data: existingEmployee, error: checkError } = await supabase
            .from('employees')
            .select('*')
            .eq('name', newEmployeeName.trim())
            .single()

        if (existingEmployee) {
            // Employee exists - reactivate and update it
            const { error } = await supabase
                .from('employees')
                .update({
                    is_active: true,
                    monthly_salary: salary,
                    monthly_hours: hours,
                    hourly_cost: hourlyCost,
                })
                .eq('id', existingEmployee.id)

            if (error) {
                console.error('Error reactivating employee:', error)
                alert('Error al reactivar empleado: ' + error.message)
                return
            }

            setShowAddDialog(false)
            setNewEmployeeName('')
            setNewEmployeeSalary('')
            setNewEmployeeHours('160')
            loadData()
            return
        }

        // Employee doesn't exist - create new
        const { error } = await supabase
            .from('employees')
            .insert({
                name: newEmployeeName.trim(),
                monthly_salary: salary,
                monthly_hours: hours,
                hourly_cost: hourlyCost,
            })

        if (error) {
            console.error('Error adding employee:', error)
            alert('Error al crear empleado: ' + error.message)
            return
        }

        setShowAddDialog(false)
        setNewEmployeeName('')
        setNewEmployeeSalary('')
        setNewEmployeeHours('160')
        loadData()
    }

    async function handleSyncEmployees() {
        setSyncing(true)
        
        try {
            // 1. Get all unique employee names from time_entries
            const { data: timeEntries, error: timeEntriesError } = await supabase
                .from('time_entries')
                .select('employee_name')
            
            if (timeEntriesError) {
                console.error('Error fetching time entries:', timeEntriesError)
                alert('Error al cargar entradas de tiempo')
                setSyncing(false)
                return
            }

            // Get unique employee names
            const uniqueEmployeeNames = Array.from(
                new Set(timeEntries?.map(entry => entry.employee_name).filter(name => name && name.trim() !== ''))
            ).sort()

            if (uniqueEmployeeNames.length === 0) {
                alert('No se encontraron empleados en las entradas de tiempo')
                setSyncing(false)
                return
            }

            // 2. Get only ACTIVE employees
            const { data: existingEmployees, error: employeesError } = await supabase
                .from('employees')
                .select('name')
                .eq('is_active', true)

            if (employeesError) {
                console.error('Error fetching employees:', employeesError)
                alert('Error al cargar empleados existentes')
                setSyncing(false)
                return
            }

            const existingActiveNames = new Set(existingEmployees?.map(emp => emp.name) || [])

            // 3. Find employees that don't exist or are inactive
            const newEmployeeNames = uniqueEmployeeNames.filter(name => !existingActiveNames.has(name))

            if (newEmployeeNames.length === 0) {
                setSyncResult({ created: 0, existing: uniqueEmployeeNames })
                setShowSyncDialog(true)
                setSyncing(false)
                return
            }

            // 4. Prepare data for configuration dialog
            const employeesData: NewEmployeeData[] = newEmployeeNames.map(name => ({
                name,
                salary: '',
                hours: '160'
            }))

            setNewEmployeesData(employeesData)
            setShowSyncConfigDialog(true)

        } catch (error) {
            console.error('Unexpected error during sync:', error)
            alert('Error inesperado durante la sincronización')
        } finally {
            setSyncing(false)
        }
    }

    async function handleCreateSyncedEmployees() {
        // Validate all entries
        for (const emp of newEmployeesData) {
            const salary = parseFloat(emp.salary)
            const hours = parseFloat(emp.hours)

            if (isNaN(salary) || salary < 0) {
                alert(`El salario de ${emp.name} debe ser un número válido`)
                return
            }

            if (isNaN(hours) || hours <= 0) {
                alert(`Las horas de ${emp.name} deben ser un número válido mayor a 0`)
                return
            }
        }

        setSyncing(true)

        try {
            let createdCount = 0
            let reactivatedCount = 0

            // Process each employee: check if exists (active or inactive)
            for (const emp of newEmployeesData) {
                const salary = parseFloat(emp.salary)
                const hours = parseFloat(emp.hours)
                const hourlyCost = salary / hours

                // Check if employee exists (including inactive)
                const { data: existingEmployee } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('name', emp.name)
                    .single()

                if (existingEmployee) {
                    // Employee exists (probably inactive) - reactivate and update
                    const { error } = await supabase
                        .from('employees')
                        .update({
                            is_active: true,
                            monthly_salary: salary,
                            monthly_hours: hours,
                            hourly_cost: hourlyCost,
                        })
                        .eq('id', existingEmployee.id)

                    if (error) {
                        console.error('Error reactivating employee:', error)
                        alert(`Error al reactivar ${emp.name}: ${error.message}`)
                        setSyncing(false)
                        return
                    }
                    reactivatedCount++
                } else {
                    // Employee doesn't exist - create new
                    const { error } = await supabase
                        .from('employees')
                        .insert({
                            name: emp.name,
                            monthly_salary: salary,
                            monthly_hours: hours,
                            hourly_cost: hourlyCost,
                            is_active: true
                        })

                    if (error) {
                        console.error('Error creating employee:', error)
                        alert(`Error al crear ${emp.name}: ${error.message}`)
                        setSyncing(false)
                        return
                    }
                    createdCount++
                }
            }

            // Show result and reload data
            setSyncResult({
                created: createdCount + reactivatedCount,
                existing: []
            })
            setShowSyncConfigDialog(false)
            setShowSyncDialog(true)
            setNewEmployeesData([])
            loadData()

        } catch (error) {
            console.error('Unexpected error creating employees:', error)
            alert('Error inesperado al crear empleados')
        } finally {
            setSyncing(false)
        }
    }

    function updateEmployeeData(index: number, field: 'salary' | 'hours', value: string) {
        const updated = [...newEmployeesData]
        updated[index][field] = value
        setNewEmployeesData(updated)
    }

    function getCostForMonth(row: EmployeeRow, month: number): EmployeeMonthlyCost | null {
        return row.monthlyCosts.get(month) || null
    }

    function getDisplayValue(row: EmployeeRow, month: number, field: 'salary' | 'hours' | 'cost'): number {
        const monthlyCost = row.monthlyCosts.get(month)
        
        if (monthlyCost) {
            if (field === 'salary') return monthlyCost.monthly_salary
            if (field === 'hours') return monthlyCost.monthly_hours
            if (field === 'cost') return monthlyCost.hourly_cost
        }
        
        // Use employee defaults
        if (field === 'salary') return row.employee.monthly_salary
        if (field === 'hours') return row.employee.monthly_hours
        if (field === 'cost') return row.employee.hourly_cost
        
        return 0
    }

    function hasOverride(row: EmployeeRow, month: number): boolean {
        return row.monthlyCosts.has(month)
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p className="text-center text-gray-600">Cargando empleados...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestión de Empleados</h1>
                        <p className="text-gray-600 mt-1">
                            {employeeRows.length} empleados • {currentYear}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            onClick={handleSyncEmployees}
                            disabled={syncing}
                        >
                            {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar desde Time Entries'}
                        </Button>
                        <Button onClick={() => setShowAddDialog(true)}>
                            ➕ Nuevo Empleado
                        </Button>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-blue-900">
                        🔄 <strong>Sincronizar desde Time Entries:</strong> Detecta automáticamente los empleados de las entradas de tiempo importadas y permite configurar su salario y horas. Si un empleado fue eliminado previamente, será reactivado.
                    </p>
                    <p className="text-sm text-blue-900">
                        💡 <strong>Haz clic en cualquier celda</strong> para configurar el coste de ese empleado en ese mes específico.
                    </p>
                    <p className="text-sm text-blue-900">
                        Las celdas con valores personalizados aparecen en <span className="font-bold text-blue-700">azul</span>. 
                        Las celdas grises usan los valores por defecto del empleado.
                    </p>
                    <p className="text-sm text-blue-900">
                        El <strong>coste/hora</strong> se calcula automáticamente como: salario mensual ÷ horas mensuales.
                    </p>
                    <p className="text-sm text-blue-900">
                        ℹ️ <strong>Nota:</strong> Eliminar un empleado lo desactiva pero mantiene su historial. Puedes reactivarlo creándolo de nuevo.
                    </p>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[150px]" rowSpan={2}>
                                    Empleado
                                </th>
                                {months.map(month => (
                                    <th key={month} colSpan={3} className="px-2 py-2 text-center font-semibold text-gray-900 border-l min-w-[240px]">
                                        {getMonthName(month).slice(0, 3)}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center font-semibold text-gray-900 sticky right-0 bg-gray-50 z-10 min-w-[100px]" rowSpan={2}>
                                    Acciones
                                </th>
                            </tr>
                            <tr>
                                {months.map(month => (
                                    <React.Fragment key={month}>
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-l bg-gray-50">
                                            Salario
                                        </th>
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-gray-50">
                                            Horas
                                        </th>
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-gray-50">
                                            €/h
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {employeeRows.map(row => (
                                <tr key={row.employee.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                                        {row.employee.name}
                                    </td>
                                    {months.map(month => {
                                        const hasCustom = hasOverride(row, month)
                                        const salary = getDisplayValue(row, month, 'salary')
                                        const hours = getDisplayValue(row, month, 'hours')
                                        const cost = getDisplayValue(row, month, 'cost')

                                        const isEditingSalary = editingCell?.employeeId === row.employee.id && 
                                                               editingCell?.month === month && 
                                                               editingCell?.field === 'salary'
                                        const isEditingHours = editingCell?.employeeId === row.employee.id && 
                                                              editingCell?.month === month && 
                                                              editingCell?.field === 'hours'

                                        return (
                                            <React.Fragment key={month}>
                                                {/* Salary */}
                                                <td className={`px-2 py-2 text-center border-l text-xs ${
                                                    hasCustom ? 'bg-blue-50' : 'bg-gray-50'
                                                }`}>
                                                    {isEditingSalary ? (
                                                        <Input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleCellSave}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleCellSave()
                                                                if (e.key === 'Escape') setEditingCell(null)
                                                            }}
                                                            className="w-full text-xs h-7 px-1"
                                                            placeholder="Salario"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCellClick(row.employee.id, month, 'salary')}
                                                            className={`w-full hover:underline ${
                                                                hasCustom ? 'text-blue-900 font-semibold' : 'text-gray-600'
                                                            }`}
                                                        >
                                                            {formatCurrency(salary)}
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Hours */}
                                                <td className={`px-2 py-2 text-center text-xs ${
                                                    hasCustom ? 'bg-blue-50' : 'bg-gray-50'
                                                }`}>
                                                    {isEditingHours ? (
                                                        <Input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleCellSave}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleCellSave()
                                                                if (e.key === 'Escape') setEditingCell(null)
                                                            }}
                                                            className="w-full text-xs h-7 px-1"
                                                            placeholder="Horas"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCellClick(row.employee.id, month, 'hours')}
                                                            className={`w-full hover:underline ${
                                                                hasCustom ? 'text-blue-900 font-semibold' : 'text-gray-600'
                                                            }`}
                                                        >
                                                            {hours.toFixed(0)}h
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Hourly Cost (calculated, read-only) */}
                                                <td className={`px-2 py-2 text-center text-xs font-medium ${
                                                    hasCustom ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {formatCurrency(cost)}/h
                                                </td>
                                            </React.Fragment>
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
                                                    <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        ¿Estás seguro de que quieres eliminar a <strong>{row.employee.name}</strong>?
                                                        Se desactivará el empleado y sus datos históricos se mantendrán.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteEmployee(row.employee.id)}>
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

                {employeeRows.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-600">No hay empleados. Añade tu primer empleado.</p>
                    </div>
                )}
            </div>

            {/* Add Employee Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Empleado</DialogTitle>
                        <DialogDescription>
                            Añade un nuevo empleado con su salario y horas mensuales. El coste por hora se calculará automáticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Nombre del Empleado
                            </label>
                            <Input
                                value={newEmployeeName}
                                onChange={(e) => setNewEmployeeName(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Salario Mensual (€)
                            </label>
                            <Input
                                type="number"
                                value={newEmployeeSalary}
                                onChange={(e) => setNewEmployeeSalary(e.target.value)}
                                placeholder="Ej: 2500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Horas Mensuales
                            </label>
                            <Input
                                type="number"
                                value={newEmployeeHours}
                                onChange={(e) => setNewEmployeeHours(e.target.value)}
                                placeholder="Ej: 160"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Por defecto: 160h (40h/semana × 4 semanas)
                            </p>
                        </div>

                        {newEmployeeSalary && newEmployeeHours && !isNaN(parseFloat(newEmployeeSalary)) && !isNaN(parseFloat(newEmployeeHours)) && parseFloat(newEmployeeHours) > 0 && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-900">
                                    <strong>Coste por hora:</strong> {formatCurrency(parseFloat(newEmployeeSalary) / parseFloat(newEmployeeHours))}/h
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddEmployee}>
                            Crear Empleado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sync Configuration Dialog */}
            <Dialog open={showSyncConfigDialog} onOpenChange={setShowSyncConfigDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Configurar Nuevos Empleados</DialogTitle>
                        <DialogDescription>
                            Se encontraron {newEmployeesData.length} empleado{newEmployeesData.length !== 1 ? 's' : ''} nuevo{newEmployeesData.length !== 1 ? 's' : ''} en las entradas de tiempo. 
                            Configura su salario y horas mensuales.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {newEmployeesData.map((emp, index) => (
                            <div key={emp.name} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                                        {index + 1}
                                    </div>
                                    <h4 className="font-semibold text-gray-900 flex-1">{emp.name}</h4>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                                            Salario Mensual (€)
                                        </label>
                                        <Input
                                            type="number"
                                            value={emp.salary}
                                            onChange={(e) => updateEmployeeData(index, 'salary', e.target.value)}
                                            placeholder="Ej: 2500"
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                                            Horas Mensuales
                                        </label>
                                        <Input
                                            type="number"
                                            value={emp.hours}
                                            onChange={(e) => updateEmployeeData(index, 'hours', e.target.value)}
                                            placeholder="Ej: 160"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {emp.salary && emp.hours && !isNaN(parseFloat(emp.salary)) && !isNaN(parseFloat(emp.hours)) && parseFloat(emp.hours) > 0 && (
                                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                        <p className="text-sm text-blue-900">
                                            <strong>Coste/hora:</strong> {formatCurrency(parseFloat(emp.salary) / parseFloat(emp.hours))}/h
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowSyncConfigDialog(false)
                                setNewEmployeesData([])
                            }}
                            disabled={syncing}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateSyncedEmployees}
                            disabled={syncing || newEmployeesData.some(emp => !emp.salary || !emp.hours)}
                        >
                            {syncing ? 'Creando...' : `Crear ${newEmployeesData.length} Empleado${newEmployeesData.length !== 1 ? 's' : ''}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sync Result Dialog */}
            <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resultado de la Sincronización</DialogTitle>
                        <DialogDescription>
                            Sincronización de empleados desde las entradas de tiempo completada
                        </DialogDescription>
                    </DialogHeader>

                    {syncResult && (
                        <div className="space-y-4 py-4">
                            {syncResult.created > 0 ? (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-green-900 font-semibold mb-2">
                                        ✅ Se procesaron {syncResult.created} empleado{syncResult.created !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-sm text-green-800">
                                        Los empleados se han creado o reactivado con los salarios y horas configurados. 
                                        Puedes ajustar los valores mensuales haciendo clic en las celdas de la tabla.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-blue-900 font-semibold mb-2">
                                        ℹ️ No se procesaron nuevos empleados
                                    </p>
                                    <p className="text-sm text-blue-800">
                                        Todos los empleados de las entradas de tiempo ya están activos en el sistema.
                                    </p>
                                </div>
                            )}

                            {syncResult.existing.length > 0 && (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <p className="text-sm text-gray-700 font-medium mb-2">
                                        Empleados existentes: {syncResult.existing.length}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {syncResult.existing.slice(0, 10).map(name => (
                                            <span 
                                                key={name} 
                                                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700"
                                            >
                                                {name}
                                            </span>
                                        ))}
                                        {syncResult.existing.length > 10 && (
                                            <span className="px-2 py-1 text-xs text-gray-500">
                                                +{syncResult.existing.length - 10} más
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => {
                            setShowSyncDialog(false)
                            setSyncResult(null)
                        }}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
