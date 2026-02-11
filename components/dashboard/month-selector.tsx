'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMonthName } from '@/lib/utils'

interface MonthSelectorProps {
    month: number
    year: number
    onMonthChange: (month: number, year: number) => void
}

export function MonthSelector({ month, year, onMonthChange }: MonthSelectorProps) {
    const handlePrevious = () => {
        if (month === 1) {
            onMonthChange(12, year - 1)
        } else {
            onMonthChange(month - 1, year)
        }
    }

    const handleNext = () => {
        if (month === 12) {
            onMonthChange(1, year + 1)
        } else {
            onMonthChange(month + 1, year)
        }
    }

    const handleToday = () => {
        const now = new Date()
        onMonthChange(now.getMonth() + 1, now.getFullYear())
    }

    const isCurrentMonth = () => {
        const now = new Date()
        return month === now.getMonth() + 1 && year === now.getFullYear()
    }

    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 border rounded-lg shadow-sm">
            <button
                onClick={handlePrevious}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Mes anterior"
            >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-2 min-w-[180px] justify-center">
                <span className="text-base font-semibold text-gray-900 capitalize">
                    {getMonthName(month)} {year}
                </span>
            </div>

            <button
                onClick={handleNext}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Mes siguiente"
            >
                <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            {!isCurrentMonth() && (
                <button
                    onClick={handleToday}
                    className="ml-2 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                    Hoy
                </button>
            )}
        </div>
    )
}
