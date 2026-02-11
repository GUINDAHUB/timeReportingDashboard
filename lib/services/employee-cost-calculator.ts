/**
 * Employee Cost Calculator Service
 * 
 * Calculates real costs based on employee hourly rates
 */

import { supabase } from '@/lib/supabase/client'
import { Employee, EmployeeMonthlyCost } from '@/lib/types'

export interface EmployeeCostResolution {
    employee_name: string
    hourly_cost: number
    source: 'monthly_override' | 'default' | 'fallback'
}

export interface ClientCostBreakdown {
    client_id: string
    client_name: string
    revenue: number // Facturación del cliente
    billing_rate: number // Tarifa de facturación (ej: 40€/h)
    estimated_hours: number // Horas ficticias: revenue / billing_rate
    actual_hours: number // Horas reales trabajadas
    hours_deviation: number // Desviación: estimated - actual (negativo = sobrecostes)
    hours_deviation_percent: number // % de desviación
    real_cost: number // Coste real basado en empleados
    estimated_cost: number // Coste estimado (si usáramos tarifa estándar)
    real_margin: number // Margen real: revenue - real_cost
    real_margin_percent: number // % de margen real
    employee_breakdown: Array<{
        employee_name: string
        hours: number
        hourly_cost: number
        total_cost: number
    }>
}

const DEFAULT_BILLING_RATE = 40 // Precio de facturación al cliente (€/hora)
const FALLBACK_COST_RATE = 20 // Coste por defecto si no hay empleado configurado (€/hora)

/**
 * Get the hourly cost for an employee in a specific month/year
 */
async function getEmployeeHourlyCost(
    employeeName: string,
    month: number,
    year: number
): Promise<EmployeeCostResolution> {
    try {
        // 1. Check if there's a monthly override for this employee
        const { data: employee } = await supabase
            .from('employees')
            .select('id, name, hourly_cost')
            .eq('name', employeeName)
            .eq('is_active', true)
            .single()

        if (!employee) {
            // Employee not configured - use fallback
            return {
                employee_name: employeeName,
                hourly_cost: FALLBACK_COST_RATE,
                source: 'fallback'
            }
        }

        // 2. Check for monthly override
        const { data: monthlyCost } = await supabase
            .from('employee_monthly_costs')
            .select('hourly_cost')
            .eq('employee_id', employee.id)
            .eq('month', month)
            .eq('year', year)
            .single()

        if (monthlyCost) {
            return {
                employee_name: employeeName,
                hourly_cost: monthlyCost.hourly_cost,
                source: 'monthly_override'
            }
        }

        // 3. Use employee default hourly cost
        return {
            employee_name: employeeName,
            hourly_cost: employee.hourly_cost,
            source: 'default'
        }

    } catch (error) {
        console.error(`Error getting hourly cost for ${employeeName}:`, error)
        return {
            employee_name: employeeName,
            hourly_cost: FALLBACK_COST_RATE,
            source: 'fallback'
        }
    }
}

/**
 * Calculate cost breakdown for all clients in a specific month
 */
export async function calculateClientCostsForMonth(
    month: number,
    year: number,
    billingRate: number = DEFAULT_BILLING_RATE
): Promise<ClientCostBreakdown[]> {
    try {
        // 1. Get all client fees for the month
        const { data: fees, error: feesError } = await supabase
            .from('client_monthly_goals')
            .select('client_id, fee')
            .eq('month', month)
            .eq('year', year)

        if (feesError) throw feesError

        // 2. Get all clients
        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, name')

        if (clientsError) throw clientsError

        // 3. Get all time entries for the month
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

        const { data: entries, error: entriesError } = await supabase
            .from('time_entries')
            .select('client_id, employee_name, duration_hours')
            .gte('date', startDate)
            .lt('date', endDate)

        if (entriesError) throw entriesError

        // 4. Build client map
        const clientMap = new Map<string, {
            id: string
            name: string
            revenue: number
            hours: number
            employeeHours: Map<string, number> // employee_name -> total hours
        }>()

        // Initialize with all clients
        clients?.forEach(client => {
            clientMap.set(client.id, {
                id: client.id,
                name: client.name,
                revenue: 0,
                hours: 0,
                employeeHours: new Map()
            })
        })

        // Add fees
        fees?.forEach(fee => {
            const client = clientMap.get(fee.client_id)
            if (client) {
                client.revenue = fee.fee
            }
        })

        // Add time entries and aggregate by employee
        entries?.forEach(entry => {
            if (!entry.client_id) return
            
            const client = clientMap.get(entry.client_id)
            if (!client) return

            client.hours += entry.duration_hours

            const currentHours = client.employeeHours.get(entry.employee_name) || 0
            client.employeeHours.set(entry.employee_name, currentHours + entry.duration_hours)
        })

        // 5. Calculate costs for each client
        const results: ClientCostBreakdown[] = []

        for (const [clientId, client] of clientMap.entries()) {
            // Skip clients with no activity
            if (client.revenue === 0 && client.hours === 0) continue

            // Calculate estimated hours (what we "should" have used based on billing)
            const estimatedHours = client.revenue > 0 ? client.revenue / billingRate : 0

            // Calculate real cost by employee
            let realCost = 0
            const employeeBreakdown = []

            for (const [employeeName, hours] of client.employeeHours.entries()) {
                const costResolution = await getEmployeeHourlyCost(employeeName, month, year)
                const totalCost = hours * costResolution.hourly_cost

                realCost += totalCost

                employeeBreakdown.push({
                    employee_name: employeeName,
                    hours,
                    hourly_cost: costResolution.hourly_cost,
                    total_cost: totalCost
                })
            }

            // Calculate metrics
            const estimatedCost = client.hours * FALLBACK_COST_RATE // Coste si usáramos tarifa estándar
            const hoursDeviation = estimatedHours - client.hours
            const hoursDeviationPercent = estimatedHours > 0 ? (hoursDeviation / estimatedHours) * 100 : 0
            const realMargin = client.revenue - realCost
            const realMarginPercent = client.revenue > 0 ? (realMargin / client.revenue) * 100 : 0

            results.push({
                client_id: clientId,
                client_name: client.name,
                revenue: client.revenue,
                billing_rate: billingRate,
                estimated_hours: estimatedHours,
                actual_hours: client.hours,
                hours_deviation: hoursDeviation,
                hours_deviation_percent: hoursDeviationPercent,
                real_cost: realCost,
                estimated_cost: estimatedCost,
                real_margin: realMargin,
                real_margin_percent: realMarginPercent,
                employee_breakdown: employeeBreakdown.sort((a, b) => b.total_cost - a.total_cost)
            })
        }

        return results

    } catch (error) {
        console.error('Error calculating client costs:', error)
        throw error
    }
}

