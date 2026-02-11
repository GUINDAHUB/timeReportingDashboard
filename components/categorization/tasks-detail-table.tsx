'use client'

import { useState } from 'react'
import { formatHours, formatNumber } from '@/lib/utils'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface TaskDetail {
    id: string
    taskName: string
    employeeName: string
    clientName: string
    categoryName: string
    categoryEmoji: string | null
    categoryColor: string
    hours: number
    date: string
}

interface Props {
    data: TaskDetail[]
}

type SortField = 'taskName' | 'employeeName' | 'clientName' | 'categoryName' | 'hours' | 'date'
type SortDirection = 'asc' | 'desc'

export function TasksDetailTable({ data }: Props) {
    const [sortField, setSortField] = useState<SortField>('date')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const sortedData = [...data].sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        if (sortField === 'hours') {
            aValue = a.hours
            bValue = b.hours
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc' 
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue)
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }

        return 0
    })

    const totalPages = Math.ceil(sortedData.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage)

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-4 h-4 text-gray-400" />
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="w-4 h-4 text-blue-600" />
            : <ArrowDown className="w-4 h-4 text-blue-600" />
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Detalle de Tareas</h3>
                <p className="text-sm text-gray-500 mt-1">
                    {data.length} {data.length === 1 ? 'tarea registrada' : 'tareas registradas'}
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                        <tr>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('taskName')}
                            >
                                <div className="flex items-center gap-2">
                                    Tarea
                                    <SortIcon field="taskName" />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('categoryName')}
                            >
                                <div className="flex items-center gap-2">
                                    Categoría
                                    <SortIcon field="categoryName" />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('employeeName')}
                            >
                                <div className="flex items-center gap-2">
                                    Persona
                                    <SortIcon field="employeeName" />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('clientName')}
                            >
                                <div className="flex items-center gap-2">
                                    Cliente
                                    <SortIcon field="clientName" />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors text-right"
                                onClick={() => handleSort('hours')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    Horas
                                    <SortIcon field="hours" />
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center gap-2">
                                    Fecha
                                    <SortIcon field="date" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No hay tareas para mostrar.
                                </td>
                            </tr>
                        ) : paginatedData.map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900 max-w-xs truncate" title={task.taskName}>
                                        {task.taskName}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: task.categoryColor }}
                                        />
                                        {task.categoryEmoji && <span>{task.categoryEmoji}</span>}
                                        <span className="text-gray-900">{task.categoryName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {task.employeeName}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {task.clientName || '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                    {formatHours(task.hours)}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {new Date(task.date).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, data.length)} de {data.length}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
