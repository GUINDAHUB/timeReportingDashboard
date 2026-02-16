'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
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
    
    // Ordenar por color primero, luego por valor para agrupar colores iguales
    const sortedData = [...data].sort((a, b) => {
        // Primero comparar por color
        if (a.color < b.color) return -1
        if (a.color > b.color) return 1
        // Si el color es igual, ordenar por valor descendente
        return b.value - a.value
    })

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col" style={{ height: '440px' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Distribución por Categoría
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Total: {formatHours(total)}
            </p>
            
            {data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    No hay datos para mostrar
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                    {/* Gráfico de pastel */}
                    <div className="flex-shrink-0 flex items-center justify-center">
                        <ResponsiveContainer width={280} height={280}>
                            <PieChart>
                                <Pie
                                    data={sortedData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={false}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {sortedData.map((entry, index) => (
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
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Leyenda personalizada */}
                    <div className="flex-1 min-w-0 flex flex-col min-h-0">
                        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                            {[...data]
                                .sort((a, b) => b.value - a.value)
                                .map((item, index) => {
                                    const percentage = ((item.value / total) * 100).toFixed(1)
                                    return (
                                        <div 
                                            key={index}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            {/* Color indicator */}
                                            <div 
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            
                                            {/* Category info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    {item.emoji && (
                                                        <span className="text-sm">{item.emoji}</span>
                                                    )}
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {item.name}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {formatHours(item.value)}
                                                </p>
                                            </div>

                                            {/* Percentage badge */}
                                            <div className="flex-shrink-0">
                                                <span 
                                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                                                    style={{ 
                                                        backgroundColor: `${item.color}20`,
                                                        color: item.color
                                                    }}
                                                >
                                                    {percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom scrollbar styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    )
}
