'use client'

import { formatCurrency, formatHours, formatNumber } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

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

export function ProfitabilityTable({ data }: Props) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    // Sort by real margin descending (best performing clients first)
    const sortedData = [...data].sort((a, b) => b.realMargin - a.realMargin)

    const toggleRow = (clientId: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId)
        } else {
            newExpanded.add(clientId)
        }
        setExpandedRows(newExpanded)
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Rentabilidad por Cliente (Costes Reales)</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Costes calculados basados en el coste/hora real de cada empleado
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                        <tr>
                            <th className="px-6 py-3 w-8"></th>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3 text-right">Facturación</th>
                            <th className="px-6 py-3 text-right">Horas<br/><span className="text-xs font-normal text-gray-500">(Est. / Real)</span></th>
                            <th className="px-6 py-3 text-right">Desviación</th>
                            <th className="px-6 py-3 text-right">Coste Real</th>
                            <th className="px-6 py-3 text-right">Margen</th>
                            <th className="px-6 py-3 text-right">Rentabilidad</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                    No hay datos para mostrar.
                                </td>
                            </tr>
                        ) : sortedData.map((item) => {
                            const isExpanded = expandedRows.has(item.clientId)
                            const hasEmployees = item.employeeBreakdown && item.employeeBreakdown.length > 0

                            return (
                                <>
                                    <tr key={item.clientId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
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
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {item.clientName}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {formatCurrency(item.revenue)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-gray-400">{formatHours(item.estimatedHours)}</span>
                                                <span className="font-medium">{formatHours(item.actualHours)}</span>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 text-right text-xs ${
                                            item.hoursDeviation < 0 ? 'text-red-600 font-medium' : 
                                            item.hoursDeviation > 0 ? 'text-green-600' : 
                                            'text-gray-500'
                                        }`}>
                                            {item.hoursDeviation >= 0 ? '+' : ''}{formatHours(item.hoursDeviation)}
                                            <br/>
                                            <span className="text-xs">
                                                ({item.hoursDeviationPercent >= 0 ? '+' : ''}{formatNumber(item.hoursDeviationPercent, 0)}%)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {formatCurrency(item.realCost)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-medium ${
                                            item.realMargin >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {formatCurrency(item.realMargin)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`font-medium ${
                                                    item.realMarginPercent >= 50 ? 'text-green-600' :
                                                    item.realMarginPercent >= 20 ? 'text-blue-600' :
                                                    item.realMarginPercent >= 0 ? 'text-orange-500' : 'text-red-600'
                                                }`}>
                                                    {formatNumber(item.realMarginPercent, 1)}%
                                                </span>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            item.realMarginPercent >= 50 ? 'bg-green-500' :
                                                            item.realMarginPercent >= 20 ? 'bg-blue-500' :
                                                            item.realMarginPercent >= 0 ? 'bg-orange-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.max(0, Math.min(100, item.realMarginPercent))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Employee Breakdown Row */}
                                    {isExpanded && hasEmployees && (
                                        <tr key={`${item.clientId}-breakdown`} className="bg-gray-50">
                                            <td colSpan={8} className="px-6 py-4">
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
