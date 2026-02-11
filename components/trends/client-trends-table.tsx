'use client'

import { formatCurrency, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ClientTrend {
    clientId: string
    clientName: string
    currentRevenue: number
    previousRevenue: number
    currentHours: number
    previousHours: number
    changePercent: number
}

interface Props {
    data: ClientTrend[]
}

export function ClientTrendsTable({ data }: Props) {
    const sortedData = [...data].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))

    const getTrendIcon = (change: number) => {
        if (Math.abs(change) < 1) return <Minus className="w-4 h-4 text-gray-400" />
        return change > 0 
            ? <TrendingUp className="w-4 h-4 text-green-600" />
            : <TrendingDown className="w-4 h-4 text-red-600" />
    }

    const getTrendColor = (change: number) => {
        if (Math.abs(change) < 1) return 'text-gray-600'
        return change > 0 ? 'text-green-600' : 'text-red-600'
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Tendencias por Cliente</h3>
                <p className="text-sm text-gray-500 mt-1">Comparativa mes actual vs mes anterior</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                        <tr>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3 text-right">Facturación Actual</th>
                            <th className="px-6 py-3 text-right">Horas Actuales</th>
                            <th className="px-6 py-3 text-right">Cambio</th>
                            <th className="px-6 py-3 text-center">Tendencia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No hay datos suficientes para mostrar tendencias.
                                </td>
                            </tr>
                        ) : sortedData.map((item) => (
                            <tr key={item.clientId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {item.clientName}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-medium text-gray-900">
                                            {formatCurrency(item.currentRevenue)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Anterior: {formatCurrency(item.previousRevenue)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-medium text-gray-900">
                                            {formatNumber(item.currentHours, 1)}h
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Anterior: {formatNumber(item.previousHours, 1)}h
                                        </span>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 text-right font-semibold ${getTrendColor(item.changePercent)}`}>
                                    {item.changePercent > 0 ? '+' : ''}{formatNumber(item.changePercent, 1)}%
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                        {getTrendIcon(item.changePercent)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
