'use client'

import { formatCurrency, formatHours, formatNumber } from '@/lib/utils'
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ClientProfitability {
    clientId: string
    clientName: string
    revenue: number
    estimatedHours: number
    actualHours: number
    hoursDeviation: number
    hoursDeviationPercent: number
    realCost: number
    estimatedCost: number
    directCosts: number
    totalDirectCosts: number
    operationalCosts: number
    grossMargin: number
    grossMarginPercent: number
    netMargin: number
    netMarginPercent: number
    realMargin: number
    realMarginPercent: number
    employeeBreakdown?: Array<{
        employee_name: string
        hours: number
        hourly_cost: number
        total_cost: number
    }>
}

interface Props {
    data: ClientProfitability[]
}

type SortKey = keyof ClientProfitability
type SortDirection = 'asc' | 'desc'

const SORT_KEY_STORAGE_KEY = 'profitability-table-sort-key'
const SORT_DIRECTION_STORAGE_KEY = 'profitability-table-sort-direction'

export function ProfitabilityTable({ data }: Props) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    
    // Cargar preferencias de ordenamiento desde localStorage
    const [sortKey, setSortKey] = useState<SortKey>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(SORT_KEY_STORAGE_KEY)
            return (saved as SortKey) || 'netMargin'
        }
        return 'netMargin'
    })
    
    const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(SORT_DIRECTION_STORAGE_KEY)
            return (saved as SortDirection) || 'desc'
        }
        return 'desc'
    })

    // Guardar preferencias en localStorage cuando cambien
    useEffect(() => {
        localStorage.setItem(SORT_KEY_STORAGE_KEY, sortKey)
    }, [sortKey])

    useEffect(() => {
        localStorage.setItem(SORT_DIRECTION_STORAGE_KEY, sortDirection)
    }, [sortDirection])

    const toggleRow = (clientId: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId)
        } else {
            newExpanded.add(clientId)
        }
        setExpandedRows(newExpanded)
    }

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            // Si es la misma columna, alternar dirección
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            // Nueva columna, comenzar con descendente para números y ascendente para texto
            setSortKey(key)
            setSortDirection(key === 'clientName' ? 'asc' : 'desc')
        }
    }

    // Función de ordenamiento
    const sortedData = [...data].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]

        // Manejar valores undefined o null
        if (aVal === undefined || aVal === null) return 1
        if (bVal === undefined || bVal === null) return -1

        let comparison = 0

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            // Ordenamiento alfabético
            comparison = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            // Ordenamiento numérico
            comparison = aVal - bVal
        }

        return sortDirection === 'asc' ? comparison : -comparison
    })

    // Componente para el icono de ordenamiento
    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) {
            return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="w-3 h-3 text-blue-600" />
            : <ArrowDown className="w-3 h-3 text-blue-600" />
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Rentabilidad por Cliente</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Margen Neto = Ingresos - (Coste Personal + Gastos Directos + Gastos Operativos)
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                        <tr>
                            <th className="px-4 py-3 w-8"></th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('clientName')}
                            >
                                <div className="flex items-center gap-1">
                                    Cliente
                                    <SortIcon columnKey="clientName" />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('actualHours')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <span>Horas<br/>Invertidas</span>
                                    <SortIcon columnKey="actualHours" />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('revenue')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <span>Ingresos</span>
                                    <SortIcon columnKey="revenue" />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('realCost')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <span>Coste<br/>Personal</span>
                                    <SortIcon columnKey="realCost" />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('directCosts')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <span>Gastos<br/>Directos</span>
                                    <SortIcon columnKey="directCosts" />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('operationalCosts')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <span>Gastos<br/>Operativos</span>
                                    <SortIcon columnKey="operationalCosts" />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('netMargin')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <span>Margen<br/>Neto</span>
                                    <SortIcon columnKey="netMargin" />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('netMarginPercent')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <span>% Margen<br/>Neto</span>
                                    <SortIcon columnKey="netMarginPercent" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                    No hay datos para mostrar.
                                </td>
                            </tr>
                        ) : sortedData.map((item) => {
                            const isExpanded = expandedRows.has(item.clientId)
                            const hasEmployees = item.employeeBreakdown && item.employeeBreakdown.length > 0

                            return (
                                <>
                                    <tr key={item.clientId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4">
                                            {hasEmployees && (
                                                <button
                                                    onClick={() => toggleRow(item.clientId)}
                                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-gray-900">
                                            {item.clientName}
                                        </td>
                                        <td className="px-4 py-4 text-right text-orange-600 font-semibold">
                                            {formatHours(item.actualHours)}
                                        </td>
                                        <td className="px-4 py-4 text-right text-gray-700 font-semibold">
                                            {formatCurrency(item.revenue)}
                                        </td>
                                        <td className="px-4 py-4 text-right text-gray-600">
                                            {formatCurrency(item.realCost)}
                                        </td>
                                        <td className="px-4 py-4 text-right text-gray-600">
                                            {formatCurrency(item.directCosts)}
                                        </td>
                                        <td className="px-4 py-4 text-right text-purple-600 font-medium">
                                            {formatCurrency(item.operationalCosts)}
                                        </td>
                                        <td className={`px-4 py-4 text-right font-bold ${
                                            item.netMargin >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {formatCurrency(item.netMargin)}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {(() => {
                                                    const isNegativeMargin = item.netMargin < 0
                                                    const isNegativePercent = item.netMarginPercent < 0
                                                    const showRed = isNegativeMargin || isNegativePercent
                                                    const colorClass = showRed ? 'text-red-600' :
                                                        item.netMarginPercent >= 50 ? 'text-green-600' :
                                                        item.netMarginPercent >= 20 ? 'text-blue-600' : 'text-orange-500'
                                                    const barColorClass = showRed ? 'bg-red-500' :
                                                        item.netMarginPercent >= 50 ? 'bg-green-500' :
                                                        item.netMarginPercent >= 20 ? 'bg-blue-500' : 'bg-orange-500'
                                                    return (
                                                        <>
                                                            <span className={`font-bold text-lg ${colorClass}`}>
                                                                {formatNumber(item.netMarginPercent, 1)}%
                                                            </span>
                                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${barColorClass}`}
                                                                    style={{ width: `${Math.max(0, Math.min(100, item.netMarginPercent))}%` }}
                                                                />
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Employee Breakdown Row */}
                                    {isExpanded && hasEmployees && (
                                        <tr key={`${item.clientId}-breakdown`} className="bg-gray-50">
                                            <td colSpan={9} className="px-6 py-4">
                                                <div className="pl-10">
                                                    <p className="text-xs font-semibold text-gray-700 mb-3">
                                                        Desglose por Empleado:
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {item.employeeBreakdown?.map((emp, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">
                                                                        {emp.employee_name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {formatHours(emp.hours)} × {formatCurrency(emp.hourly_cost)}/h
                                                                    </p>
                                                                </div>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    {formatCurrency(emp.total_cost)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
