'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DataPoint {
    month: string
    revenuePerHour: number
    costPerHour: number
}

interface Props {
    data: DataPoint[]
}

export function EfficiencyChart({ data }: Props) {
    // Calculate average for reference line
    const avgRevenue = data.length > 0 
        ? data.reduce((sum, d) => sum + d.revenuePerHour, 0) / data.length 
        : 0

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Eficiencia: Ingresos por Hora
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Promedio: {formatCurrency(avgRevenue)}/hora
            </p>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                    />
                    <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    />
                    <ReferenceLine 
                        y={avgRevenue} 
                        stroke="#94a3b8" 
                        strokeDasharray="5 5"
                        label={{ value: 'Promedio', position: 'right', fontSize: 11 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="revenuePerHour" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        name="€/hora"
                        dot={{ fill: '#8b5cf6', r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
