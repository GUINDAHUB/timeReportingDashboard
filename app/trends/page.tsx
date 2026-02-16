'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getMonthName } from '@/lib/utils'
import { Calendar, DollarSign, Clock, TrendingUp, Activity } from 'lucide-react'
import { RevenueCostChart } from '@/components/trends/revenue-cost-chart'
import { HoursByCategoryChart } from '@/components/trends/hours-by-category-chart'
import { EfficiencyChart } from '@/components/trends/efficiency-chart'
import { TrendKpiCard } from '@/components/trends/trend-kpi-card'
import { ClientTrendsTable } from '@/components/trends/client-trends-table'

const DEFAULT_HOURLY_COST = 30

interface MonthData {
    month: number
    year: number
    revenue: number
    hours: number
    cost: number
    margin: number
    categoryHours: Record<string, number>
}

interface Category {
    id: string
    name: string
    color: string
}

export default function TrendsPage() {
    const [loading, setLoading] = useState(true)
    const [monthsToShow, setMonthsToShow] = useState(12)
    const [monthsData, setMonthsData] = useState<MonthData[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [clientTrends, setClientTrends] = useState<any[]>([])

    useEffect(() => {
        loadTrendsData()
    }, [monthsToShow])

    async function loadTrendsData() {
        setLoading(true)
        try {
            // 1. Get categories
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('id, name, color')
                .order('sort_order')

            setCategories(categoriesData || [])

            // 2. Calculate date range
            const today = new Date()
            const startDate = new Date(today.getFullYear(), today.getMonth() - monthsToShow + 1, 1)
            
            // 3. Get active employees with profile
            const { data: employees } = await supabase
                .from('employees')
                .select('name')
                .eq('is_active', true)
            
            const activeEmployeeNames = new Set(employees?.map(e => e.name) || [])
            
            // 4. Get all time entries in range
            const { data: entries } = await supabase
                .from('time_entries')
                .select('date, duration_hours, category_id, client_id, employee_name')
                .gte('date', startDate.toISOString().split('T')[0])

            // 5. Get all monthly goals in range
            const startMonth = startDate.getMonth() + 1
            const startYear = startDate.getFullYear()
            
            const { data: goals } = await supabase
                .from('client_monthly_goals')
                .select('month, year, fee, client_id')
                .gte('year', startYear)

            // 6. Get clients for trends table
            const { data: clients } = await supabase
                .from('clients')
                .select('id, name')
            
            // Filter entries to only include employees with profile
            const filteredEntries = entries?.filter(entry => activeEmployeeNames.has(entry.employee_name)) || []

            // Process data by month
            const monthsMap = new Map<string, MonthData>()
            
            // Initialize months
            for (let i = 0; i < monthsToShow; i++) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
                const key = `${date.getFullYear()}-${date.getMonth() + 1}`
                monthsMap.set(key, {
                    month: date.getMonth() + 1,
                    year: date.getFullYear(),
                    revenue: 0,
                    hours: 0,
                    cost: 0,
                    margin: 0,
                    categoryHours: {}
                })
            }

            // Aggregate revenue from goals
            goals?.forEach(goal => {
                const key = `${goal.year}-${goal.month}`
                const monthData = monthsMap.get(key)
                if (monthData) {
                    monthData.revenue += goal.fee
                }
            })

            // Aggregate hours and categories from entries (only employees with profile)
            filteredEntries.forEach(entry => {
                const date = new Date(entry.date)
                const key = `${date.getFullYear()}-${date.getMonth() + 1}`
                const monthData = monthsMap.get(key)
                
                if (monthData) {
                    monthData.hours += entry.duration_hours
                    
                    if (entry.category_id) {
                        if (!monthData.categoryHours[entry.category_id]) {
                            monthData.categoryHours[entry.category_id] = 0
                        }
                        monthData.categoryHours[entry.category_id] += entry.duration_hours
                    }
                }
            })

            // Calculate costs and margins
            monthsMap.forEach(monthData => {
                monthData.cost = monthData.hours * DEFAULT_HOURLY_COST
                monthData.margin = monthData.revenue - monthData.cost
            })

            // Convert to array and sort by date
            const monthsArray = Array.from(monthsMap.values())
                .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year
                    return a.month - b.month
                })

            setMonthsData(monthsArray)

            // Calculate client trends (current month vs previous)
            if (monthsArray.length >= 2) {
                const currentMonth = monthsArray[monthsArray.length - 1]
                const previousMonth = monthsArray[monthsArray.length - 2]

                const clientTrendsMap = new Map()

                // Get current month data by client (only employees with profile)
                filteredEntries.filter(e => {
                    const date = new Date(e.date)
                    return date.getFullYear() === currentMonth.year && date.getMonth() + 1 === currentMonth.month
                }).forEach(entry => {
                    if (!entry.client_id) return
                    if (!clientTrendsMap.has(entry.client_id)) {
                        clientTrendsMap.set(entry.client_id, {
                            clientId: entry.client_id,
                            currentHours: 0,
                            previousHours: 0,
                            currentRevenue: 0,
                            previousRevenue: 0
                        })
                    }
                    clientTrendsMap.get(entry.client_id).currentHours += entry.duration_hours
                })

                // Get previous month data by client (only employees with profile)
                filteredEntries.filter(e => {
                    const date = new Date(e.date)
                    return date.getFullYear() === previousMonth.year && date.getMonth() + 1 === previousMonth.month
                }).forEach(entry => {
                    if (!entry.client_id) return
                    if (!clientTrendsMap.has(entry.client_id)) {
                        clientTrendsMap.set(entry.client_id, {
                            clientId: entry.client_id,
                            currentHours: 0,
                            previousHours: 0,
                            currentRevenue: 0,
                            previousRevenue: 0
                        })
                    }
                    clientTrendsMap.get(entry.client_id).previousHours += entry.duration_hours
                })

                // Add revenue data
                goals?.filter(g => g.year === currentMonth.year && g.month === currentMonth.month)
                    .forEach(goal => {
                        if (!clientTrendsMap.has(goal.client_id)) {
                            clientTrendsMap.set(goal.client_id, {
                                clientId: goal.client_id,
                                currentHours: 0,
                                previousHours: 0,
                                currentRevenue: 0,
                                previousRevenue: 0
                            })
                        }
                        clientTrendsMap.get(goal.client_id).currentRevenue += goal.fee
                    })

                goals?.filter(g => g.year === previousMonth.year && g.month === previousMonth.month)
                    .forEach(goal => {
                        if (!clientTrendsMap.has(goal.client_id)) {
                            clientTrendsMap.set(goal.client_id, {
                                clientId: goal.client_id,
                                currentHours: 0,
                                previousHours: 0,
                                currentRevenue: 0,
                                previousRevenue: 0
                            })
                        }
                        clientTrendsMap.get(goal.client_id).previousRevenue += goal.fee
                    })

                // Add client names and calculate changes
                const clientTrendsArray = Array.from(clientTrendsMap.values())
                    .map(trend => {
                        const client = clients?.find(c => c.id === trend.clientId)
                        const change = trend.previousRevenue > 0 
                            ? ((trend.currentRevenue - trend.previousRevenue) / trend.previousRevenue) * 100
                            : (trend.currentRevenue > 0 ? 100 : 0)
                        
                        return {
                            ...trend,
                            clientName: client?.name || 'Desconocido',
                            changePercent: change
                        }
                    })
                    .filter(t => t.currentRevenue > 0 || t.previousRevenue > 0)

                setClientTrends(clientTrendsArray)
            }

        } catch (error) {
            console.error('Error loading trends data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Prepare chart data
    const revenueChartData = monthsData.map(m => ({
        month: `${getMonthName(m.month).slice(0, 3)} '${m.year.toString().slice(2)}`,
        revenue: m.revenue,
        cost: m.cost,
        margin: m.margin
    }))

    const categoryChartData = monthsData.map(m => {
        const data: any = {
            month: `${getMonthName(m.month).slice(0, 3)} '${m.year.toString().slice(2)}`
        }
        categories.forEach(cat => {
            data[cat.id] = m.categoryHours[cat.id] || 0
        })
        return data
    })

    const efficiencyChartData = monthsData.map(m => ({
        month: `${getMonthName(m.month).slice(0, 3)} '${m.year.toString().slice(2)}`,
        revenuePerHour: m.hours > 0 ? m.revenue / m.hours : 0,
        costPerHour: DEFAULT_HOURLY_COST
    }))

    // Calculate KPIs
    const currentMonth = monthsData[monthsData.length - 1]
    const previousMonth = monthsData[monthsData.length - 2]

    const hasData = monthsData.length >= 2 && monthsData.some(m => m.revenue > 0 || m.hours > 0)

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando tendencias...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!hasData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Tendencias</h1>
                        <p className="text-gray-600 mt-1">Evolución histórica de ingresos y costes</p>
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-6xl mb-4">📈</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                No hay datos históricos
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Necesitas importar datos de al menos 2 meses para ver tendencias.
                            </p>
                            <a
                                href="/import"
                                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Importar Datos
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Tendencias</h1>
                        <p className="text-gray-600 mt-1">Evolución histórica de ingresos y costes</p>
                    </div>

                    {/* Period Selector */}
                    <div className="flex gap-2">
                        {[6, 12, 24].map(months => (
                            <button
                                key={months}
                                onClick={() => setMonthsToShow(months)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    monthsToShow === months
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white border text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {months} meses
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI Cards */}
                {currentMonth && previousMonth && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <TrendKpiCard
                            title="Facturación"
                            value={currentMonth.revenue}
                            previousValue={previousMonth.revenue}
                            format="currency"
                            icon={<DollarSign className="w-4 h-4" />}
                            color="blue"
                        />
                        <TrendKpiCard
                            title="Horas Totales"
                            value={currentMonth.hours}
                            previousValue={previousMonth.hours}
                            format="number"
                            icon={<Clock className="w-4 h-4" />}
                            color="orange"
                        />
                        <TrendKpiCard
                            title="Margen"
                            value={currentMonth.margin}
                            previousValue={previousMonth.margin}
                            format="currency"
                            icon={<TrendingUp className="w-4 h-4" />}
                            color="green"
                        />
                        <TrendKpiCard
                            title="Rentabilidad"
                            value={currentMonth.revenue > 0 ? (currentMonth.margin / currentMonth.revenue) * 100 : 0}
                            previousValue={previousMonth.revenue > 0 ? (previousMonth.margin / previousMonth.revenue) * 100 : 0}
                            format="percentage"
                            icon={<Activity className="w-4 h-4" />}
                            color="purple"
                        />
                    </div>
                )}

                {/* Main Chart */}
                <RevenueCostChart data={revenueChartData} />

                {/* Secondary Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <HoursByCategoryChart data={categoryChartData} categories={categories} />
                    <EfficiencyChart data={efficiencyChartData} />
                </div>

                {/* Client Trends Table */}
                {clientTrends.length > 0 && (
                    <ClientTrendsTable data={clientTrends} />
                )}

                {/* Insights */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Resumen del Periodo
                    </h4>
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <p className="text-sm text-blue-700 font-medium">Promedio Mensual</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {(monthsData.reduce((sum, m) => sum + m.revenue, 0) / monthsData.length).toFixed(0)}€
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-700 font-medium">Total Horas</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {monthsData.reduce((sum, m) => sum + m.hours, 0).toFixed(0)}h
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-700 font-medium">Margen Promedio</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {monthsData.length > 0 
                                    ? ((monthsData.reduce((sum, m) => sum + m.margin, 0) / monthsData.reduce((sum, m) => sum + m.revenue, 0)) * 100).toFixed(1)
                                    : 0}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
