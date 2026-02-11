'use client'

import { useState, useEffect } from 'react'
import { UncategorizedTaskSummary, CategoryHierarchical } from '@/lib/types'
import { getUncategorizedTasks, assignCategoryToTask, bulkAssignCategories, learnFromAssignment } from '@/lib/services/uncategorized-tasks'
import { getCategoriesTree } from '@/lib/services/categorizer'
import { AlertCircle, CheckCircle, Filter, Search, Lightbulb } from 'lucide-react'

export default function UncategorizedTasksPage() {
    const [tasks, setTasks] = useState<UncategorizedTaskSummary[]>([])
    const [categories, setCategories] = useState<CategoryHierarchical[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
    const [filterStatus, setFilterStatus] = useState<'pending' | 'reviewed' | 'ignored' | 'all'>('pending')
    const [searchTerm, setSearchTerm] = useState('')
    const [assigningBulk, setAssigningBulk] = useState(false)

    useEffect(() => {
        loadData()
    }, [filterStatus])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [tasksData, categoriesData] = await Promise.all([
                getUncategorizedTasks(filterStatus),
                getCategoriesTree()
            ])
            setTasks(tasksData)
            setCategories(categoriesData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAssignCategory = async (taskId: string, categoryId: string, shouldLearn: boolean = false) => {
        try {
            const task = tasks.find(t => t.time_entry_id === taskId)
            if (!task) {
                alert('❌ No se encontró la tarea')
                return
            }

            await assignCategoryToTask(taskId, categoryId, 'admin', 'Manual assignment')

            if (shouldLearn) {
                try {
                    const result = await learnFromAssignment(task.task_name, categoryId)
                    if (result.created) {
                        alert(`✨ Keyword "${result.keyword}" añadida para futuras tareas similares`)
                    }
                } catch (error: any) {
                    console.error('Error learning from assignment:', error)
                    alert(`⚠️ Categoría asignada pero no se pudo crear keyword: ${error.message}`)
                }
            }

            await loadData()
            setSelectedTasks(new Set())
        } catch (error: any) {
            console.error('Error al asignar categoría:', error)
            const errorMessage = error.message || 'Error desconocido'
            alert(`❌ Error al asignar categoría:\n${errorMessage}\n\nRevisa la consola para más detalles.`)
        }
    }

    const handleBulkAssign = async (categoryId: string) => {
        if (selectedTasks.size === 0) return

        const confirmed = confirm(
            `¿Asignar la categoría seleccionada a ${selectedTasks.size} tarea(s)?`
        )
        if (!confirmed) return

        setAssigningBulk(true)
        try {
            const assignments = Array.from(selectedTasks).map(taskId => ({
                timeEntryId: taskId,
                categoryId
            }))

            const result = await bulkAssignCategories(assignments, 'admin')
            alert(`✅ ${result.success} tareas asignadas correctamente${result.failed > 0 ? `, ${result.failed} fallidas` : ''}`)
            
            await loadData()
            setSelectedTasks(new Set())
        } catch (error: any) {
            console.error('Error en asignación masiva:', error)
            const errorMessage = error.message || 'Error desconocido'
            alert(`❌ Error en asignación masiva:\n${errorMessage}\n\nRevisa la consola para más detalles.`)
        } finally {
            setAssigningBulk(false)
        }
    }

    const toggleTaskSelection = (taskId: string) => {
        const newSelected = new Set(selectedTasks)
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId)
        } else {
            newSelected.add(taskId)
        }
        setSelectedTasks(newSelected)
    }

    const selectAll = () => {
        if (selectedTasks.size === filteredTasks.length) {
            setSelectedTasks(new Set())
        } else {
            setSelectedTasks(new Set(filteredTasks.map(t => t.time_entry_id)))
        }
    }

    const filteredTasks = tasks.filter(task =>
        searchTerm === '' ||
        task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getChildCategories = () => {
        return categories.flatMap(parent => parent.children || [])
    }

    const pendingCount = tasks.filter(t => t.status === 'pending').length

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="w-8 h-8 text-orange-600" />
                                <h1 className="text-3xl font-bold">Tareas Sin Clasificar</h1>
                                {pendingCount > 0 && (
                                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                                        {pendingCount} pendientes
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-600">
                                Asigna categorías manualmente a tareas que no coincidieron con ninguna keyword
                            </p>
                        </div>
                    </div>

                    {/* Filters and search */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre de tarea o empleado..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="pending">Pendientes</option>
                                <option value="reviewed">Revisadas</option>
                                <option value="ignored">Ignoradas</option>
                                <option value="all">Todas</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk actions bar */}
            {selectedTasks.size > 0 && (
                <div className="bg-blue-600 text-white">
                    <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                        <span className="font-medium">
                            {selectedTasks.size} tarea(s) seleccionada(s)
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm mr-2">Asignar a:</span>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleBulkAssign(e.target.value)
                                        e.target.value = ''
                                    }
                                }}
                                disabled={assigningBulk}
                                className="px-4 py-1.5 bg-white text-gray-900 rounded-lg text-sm"
                            >
                                <option value="">Seleccionar categoría...</option>
                                {categories.map(parent => (
                                    <optgroup key={parent.id} label={`${parent.emoji} ${parent.name}`}>
                                        {(parent.children || []).map(child => (
                                            <option key={child.id} value={child.id}>
                                                {child.emoji} {child.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <button
                                onClick={() => setSelectedTasks(new Set())}
                                className="px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Cargando tareas...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">¡Todo clasificado!</h3>
                        <p className="text-gray-600">
                            {filterStatus === 'pending'
                                ? 'No hay tareas pendientes de clasificar.'
                                : 'No se encontraron tareas con este filtro.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                                                onChange={selectAll}
                                                className="rounded border-gray-300"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Tarea
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Empleado
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Fecha
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Horas
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Categoría
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredTasks.map((task) => (
                                        <TaskRow
                                            key={task.id}
                                            task={task}
                                            categories={categories}
                                            isSelected={selectedTasks.has(task.time_entry_id)}
                                            onToggleSelect={() => toggleTaskSelection(task.time_entry_id)}
                                            onAssign={handleAssignCategory}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function TaskRow({
    task,
    categories,
    isSelected,
    onToggleSelect,
    onAssign
}: {
    task: UncategorizedTaskSummary
    categories: CategoryHierarchical[]
    isSelected: boolean
    onToggleSelect: () => void
    onAssign: (taskId: string, categoryId: string, shouldLearn: boolean) => Promise<void>
}) {
    const [selectedCategory, setSelectedCategory] = useState('')
    const [shouldLearn, setShouldLearn] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)

    const handleAssign = async () => {
        if (!selectedCategory) return

        setIsAssigning(true)
        try {
            await onAssign(task.time_entry_id, selectedCategory, shouldLearn)
        } finally {
            setIsAssigning(false)
        }
    }

    return (
        <tr className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
            <td className="px-4 py-3">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                    className="rounded border-gray-300"
                />
            </td>
            <td className="px-4 py-3">
                <div className="font-medium text-sm">{task.task_name}</div>
                {task.client_name && (
                    <div className="text-xs text-gray-500 mt-1">{task.client_name}</div>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{task.employee_name}</td>
            <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(task.date).toLocaleDateString('es-ES')}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{task.duration_hours}h</td>
            <td className="px-4 py-3">
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isAssigning}
                >
                    <option value="">Seleccionar...</option>
                    {categories.map(parent => (
                        <optgroup key={parent.id} label={`${parent.emoji} ${parent.name}`}>
                            {(parent.children || []).map(child => (
                                <option key={child.id} value={child.id}>
                                    {child.emoji} {child.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer" title="Aprender keyword">
                        <input
                            type="checkbox"
                            checked={shouldLearn}
                            onChange={(e) => setShouldLearn(e.target.checked)}
                            className="rounded border-gray-300"
                            disabled={isAssigning}
                        />
                        <Lightbulb className="w-3 h-3" />
                    </label>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedCategory || isAssigning}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAssigning ? 'Asignando...' : 'Asignar'}
                    </button>
                </div>
            </td>
        </tr>
    )
}
