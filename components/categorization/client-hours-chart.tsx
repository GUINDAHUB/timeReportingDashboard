'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatHours } from '@/lib/utils'

interface ClientData {
    name: string
    hours: number
    tasks: number
}

interface Props {
    data: ClientData[]
}

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

export function ClientHoursChart({ data }: Props) {
    const sortedData = [...data].sort((a, b) => b.hours - a.hours).slice(0, 10)

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Horas por Cliente (Top 10)
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                {data.length} {data.length === 1 ? 'cliente' : 'clientes'} en total
            </p>
            
            {data.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                    No hay datos para mostrar
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={sortedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            tick={{ fontSize: 11 }}
                            height={100}
                            stroke="#6b7280"
                        />
                        <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                            tickFormatter={(value) => `${value}h`}
                        />
                        <Tooltip 
                            formatter={(value: number) => formatHours(value)}
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                        />
                        <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                            {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
