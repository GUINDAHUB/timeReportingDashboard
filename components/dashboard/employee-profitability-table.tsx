'use client'

import { formatCurrency, formatHours, formatNumber } from '@/lib/utils'
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { useState } from 'react'

interface EmployeeProfitability {
    employeeName: string
    totalHours: number
    expectedHours: number
    utilizationPercent: number
    employeeCost: number
    revenueGenerated: number
    marginGenerated: number
    profitabilityRatio: number
    clientsWorked: number
    avgHourlyCost: number
    clientBreakdown: Array<{
        clientName: string
        hours: number
        cost: number
        revenue: number
        margin: number
        clientFee?: number
        employeePercentage?: number
    }>
}

interface Props {
    data: EmployeeProfitability[]
    billingRate: number
}

type SortField = 'name' | 'hours' | 'margin' | 'profitability' | 'utilization'
type SortDirection = 'asc' | 'desc'

export function EmployeeProfitabilityTable({ data, billingRate }: Props) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [sortField, setSortField] = useState<SortField>('margin')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    const toggleRow = (employeeName: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(employeeName)) {
            newExpanded.delete(employeeName)
        } else {
            newExpanded.add(employeeName)
        }
        setExpandedRows(newExpanded)
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    // Sort data
    const sortedData = [...data].sort((a, b) => {
        let aValue: number, bValue: number

        switch (sortField) {
            case 'name':
                return sortDirection === 'asc' 
                    ? a.employeeName.localeCompare(b.employeeName)
                    : b.employeeName.localeCompare(a.employeeName)
            case 'hours':
                aValue = a.totalHours
                bValue = b.totalHours
                break
            case 'margin':
                aValue = a.marginGenerated
                bValue = b.marginGenerated
                break
            case 'profitability':
                aValue = a.profitabilityRatio
                bValue = b.profitabilityRatio
                break
            case 'utilization':
                aValue = a.utilizationPercent
                bValue = b.utilizationPercent
                break
            default:
                return 0
        }

        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null
        return sortDirection === 'asc' ? (
            <TrendingUp className="w-3 h-3 inline ml-1" />
        ) : (
            <TrendingDown className="w-3 h-3 inline ml-1" />
        )
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Rentabilidad por Empleado</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Análisis de costes reales vs ingresos distribuidos proporcionalmente según fees de clientes
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                        <tr>
                            <th className="px-6 py-3 w-8"></th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                Empleado <SortIcon field="name" />
                            </th>
                            <th 
                                className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('hours')}
                            >
                                Horas <SortIcon field="hours" />
                            </th>
                            <th 
                                className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('utilization')}
                            >
                                Utilización <SortIcon field="utilization" />
                            </th>
                            <th className="px-6 py-3 text-right">Coste</th>
                            <th className="px-6 py-3 text-right">Ingresos</th>
                            <th 
                                className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('margin')}
                            >
                                Margen <SortIcon field="margin" />
                            </th>
                            <th 
                                className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('profitability')}
                            >
                                ROI <SortIcon field="profitability" />
                            </th>
                            <th className="px-6 py-3 text-right">Clientes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                    No hay datos para mostrar.
                                </td>
                            </tr>
                        ) : sortedData.map((employee) => {
                            const isExpanded = expandedRows.has(employee.employeeName)
                            const hasClients = employee.clientBreakdown && employee.clientBreakdown.length > 0

                            return (
                                <>
                                    <tr key={employee.employeeName} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            {hasClients && (
                                                <button
                                                    onClick={() => toggleRow(employee.employeeName)}
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
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{employee.employeeName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {formatCurrency(employee.avgHourlyCost)}/h
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div>
                                                <p className="font-medium text-gray-900">{formatHours(employee.totalHours)}</p>
                                                <p className="text-xs text-gray-500">
                                                    de {formatHours(employee.expectedHours)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                employee.utilizationPercent >= 80 ? 'bg-green-100 text-green-700' :
                                                employee.utilizationPercent >= 50 ? 'bg-orange-100 text-orange-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {formatNumber(employee.utilizationPercent, 0)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {formatCurrency(employee.employeeCost)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {formatCurrency(employee.revenueGenerated)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-medium ${
                                            employee.marginGenerated >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {formatCurrency(employee.marginGenerated)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`font-semibold ${
                                                    employee.profitabilityRatio >= 2 ? 'text-green-600' :
                                                    employee.profitabilityRatio >= 1 ? 'text-blue-600' :
                                                    employee.profitabilityRatio >= 0.5 ? 'text-orange-500' :
                                                    'text-red-600'
                                                }`}>
                                                    {formatNumber(employee.profitabilityRatio, 2)}x
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {employee.clientsWorked}
                                        </td>
                                    </tr>

                                    {/* Client Breakdown Row */}
                                    {isExpanded && hasClients && (
                                        <tr key={`${employee.employeeName}-breakdown`} className="bg-gray-50">
                                            <td colSpan={9} className="px-6 py-4">
                                                <div className="pl-10">
                                                    <p className="text-xs font-semibold text-gray-700 mb-3">
                                                        Distribución por Cliente (Ingresos Proporcionales):
                                                    </p>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-white">
                                                                <tr className="border-b border-gray-200">
                                                                    <th className="px-3 py-2 text-left text-gray-600">Cliente</th>
                                                                    <th className="px-3 py-2 text-right text-gray-600">Horas</th>
                                                                    <th className="px-3 py-2 text-right text-gray-600">% Contrib.</th>
                                                                    <th className="px-3 py-2 text-right text-gray-600">Fee Cliente</th>
                                                                    <th className="px-3 py-2 text-right text-gray-600">Coste</th>
                                                                    <th className="px-3 py-2 text-right text-gray-600">Ingresos</th>
                                                                    <th className="px-3 py-2 text-right text-gray-600">Margen</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-100">
                                                                {employee.clientBreakdown.map((client, idx) => (
                                                                    <tr key={idx} className="hover:bg-gray-50">
                                                                        <td className="px-3 py-2 text-gray-900">{client.clientName}</td>
                                                                        <td className="px-3 py-2 text-right text-gray-700">{formatHours(client.hours)}</td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                                                                {formatNumber(client.employeePercentage || 0, 1)}%
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right text-gray-500">
                                                                            {formatCurrency(client.clientFee || 0)}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(client.cost)}</td>
                                                                        <td className="px-3 py-2 text-right text-gray-700 font-medium">{formatCurrency(client.revenue)}</td>
                                                                        <td className={`px-3 py-2 text-right font-medium ${
                                                                            client.margin >= 0 ? 'text-green-600' : 'text-red-600'
                                                                        }`}>
                                                                            {formatCurrency(client.margin)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        💡 Ingresos = (Horas empleado / Total horas cliente) × Fee del cliente
                                                    </p>
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

            {/* Legend */}
            {sortedData.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                            <p className="font-semibold text-gray-700 mb-2">Utilización:</p>
                            <div className="space-y-1">
                                <p className="text-gray-600">🟢 ≥80%: Óptima</p>
                                <p className="text-gray-600">🟠 50-80%: Atención</p>
                                <p className="text-gray-600">🔴 &lt;50%: Crítica</p>
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700 mb-2">ROI (Return on Investment):</p>
                            <div className="space-y-1">
                                <p className="text-gray-600">🟢 ≥2x: Excelente (genera 2x su coste)</p>
                                <p className="text-gray-600">🔵 1-2x: Bueno (rentable)</p>
                                <p className="text-gray-600">🟠 0.5-1x: Justo (margen bajo)</p>
                                <p className="text-gray-600">🔴 &lt;0.5x: Déficit (genera menos que cuesta)</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-900 font-semibold mb-1">📊 Cálculo de Ingresos (Distribución Proporcional):</p>
                        <p className="text-xs text-blue-800">
                            Los ingresos de cada empleado se calculan distribuyendo el fee real de cada cliente proporcionalmente según las horas trabajadas.
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                            <strong>Ejemplo:</strong> Si Juan trabaja 60h de 100h totales en un cliente con fee de 10,000€, sus ingresos = (60/100) × 10,000€ = 6,000€
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        💡 Click en las flechas para ver el desglose por cliente de cada empleado
                    </p>
                </div>
            )}
        </div>
    )
}
