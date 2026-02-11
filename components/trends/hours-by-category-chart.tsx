'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CategoryData {
    month: string
    [key: string]: string | number // Dynamic category keys
}

interface Props {
    data: CategoryData[]
    categories: Array<{ id: string; name: string; color: string }>
}

export function HoursByCategoryChart({ data, categories }: Props) {
    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Distribución de Horas por Categoría
            </h3>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                    />
                    <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)}h`}
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    />
                    <Legend 
                        wrapperStyle={{ fontSize: '13px' }}
                        iconType="rect"
                    />
                    {categories.map(category => (
                        <Bar 
                            key={category.id}
                            dataKey={category.id}
                            stackId="hours"
                            fill={category.color}
                            name={category.name}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