/**
 * Calculate aggregated metrics for a month
 */
export async function calculateMonthlyMetrics(month: number, year: number) {
    const clientCosts = await calculateClientCostsForMonth(month, year)

    const totals = clientCosts.reduce((acc, client) => ({
        totalRevenue: acc.totalRevenue + client.revenue,
        totalEstimatedHours: acc.totalEstimatedHours + client.estimated_hours,
        totalActualHours: acc.totalActualHours + client.actual_hours,
        totalRealCost: acc.totalRealCost + client.real_cost,
        totalEstimatedCost: acc.totalEstimatedCost + client.estimated_cost,
        totalRealMargin: acc.totalRealMargin + client.real_margin
    }), {
        totalRevenue: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        totalRealCost: 0,
        totalEstimatedCost: 0,
        totalRealMargin: 0
    })

    return {
        ...totals,
        totalHoursDeviation: totals.totalEstimatedHours - totals.totalActualHours,
        totalRealMarginPercent: totals.totalRevenue > 0 ? (totals.totalRealMargin / totals.totalRevenue) * 100 : 0,
        averageRealCostPerHour: totals.totalActualHours > 0 ? totals.totalRealCost / totals.totalActualHours : 0,
        clientCount: clientCosts.length
    }
}

/**
 * Calculate employee profitability for a specific month
 * Shows cost vs revenue generated by each employee
 * Revenue is distributed proportionally based on real client fees
 */
