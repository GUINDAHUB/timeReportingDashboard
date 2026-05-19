'use client'

import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekSelectorProps {
    weekStart: string
    onWeekChange: (weekStart: string) => void
    latestDataDate?: string | null
}

function parseISODate(value: string): Date {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

function toISODate(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function getMondayOfWeek(date: Date): Date {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = utc.getUTCDay()
    const daysSinceMonday = (day + 6) % 7
    utc.setUTCDate(utc.getUTCDate() - daysSinceMonday)
    return utc
}

function shiftDays(date: Date, days: number): Date {
    const next = new Date(date)
    next.setUTCDate(next.getUTCDate() + days)
    return next
}

function formatWeekLabel(weekStart: string): string {
    const start = parseISODate(weekStart)
    const end = shiftDays(start, 6)
    const sameMonth = start.getUTCMonth() === end.getUTCMonth()
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear()

    const formatter = (date: Date, withMonth: boolean, withYear: boolean) =>
        new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: withMonth ? 'short' : undefined,
            year: withYear ? 'numeric' : undefined,
            timeZone: 'UTC',
        }).format(date)

    const startStr = formatter(start, !sameMonth, !sameYear)
    const endStr = formatter(end, true, true)

    return `${startStr} – ${endStr}`
}

export function WeekSelector({ weekStart, onWeekChange, latestDataDate }: WeekSelectorProps) {
    const handlePrevious = () => {
        const prev = shiftDays(parseISODate(weekStart), -7)
        onWeekChange(toISODate(prev))
    }

    const handleNext = () => {
        const next = shiftDays(parseISODate(weekStart), 7)
        onWeekChange(toISODate(next))
    }

    const handleLatestData = () => {
        if (!latestDataDate) return
        const monday = getMondayOfWeek(parseISODate(latestDataDate))
        onWeekChange(toISODate(monday))
    }

    const latestMonday = latestDataDate ? toISODate(getMondayOfWeek(parseISODate(latestDataDate))) : null
    const isOnLatestData = latestMonday !== null && latestMonday === weekStart

    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 border rounded-lg shadow-sm">
            <button
                onClick={handlePrevious}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Semana anterior"
            >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-2 min-w-[220px] justify-center">
                <CalendarClock className="w-4 h-4 text-gray-500" />
                <span className="text-base font-semibold text-gray-900 capitalize">
                    {formatWeekLabel(weekStart)}
                </span>
            </div>

            <button
                onClick={handleNext}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Semana siguiente"
            >
                <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            {latestDataDate && !isOnLatestData && (
                <button
                    onClick={handleLatestData}
                    className="ml-2 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title={`Último dato registrado: ${latestDataDate}`}
                >
                    Última con datos
                </button>
            )}
        </div>
    )
}
