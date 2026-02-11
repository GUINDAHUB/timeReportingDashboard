'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatHours, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Clock, DollarSign, Activity, Users, AlertTriangle } from 'lucide-react'
import { ProfitabilityTable } from '@/components/dashboard/profitability-table'
import { EmployeeHoursProgress } from '@/components/dashboard/employee-hours-progress'
import { EmployeeProfitabilityTable } from '@/components/dashboard/employee-profitability-table'
import { MonthSelector } from '@/components/dashboard/month-selector'
import { useDateStore } from '@/lib/store/date-store'
import { calculateClientCostsForMonth, calculateMonthlyMetrics, calculateEmployeeHoursProgress, calculateEmployeeProfitability } from '@/lib/services/employee-cost-calculator'

interface DashboardMetrics {
    totalRevenue: number
    totalEstimatedHours: number
    totalActualHours: number
    totalHoursDeviation: number
    totalRealCost: number
    totalEstimatedCost: number
    averageRealCostPerHour: number
    totalRealMargin: number
    totalRealMarginPercent: number
    clientCount: number
    clientData: any[]
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalRevenue: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        totalHoursDeviation: 0,
        totalRealCost: 0,
        totalEstimatedCost: 0,
        averageRealCostPerHour: 0,
        totalRealMargin: 0,
        totalRealMarginPercent: 0,
        clientCount: 0,
        clientData: []
    })
    const [employeeHoursProgress, setEmployeeHoursProgress] = useState<any[]>([])
    const [employeeProfitability, setEmployeeProfitability] = useState<any[]>([])
    const billingRate = 40 // Tarifa de facturación por hora

    // Use global date store
    const { filter, setMonth, setYear } = useDateStore()
    const { month, year } = filter

    const loadDashboardData = async () => {
        setLoading(true)

        try {
            // Use the new employee cost calculator
            const [monthlyMetrics, clientCosts, employeeProgress, employeeProfitabilityData] = await Promise.all([
                calculateMonthlyMetrics(month, year),
                calculateClientCostsForMonth(month, year),
                calculateEmployeeHoursProgress(month, year),
                calculateEmployeeProfitability(month, year, billingRate)
            ])

            // Format client data for the table
            const clientData = clientCosts.map(client => ({
                clientId: client.client_id,
                clientName: client.client_name,
                revenue: client.revenue,
                estimatedHours: client.estimated_hours,
                actualHours: client.actual_hours,
                hoursDeviation: client.hours_deviation,
                hoursDeviationPercent: client.hours_deviation_percent,
                realCost: client.real_cost,
                estimatedCost: client.estimated_cost,
                realMargin: client.real_margin,
                realMarginPercent: client.real_margin_percent,
                employeeBreakdown: client.employee_breakdown
            }))

            setMetrics({
                ...monthlyMetrics,
                clientData
            })
            setEmployeeHoursProgress(employeeProgress)
            setEmployeeProfitability(employeeProfitabilityData)

        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDashboardData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, year])

    // Helper for trend color
    const getMarginColor = (margin: number) => {
        if (margin > 0) return 'text-green-600'
        if (margin < 0) return 'text-red-600'
        return 'text-gray-600'
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-600 mt-1">Vista general de rentabilidad mensual</p>
                    </div>

                    {/* Month Selector */}
                    <MonthSelector
                        month={month}
                        year={year}
                        onMonthChange={(newMonth, newYear) => {
                            setMonth(newMonth)
                            setYear(newYear)
                        }}
                    />
                </div>

                {/* KPI Cards Row 1 */}
                <div className="grid gap-6 md:grid-cols-4">
                    {/* Revenue */}
                    <div className="p-6 bg-white rounded-xl border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Facturación Total</p>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <DollarSign className="w-4 h-4 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {loading ? '...' : formatCurrency(metrics.totalRevenue)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {metrics.clientCount} cliente{metrics.clientCount !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Hours - Real vs Estimated */}
                    <div className="p-6 bg-white rounded-xl border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Horas Invertidas</p>
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Clock className="w-4 h-4 text-orange-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {loading ? '...' : formatHours(metrics.totalActualHours)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Estimadas: {formatHours(metrics.totalEstimatedHours)}
                        </p>
                    </div>

                    {/* Real Cost */}
                    <div className="p-6 bg-white rounded-xl border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Coste Real</p>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <Users className="w-4 h-4 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {loading ? '...' : formatCurrency(metrics.totalRealCost)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {formatCurrency(metrics.averageRealCostPerHour)}/hora promedio
                        </p>
                    </div>

                    {/* Real Margin */}
                    <div className="p-6 bg-white rounded-xl border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Margen Real</p>
                            <div className={`p-2 rounded-lg ${metrics.totalRealMargin >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                {metrics.totalRealMargin >= 0 ? (
                                    <TrendingUp className={`w-4 h-4 ${getMarginColor(metrics.totalRealMargin)}`} />
                                ) : (
                                    <TrendingDown className={`w-4 h-4 ${getMarginColor(metrics.totalRealMargin)}`} />
                                )}
                            </div>
                        </div>
                        <p className={`text-3xl font-bold ${getMarginColor(metrics.totalRealMargin)}`}>
                            {loading ? '...' : formatCurrency(metrics.totalRealMargin)}
                        </p>
                        <p className={`text-sm font-medium mt-1 ${getMarginColor(metrics.totalRealMargin)}`}>
                            {metrics.totalRealMarginPercent.toFixed(1)}% de rentabilidad
                        </p>
                    </div>
                </div>

                {/* KPI Cards Row 2 - Hours Deviation */}
                <div className="grid gap-6 md:grid-cols-1">
                    <div className={`p-6 bg-white rounded-xl border shadow-sm ${
                        metrics.totalHoursDeviation < 0 ? 'border-l-4 border-l-red-500' : 
                        metrics.totalHoursDeviation > 0 ? 'border-l-4 border-l-green-500' : 
                        'border-l-4 border-l-gray-300'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${
                                    metrics.totalHoursDeviation < 0 ? 'bg-red-50' : 
                                    metrics.totalHoursDeviation > 0 ? 'bg-green-50' : 
                                    'bg-gray-50'
                                }`}>
                                    <AlertTriangle className={`w-5 h-5 ${
                                        metrics.totalHoursDeviation < 0 ? 'text-red-600' : 
                                        metrics.totalHoursDeviation > 0 ? 'text-green-600' : 
                                        'text-gray-600'
                                    }`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Desviación de Horas</p>
                                    <p className={`text-2xl font-bold ${
                                        metrics.totalHoursDeviation < 0 ? 'text-red-600' : 
                                        metrics.totalHoursDeviation > 0 ? 'text-green-600' : 
                                        'text-gray-900'
                                    }`}>
                                        {loading ? '...' : `${metrics.totalHoursDeviation >= 0 ? '+' : ''}${formatHours(metrics.totalHoursDeviation)}`}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">
                                    {metrics.totalHoursDeviation < 0 && 'Se invirtieron MÁS horas de las estimadas'}
                                    {metrics.totalHoursDeviation > 0 && 'Se invirtieron MENOS horas de las estimadas'}
                                    {metrics.totalHoursDeviation === 0 && 'Horas exactas según lo estimado'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Estimadas: {formatHours(metrics.totalEstimatedHours)} • Reales: {formatHours(metrics.totalActualHours)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profitability Table */}
                <div className="mt-8">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border shadow-sm">
                            Cargando datos de rentabilidad...
                        </div>
                    ) : (
                        <ProfitabilityTable data={metrics.clientData} />
                    )}
                </div>

                {/* Employee Hours Progress */}
                {!loading && employeeHoursProgress.length > 0 && (
                    <div className="mt-8">
                        <EmployeeHoursProgress data={employeeHoursProgress} />
                    </div>
                )}

                {/* Employee Profitability Table */}
                {!loading && employeeProfitability.length > 0 && (
                    <div className="mt-8">
                        <EmployeeProfitabilityTable 
                            data={employeeProfitability} 
                            billingRate={billingRate}
                        />
                    </div>
                )}

            </div>
        </div>
    )
}