export async function calculateEmployeeProfitability(
    month: number,
    year: number,
    billingRate: number = DEFAULT_BILLING_RATE
) {
    try {
        // 1. Get all active employees
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, name, monthly_hours')
            .eq('is_active', true)

        if (employeesError) throw employeesError

        if (!employees || employees.length === 0) {
            return []
        }

        // 2. Check for monthly overrides
        const { data: monthlyCosts, error: costsError } = await supabase
            .from('employee_monthly_costs')
            .select('employee_id, monthly_hours')
            .eq('month', month)
            .eq('year', year)

        if (costsError) throw costsError

        const monthlyHoursMap = new Map<string, number>()
        monthlyCosts?.forEach(cost => {
            monthlyHoursMap.set(cost.employee_id, cost.monthly_hours)
        })

        // 3. Get all time entries for the month with client info
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

        const { data: timeEntries, error: entriesError } = await supabase
            .from('time_entries')
            .select('employee_name, duration_hours, client_id')
            .gte('date', startDate)
            .lt('date', endDate)

        if (entriesError) throw entriesError

        // 4. Get all clients
        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, name')

        if (clientsError) throw clientsError

        const clientsMap = new Map(clients?.map(c => [c.id, c.name]) || [])

        // 5. Get client fees for the month
        const { data: clientFees, error: feesError } = await supabase
            .from('client_monthly_goals')
            .select('client_id, fee')
            .eq('month', month)
            .eq('year', year)

        if (feesError) throw feesError

        const clientFeesMap = new Map(clientFees?.map(f => [f.client_id, f.fee]) || [])

        // 6. Calculate total hours per client (for proportional distribution)
        const clientTotalHoursMap = new Map<string, number>()
        timeEntries?.forEach(entry => {
            if (entry.client_id) {
                const current = clientTotalHoursMap.get(entry.client_id) || 0
                clientTotalHoursMap.set(entry.client_id, current + entry.duration_hours)
            }
        })

        // 7. Build employee profitability data
        const employeeProfitability = []

        for (const employee of employees) {
            // Get expected hours
            const expectedHours = monthlyHoursMap.get(employee.id) || employee.monthly_hours

            // Get employee hourly cost
            const costResolution = await getEmployeeHourlyCost(employee.name, month, year)
            const avgHourlyCost = costResolution.hourly_cost

            // Get all time entries for this employee
            const employeeEntries = timeEntries?.filter(e => e.employee_name === employee.name) || []
            
            if (employeeEntries.length === 0) {
                // Skip employees with no hours
                continue
            }

            const totalHours = employeeEntries.reduce((sum, e) => sum + e.duration_hours, 0)
            const employeeCost = totalHours * avgHourlyCost

            // Build client breakdown and calculate proportional revenue
            const clientHoursMap = new Map<string, number>()
            employeeEntries.forEach(entry => {
                if (entry.client_id) {
                    const current = clientHoursMap.get(entry.client_id) || 0
                    clientHoursMap.set(entry.client_id, current + entry.duration_hours)
                }
            })

            let totalRevenueGenerated = 0
            const clientBreakdown = Array.from(clientHoursMap.entries()).map(([clientId, employeeHoursInClient]) => {
                const clientName = clientsMap.get(clientId) || 'Sin Cliente'
                const cost = employeeHoursInClient * avgHourlyCost
                
                // Calculate proportional revenue
                const clientFee = clientFeesMap.get(clientId) || 0
                const clientTotalHours = clientTotalHoursMap.get(clientId) || 1
                const proportionalRevenue = clientTotalHours > 0 
                    ? (employeeHoursInClient / clientTotalHours) * clientFee 
                    : 0
                
                totalRevenueGenerated += proportionalRevenue
                const margin = proportionalRevenue - cost

                return {
                    clientName,
                    hours: employeeHoursInClient,
                    cost,
                    revenue: proportionalRevenue,
                    margin,
                    clientFee, // Total fee of the client
                    employeePercentage: clientTotalHours > 0 ? (employeeHoursInClient / clientTotalHours) * 100 : 0
                }
            }).sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending

            const marginGenerated = totalRevenueGenerated - employeeCost
            const profitabilityRatio = employeeCost > 0 ? totalRevenueGenerated / employeeCost : 0
            const utilizationPercent = expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0

            employeeProfitability.push({
                employeeName: employee.name,
                totalHours,
                expectedHours,
                utilizationPercent,
                employeeCost,
                revenueGenerated: totalRevenueGenerated,
                marginGenerated,
                profitabilityRatio,
                clientsWorked: clientBreakdown.length,
                avgHourlyCost,
                clientBreakdown
            })
        }

        return employeeProfitability

    } catch (error) {
        console.error('Error calculating employee profitability:', error)
        throw error
    }
}

/**
 * Calculate employee hours progress for a specific month
 * Compares actual hours worked vs expected monthly hours
 */
export async function calculateEmployeeHoursProgress(month: number, year: number) {
    try {
        // 1. Get all active employees with their expected hours
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, name, monthly_hours')
            .eq('is_active', true)

        if (employeesError) throw employeesError

        if (!employees || employees.length === 0) {
            return []
        }

        // 2. Check for monthly overrides
        const { data: monthlyCosts, error: costsError } = await supabase
            .from('employee_monthly_costs')
            .select('employee_id, monthly_hours')
            .eq('month', month)
            .eq('year', year)

        if (costsError) throw costsError

        // Create a map of monthly overrides
        const monthlyHoursMap = new Map<string, number>()
        monthlyCosts?.forEach(cost => {
            monthlyHoursMap.set(cost.employee_id, cost.monthly_hours)
        })

        // 3. Get all time entries for the month grouped by employee
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

        const { data: timeEntries, error: entriesError } = await supabase
            .from('time_entries')
            .select('employee_name, duration_hours')
            .gte('date', startDate)
            .lt('date', endDate)

        if (entriesError) throw entriesError

        // Aggregate hours by employee name
        const actualHoursMap = new Map<string, number>()
        timeEntries?.forEach(entry => {
            const current = actualHoursMap.get(entry.employee_name) || 0
            actualHoursMap.set(entry.employee_name, current + entry.duration_hours)
        })

        // 4. Build the progress data
        const progressData = employees.map(employee => {
            // Get expected hours (monthly override or default)
            const expectedHours = monthlyHoursMap.get(employee.id) || employee.monthly_hours
            
            // Get actual hours worked
            const actualHours = actualHoursMap.get(employee.name) || 0
            
            // Calculate metrics
            const percentage = expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0
            const deviation = actualHours - expectedHours

            return {
                employeeName: employee.name,
                expectedHours,
                actualHours,
                percentage,
                deviation
            }
        })

        // Only return employees that have some activity or expected hours
        return progressData.filter(emp => emp.expectedHours > 0 || emp.actualHours > 0)

    } catch (error) {
        console.error('Error calculating employee hours progress:', error)
        throw error
    }
}
