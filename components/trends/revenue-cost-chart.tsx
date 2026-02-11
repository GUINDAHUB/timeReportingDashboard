'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DataPoint {
    month: string
    revenue: number
    cost: number
    margin: number
}

interface Props {
    data: DataPoint[]
}

export function RevenueCostChart({ data }: Props) {
    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Evolución de Ingresos, Costes y Margen
            </h3>
            <ResponsiveContainer width="100%" height={320}>
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
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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
                    <Legend 
                        wrapperStyle={{ fontSize: '14px' }}
                        iconType="line"
                    />
                    <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5}
                        name="Facturación"
                        dot={{ fill: '#3b82f6', r: 4 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#f59e0b" 
                        strokeWidth={2.5}
                        name="Costes"
                        dot={{ fill: '#f59e0b', r: 4 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="margin" 
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        name="Margen"
                        dot={{ fill: '#10b981', r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
