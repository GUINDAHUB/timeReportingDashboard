'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatHours } from '@/lib/utils'

interface EmployeeData {
    name: string
    hours: number
    tasks: number
}

interface Props {
    data: EmployeeData[]
}

const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#6366f1', '#f97316', '#14b8a6', '#a855f7'
]

export function EmployeeHoursChart({ data }: Props) {
    const sortedData = [...data].sort((a, b) => b.hours - a.hours)

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Horas por Persona
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                {data.length} {data.length === 1 ? 'persona' : 'personas'}
            </p>
            
            {data.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                    No hay datos para mostrar
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={sortedData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            type="number"
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                            tickFormatter={(value) => `${value}h`}
                        />
                        <YAxis 
                            dataKey="name" 
                            type="category"
                            width={120}
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                        />
                        <Tooltip 
                            formatter={(value: number) => formatHours(value)}
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            labelFormatter={(label) => `Persona: ${label}`}
                        />
                        <Bar dataKey="hours" radius={[0, 8, 8, 0]}>
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
