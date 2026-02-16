'use client'

import { formatHours } from '@/lib/utils'
import { TrendingUp, Award, Target } from 'lucide-react'

interface CategoryData {
    name: string
    value: number
    color: string
    emoji: string | null
    tasks?: number
}

interface Props {
    data: CategoryData[]
}

export function CategoryRankingCard({ data }: Props) {
    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 5)
    const total = data.reduce((sum, item) => sum + item.value, 0)
    
    if (sortedData.length === 0) {
        return (
            <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col" style={{ height: '440px' }}>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Top Categorías
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Las 5 categorías más utilizadas
                </p>
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    No hay datos para mostrar
                </div>
            </div>
        )
    }

    const topCategory = sortedData[0]
    const topPercentage = ((topCategory.value / total) * 100).toFixed(1)

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col min-h-0" style={{ height: '440px' }}>
            {/* Header */}
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Top Categorías
                    </h3>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Las 5 categorías más utilizadas
                </p>

                {/* Destacado: Categoría #1 */}
                <div 
                    className="mb-4 p-4 rounded-xl border-2 relative overflow-hidden"
                    style={{ 
                        borderColor: topCategory.color,
                        backgroundColor: `${topCategory.color}08`
                    }}
                >
                    <div className="absolute top-2 right-2">
                        <Award className="w-6 h-6" style={{ color: topCategory.color }} />
                    </div>
                    <div className="flex items-start gap-3">
                        {topCategory.emoji && (
                            <span className="text-3xl">{topCategory.emoji}</span>
                        )}
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                                🏆 Categoría Principal
                            </p>
                            <p className="text-lg font-bold text-gray-900 mb-1">
                                {topCategory.name}
                            </p>
                            <div className="flex items-baseline gap-3">
                                <p className="text-2xl font-bold" style={{ color: topCategory.color }}>
                                    {formatHours(topCategory.value)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {topPercentage}% del total
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking del resto - con scroll */}
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                {sortedData.slice(1).map((category, index) => {
                    const percentage = ((category.value / total) * 100).toFixed(1)
                    const position = index + 2
                    
                    return (
                        <div 
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                        >
                            {/* Position */}
                            <div 
                                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: category.color }}
                            >
                                {position}
                            </div>

                            {/* Category info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                    {category.emoji && (
                                        <span className="text-sm">{category.emoji}</span>
                                    )}
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {category.name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-600 font-medium">
                                        {formatHours(category.value)}
                                    </p>
                                    <span className="text-xs text-gray-400">•</span>
                                    <p className="text-xs text-gray-500">
                                        {percentage}%
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="flex-shrink-0 w-16">
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all"
                                        style={{ 
                                            backgroundColor: category.color,
                                            width: `${percentage}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer stats */}
            {data.length > 5 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Target className="w-4 h-4" />
                        <span>
                            +{data.length - 5} categorías adicionales
                        </span>
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
