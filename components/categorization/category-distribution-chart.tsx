'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatHours } from '@/lib/utils'

interface CategoryData {
    name: string
    value: number
    color: string
    emoji: string | null
}

interface Props {
    data: CategoryData[]
}

export function CategoryDistributionChart({ data }: Props) {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Distribución por Categoría
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Total: {formatHours(total)}
            </p>
            
            {data.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                    No hay datos para mostrar
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => 
                                `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => formatHours(value)}
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value, entry: any) => {
                                const item = data.find(d => d.name === value)
                                return `${item?.emoji ? item.emoji + ' ' : ''}${value}`
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
