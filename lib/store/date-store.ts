import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DateFilter, DateFilterMode, DateRange } from '@/lib/types'
import { startOfMonth, endOfMonth, startOfYear, format } from 'date-fns'

interface DateStore {
    filter: DateFilter
    setMonth: (month: number) => void
    setYear: (year: number) => void
    setMode: (mode: DateFilterMode) => void
    getDateRange: () => DateRange
}

export const useDateStore = create<DateStore>()(
    persist(
        (set, get) => ({
            filter: {
                mode: 'month',
                month: new Date().getMonth() + 1, // 1-12
                year: new Date().getFullYear(),
            },

            setMonth: (month: number) => {
                set((state) => ({
                    filter: { ...state.filter, month },
                }))
            },

            setYear: (year: number) => {
                set((state) => ({
                    filter: { ...state.filter, year },
                }))
            },

            setMode: (mode: DateFilterMode) => {
                set((state) => ({
                    filter: { ...state.filter, mode },
                }))
            },

            getDateRange: (): DateRange => {
                const { filter } = get()
                const { mode, month, year } = filter

                if (mode === 'all') {
                    return {
                        start_date: '2020-01-01',
                        end_date: '2100-12-31',
                    }
                }

                if (mode === 'ytd') {
                    const yearStart = startOfYear(new Date(year, 0, 1))
                    const today = new Date()
                    return {
                        start_date: format(yearStart, 'yyyy-MM-dd'),
                        end_date: format(today, 'yyyy-MM-dd'),
                    }
                }

                // mode === 'month'
                const monthStart = startOfMonth(new Date(year, month - 1, 1))
                const monthEnd = endOfMonth(new Date(year, month - 1, 1))

                return {
                    start_date: format(monthStart, 'yyyy-MM-dd'),
                    end_date: format(monthEnd, 'yyyy-MM-dd'),
                }
            },
        }),
        {
            name: 'guinda-date-filter',
        }
    )
)
