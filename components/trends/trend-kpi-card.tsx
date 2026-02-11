'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface Props {
    title: string
    value: number
    previousValue: number
    format?: 'currency' | 'number' | 'percentage'
    icon: React.ReactNode
    color: 'blue' | 'orange' | 'green' | 'purple'
}

const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
}

export function TrendKpiCard({ title, value, previousValue, format = 'currency', icon, color }: Props) {
    const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0
    const isPositive = change > 0
    const isNeutral = Math.abs(change) < 0.1

    const formatValue = (val: number) => {
        if (format === 'currency') return formatCurrency(val)
        if (format === 'percentage') return `${formatNumber(val, 1)}%`
        return formatNumber(val, 1)
    }

    const getTrendIcon = () => {
        if (isNeutral) return <Minus className="w-4 h-4" />
        return isPositive 
            ? <TrendingUp className="w-4 h-4" />
            : <TrendingDown className="w-4 h-4" />
    }

    const getTrendColor = () => {
        if (isNeutral) return 'text-gray-600'
        return isPositive ? 'text-green-600' : 'text-red-600'
    }

    return (
        <div className="p-6 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
                {formatValue(value)}
            </p>
            <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>
                    {isNeutral ? 'Sin cambios' : `${Math.abs(change).toFixed(1)}%`}
                </span>
                <span className="text-gray-500 font-normal">vs mes anterior</span>
            </div>
        </div>
    )
}
