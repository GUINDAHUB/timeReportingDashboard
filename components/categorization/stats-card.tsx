'use client'

import { LucideIcon } from 'lucide-react'

interface Props {
    title: string
    value: string | number
    subtitle: string
    icon: LucideIcon
    color: 'blue' | 'orange' | 'green' | 'purple' | 'pink'
}

const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    pink: 'bg-pink-50 text-pink-600'
}

export function StatsCard({ title, value, subtitle, icon: Icon, color }: Props) {
    return (
        <div className="p-6 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
                {value}
            </p>
            <p className="text-sm text-gray-500">
                {subtitle}
            </p>
        </div>
    )
}
