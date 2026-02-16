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
    real_cost: number // Coste real basado en empleados (Coste Personal Directo)
    estimated_cost: number // Coste estimado (si usáramos tarifa estándar)
    direct_costs: number // Gastos Directos del Cliente (Variable)
    total_direct_costs: number // Total costes directos: real_cost + direct_costs
    operational_costs: number // Gastos Operativos distribuidos (Fijos)
    gross_margin: number // Margen Bruto: revenue - total_direct_costs (OBSOLETO, usar net_margin)
    gross_margin_percent: number // % Margen Bruto (OBSOLETO, usar net_margin_percent)
    net_margin: number // Margen Neto: revenue - (real_cost + direct_costs + operational_costs)
    net_margin_percent: number // % Margen Neto
    real_margin: number // Margen real: revenue - real_cost (sin gastos directos)
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
 * Calculate cost breakdown for all clients in a date range
 * If endMonth/endYear not provided, defaults to a single month
 */
export async function calculateClientCostsForMonth(
    month: number,
    year: number,
    billingRate: number = DEFAULT_BILLING_RATE,
    endMonth?: number,
    endYear?: number
): Promise<ClientCostBreakdown[]> {
    try {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        
        // Si no se proporciona rango, usar solo el mes especificado
        let endDate: string
        if (endMonth && endYear) {
            const nextMonth = endMonth === 12 ? 1 : endMonth + 1
            const nextYear = endMonth === 12 ? endYear + 1 : endYear
            endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
        } else {
            const nextMonth = month === 12 ? 1 : month + 1
            const nextYear = month === 12 ? year + 1 : year
            endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
        }

        // Generar lista de meses en el rango para fees y costos directos
        const monthsInRange: Array<{ month: number; year: number }> = []
        let currentMonth = month
        let currentYear = year
        const finalMonth = endMonth || month
        const finalYear = endYear || year

        while (
            currentYear < finalYear ||
            (currentYear === finalYear && currentMonth <= finalMonth)
        ) {
            monthsInRange.push({ month: currentMonth, year: currentYear })
            if (currentMonth === 12) {
                currentMonth = 1
                currentYear++
            } else {
                currentMonth++
            }
        }

        // OPTIMIZATION: Load all data in parallel at once
        const [
            { data: clients, error: clientsError },
            { data: entries, error: entriesError },
            { data: employees, error: employeesError },
        ] = await Promise.all([
            // 1. Get all clients
            supabase
                .from('clients')
                .select('id, name'),
            
            // 2. Get all time entries for the date range
            supabase
                .from('time_entries')
                .select('client_id, employee_name, duration_hours, date')
                .gte('date', startDate)
                .lt('date', endDate),
            
            // 3. Get ALL employees (for cost lookup)
            supabase
                .from('employees')
                .select('id, name, hourly_cost')
                .eq('is_active', true),
        ])

        if (clientsError) throw clientsError
        if (entriesError) throw entriesError
        if (employeesError) throw employeesError

        // Obtener fees y costos directos para todos los meses del rango
        const feesPromises = monthsInRange.map(({ month: m, year: y }) =>
            supabase
                .from('client_monthly_goals')
                .select('client_id, fee, month, year')
                .eq('month', m)
                .eq('year', y)
        )

        const directCostsPromises = monthsInRange.map(({ month: m, year: y }) =>
            supabase
                .from('client_direct_costs')
                .select('client_id, amount, month, year')
                .eq('month', m)
                .eq('year', y)
        )

        const employeeCostsPromises = monthsInRange.map(({ month: m, year: y }) =>
            supabase
                .from('employee_monthly_costs')
                .select('employee_id, hourly_cost, month, year')
                .eq('month', m)
                .eq('year', y)
        )

        const feesResults = await Promise.all(feesPromises)
        const directCostsResults = await Promise.all(directCostsPromises)
        const employeeCostsResults = await Promise.all(employeeCostsPromises)

        // Consolidar todas las fees
        const allFees: Array<{ client_id: string; fee: number }> = []
        feesResults.forEach(({ data, error }) => {
            if (error) throw error
            if (data) {
                data.forEach(fee => allFees.push(fee))
            }
        })

        // Consolidar todos los costos directos
        const allDirectCosts: Array<{ client_id: string; amount: number }> = []
        directCostsResults.forEach(({ data, error }) => {
            if (error) throw error
            if (data) {
                data.forEach(cost => allDirectCosts.push(cost))
            }
        })

        // Consolidar todos los costos mensuales de empleados
        const allEmployeeMonthlyCosts: Array<{ employee_id: string; hourly_cost: number; month: number; year: number }> = []
        employeeCostsResults.forEach(({ data, error }) => {
            if (error) throw error
            if (data) {
                data.forEach(cost => allEmployeeMonthlyCosts.push(cost))
            }
        })

        // Build employee cost cache (name -> Map<month-year, hourly_cost>)
        // Para rangos, necesitamos tener el costo por empleado por cada mes
        const employeeIdToName = new Map<string, string>()
        employees?.forEach(emp => {
            employeeIdToName.set(emp.id, emp.name)
        })

        // Mapa: employee_name -> default hourly_cost
        const employeeDefaultCostCache = new Map<string, number>()
        employees?.forEach(emp => {
            employeeDefaultCostCache.set(emp.name, emp.hourly_cost)
        })

        // Mapa: employee_name -> Map<"year-month", hourly_cost>
        const employeeMonthlyCostCache = new Map<string, Map<string, number>>()
        allEmployeeMonthlyCosts.forEach(cost => {
            const empName = employeeIdToName.get(cost.employee_id)
            if (empName) {
                if (!employeeMonthlyCostCache.has(empName)) {
                    employeeMonthlyCostCache.set(empName, new Map())
                }
                const monthKey = `${cost.year}-${cost.month}`
                employeeMonthlyCostCache.get(empName)!.set(monthKey, cost.hourly_cost)
            }
        })

        // Función helper para obtener el costo de un empleado en una fecha específica
        const getEmployeeCostForDate = (employeeName: string, date: string): number => {
            const dateObj = new Date(date)
            const entryMonth = dateObj.getMonth() + 1
            const entryYear = dateObj.getFullYear()
            const monthKey = `${entryYear}-${entryMonth}`

            const monthlyCosts = employeeMonthlyCostCache.get(employeeName)
            if (monthlyCosts && monthlyCosts.has(monthKey)) {
                return monthlyCosts.get(monthKey)!
            }

            return employeeDefaultCostCache.get(employeeName) || FALLBACK_COST_RATE
        }

        // Create revenue map (aggregate fees by client across all months)
        const revenueMap = new Map<string, number>()
        allFees.forEach(fee => {
            const current = revenueMap.get(fee.client_id) || 0
            revenueMap.set(fee.client_id, current + fee.fee)
        })

        // Create direct costs map (aggregate across all months)
        const directCostsMap = new Map<string, number>()
        allDirectCosts.forEach(cost => {
            const current = directCostsMap.get(cost.client_id) || 0
            directCostsMap.set(cost.client_id, current + cost.amount)
        })

        // Build client map
        const clientMap = new Map<string, {
            id: string
            name: string
            revenue: number
            hours: number
            employeeHours: Map<string, Array<{ hours: number; date: string }>> // employee_name -> [{hours, date}]
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

        // Add aggregated revenue
        revenueMap.forEach((revenue, clientId) => {
            const client = clientMap.get(clientId)
            if (client) {
                client.revenue = revenue
            }
        })

        // Crear Set con nombres de empleados activos (solo empleados con perfil creado)
        const activeEmployeeNames = new Set(employees?.map(e => e.name) || [])

        // Add time entries and aggregate by employee (guardando fecha para calcular costo correcto)
        // SOLO incluir empleados que tienen perfil creado
        entries?.forEach(entry => {
            if (!entry.client_id) return
            
            // Excluir empleados sin perfil creado
            if (!activeEmployeeNames.has(entry.employee_name)) return
            
            const client = clientMap.get(entry.client_id)
            if (!client) return

            client.hours += entry.duration_hours

            const currentEntries = client.employeeHours.get(entry.employee_name) || []
            currentEntries.push({ hours: entry.duration_hours, date: entry.date })
            client.employeeHours.set(entry.employee_name, currentEntries)
        })

        // 6. Obtener costes operativos del mes/rango
        const operationalCostsPromises = monthsInRange.map(({ month: m, year: y }) =>
            supabase
                .from('monthly_operational_costs')
                .select('amount, distribution_method, month, year')
                .eq('month', m)
                .eq('year', y)
                .maybeSingle()
        )

        const operationalCostsResults = await Promise.all(operationalCostsPromises)
        
        // Consolidar costes operativos totales
        let totalOperationalCosts = 0
        let distributionMethodValue: string = 'revenue' // Default
        
        operationalCostsResults.forEach(({ data, error }) => {
            if (error) throw error
            if (data) {
                totalOperationalCosts += data.amount
                // Usar el método de distribución del primer mes encontrado
                // (asumimos que todos los meses usan el mismo método)
                if (data.distribution_method) {
                    distributionMethodValue = data.distribution_method
                }
            }
        })
        
        const distributionMethod = (distributionMethodValue === 'workload' ? 'workload' : 'revenue') as 'revenue' | 'workload'

        // 7. Calculate costs for each client
        const results: ClientCostBreakdown[] = []

        // Calcular totales para distribución proporcional
        let totalRevenue = 0
        let totalHours = 0
        
        for (const [clientId, client] of clientMap.entries()) {
            if (client.revenue === 0 && client.hours === 0) continue
            totalRevenue += client.revenue
            totalHours += client.hours
        }

        for (const [clientId, client] of clientMap.entries()) {
            // Skip clients with no activity
            if (client.revenue === 0 && client.hours === 0) continue

            // Calculate estimated hours (what we "should" have used based on billing)
            const estimatedHours = client.revenue > 0 ? client.revenue / billingRate : 0

            // Calculate real cost by employee (Coste Personal Directo)
            // Ahora considerando el costo por fecha para rangos de meses
            let realCost = 0
            const employeeBreakdown = []

            for (const [employeeName, entries] of client.employeeHours.entries()) {
                let totalHoursForEmployee = 0
                let totalCostForEmployee = 0

                // Calcular costo por cada entrada (usando el costo de ese mes específico)
                entries.forEach(({ hours, date }) => {
                    const hourlyCost = getEmployeeCostForDate(employeeName, date)
                    totalHoursForEmployee += hours
                    totalCostForEmployee += hours * hourlyCost
                })

                realCost += totalCostForEmployee

                // Calcular costo promedio por hora para este empleado en este cliente
                const avgHourlyCost = totalHoursForEmployee > 0 
                    ? totalCostForEmployee / totalHoursForEmployee 
                    : 0

                employeeBreakdown.push({
                    employee_name: employeeName,
                    hours: totalHoursForEmployee,
                    hourly_cost: avgHourlyCost,
                    total_cost: totalCostForEmployee
                })
            }

            // Get direct costs for this client (Gastos Directos Variables)
            const directCosts = directCostsMap.get(clientId) || 0

            // Calculate operational costs distributed to this client
            let operationalCostsForClient = 0
            if (totalOperationalCosts > 0) {
                switch (distributionMethod) {
                    case 'revenue':
                        if (totalRevenue > 0) {
                            // Distribuir por facturación
                            operationalCostsForClient = (client.revenue / totalRevenue) * totalOperationalCosts
                        }
                        break
                    case 'workload':
                        if (totalHours > 0) {
                            // Distribuir por carga de trabajo (horas)
                            operationalCostsForClient = (client.hours / totalHours) * totalOperationalCosts
                        }
                        break
                }
            }

            // Calculate metrics
            const estimatedCost = client.hours * FALLBACK_COST_RATE // Coste si usáramos tarifa estándar
            const hoursDeviation = estimatedHours - client.hours
            const hoursDeviationPercent = estimatedHours > 0 ? (hoursDeviation / estimatedHours) * 100 : 0
            
            // Costes Directos Totales = Coste Personal + Gastos Directos
            const totalDirectCosts = realCost + directCosts
            
            // Margen Bruto = Ingresos - Costes Directos Totales (OBSOLETO)
            const grossMargin = client.revenue - totalDirectCosts
            const grossMarginPercent = client.revenue > 0 ? (grossMargin / client.revenue) * 100 : 0
            
            // Margen Neto = Ingresos - (Coste Personal + Gastos Directos + Gastos Operativos)
            const netMargin = client.revenue - (realCost + directCosts + operationalCostsForClient)
            const netMarginPercent = client.revenue > 0 ? (netMargin / client.revenue) * 100 : 0
            
            // Margen Real (sin gastos directos, solo coste personal)
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
                real_cost: realCost, // Coste Personal Directo
                estimated_cost: estimatedCost,
                direct_costs: directCosts, // Gastos Directos del Cliente
                total_direct_costs: totalDirectCosts, // Total Costes Directos
                operational_costs: operationalCostsForClient, // Gastos Operativos distribuidos
                gross_margin: grossMargin, // Margen Bruto (OBSOLETO)
                gross_margin_percent: grossMarginPercent, // % Margen Bruto (OBSOLETO)
                net_margin: netMargin, // Margen Neto
                net_margin_percent: netMarginPercent, // % Margen Neto
                real_margin: realMargin, // Margen sin gastos directos
                real_margin_percent: realMarginPercent, // % Margen sin gastos directos
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
 * Calculate aggregated metrics for a date range
 * If endMonth/endYear not provided, defaults to a single month
 */
export async function calculateMonthlyMetrics(
    month: number, 
    year: number,
    endMonth?: number,
    endYear?: number
) {
    const clientCosts = await calculateClientCostsForMonth(month, year, DEFAULT_BILLING_RATE, endMonth, endYear)

    const totals = clientCosts.reduce((acc, client) => ({
        totalRevenue: acc.totalRevenue + client.revenue,
        totalEstimatedHours: acc.totalEstimatedHours + client.estimated_hours,
        totalActualHours: acc.totalActualHours + client.actual_hours,
        totalRealCost: acc.totalRealCost + client.real_cost,
        totalEstimatedCost: acc.totalEstimatedCost + client.estimated_cost,
        totalDirectCosts: acc.totalDirectCosts + client.direct_costs,
        totalCostsDirectTotal: acc.totalCostsDirectTotal + client.total_direct_costs,
        totalOperationalCosts: acc.totalOperationalCosts + client.operational_costs,
        totalGrossMargin: acc.totalGrossMargin + client.gross_margin,
        totalNetMargin: acc.totalNetMargin + client.net_margin,
        totalRealMargin: acc.totalRealMargin + client.real_margin
    }), {
        totalRevenue: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        totalRealCost: 0,
        totalEstimatedCost: 0,
        totalDirectCosts: 0,
        totalCostsDirectTotal: 0,
        totalOperationalCosts: 0,
        totalGrossMargin: 0,
        totalNetMargin: 0,
        totalRealMargin: 0
    })

    return {
        ...totals,
        totalHoursDeviation: totals.totalEstimatedHours - totals.totalActualHours,
        totalGrossMarginPercent: totals.totalRevenue > 0 ? (totals.totalGrossMargin / totals.totalRevenue) * 100 : 0,
        totalNetMarginPercent: totals.totalRevenue > 0 ? (totals.totalNetMargin / totals.totalRevenue) * 100 : 0,
        totalRealMarginPercent: totals.totalRevenue > 0 ? (totals.totalRealMargin / totals.totalRevenue) * 100 : 0,
        averageRealCostPerHour: totals.totalActualHours > 0 ? totals.totalRealCost / totals.totalActualHours : 0,
        clientCount: clientCosts.length
    }
}

/**
 * Calculate employee profitability for a date range
 * Shows cost vs revenue generated by each employee
 * Revenue is distributed proportionally based on real client fees
 * If endMonth/endYear not provided, defaults to a single month
 */
export async function calculateEmployeeProfitability(
    month: number,
    year: number,
    billingRate: number = DEFAULT_BILLING_RATE,
    endMonth?: number,
    endYear?: number
) {
    try {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        
        let endDate: string
        if (endMonth && endYear) {
            const nextMonth = endMonth === 12 ? 1 : endMonth + 1
            const nextYear = endMonth === 12 ? endYear + 1 : endYear
            endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
        } else {
            const nextMonth = month === 12 ? 1 : month + 1
            const nextYear = month === 12 ? year + 1 : year
            endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
        }

        // Generar lista de meses en el rango
        const monthsInRange: Array<{ month: number; year: number }> = []
        let currentMonth = month
        let currentYear = year
        const finalMonth = endMonth || month
        const finalYear = endYear || year

        while (
            currentYear < finalYear ||
            (currentYear === finalYear && currentMonth <= finalMonth)
        ) {
            monthsInRange.push({ month: currentMonth, year: currentYear })
            if (currentMonth === 12) {
                currentMonth = 1
                currentYear++
            } else {
                currentMonth++
            }
        }

        // OPTIMIZATION: Load all data in parallel
        const [
            { data: employees, error: employeesError },
            { data: timeEntries, error: entriesError },
            { data: clients, error: clientsError },
            { data: allEmployees, error: allEmpError },
        ] = await Promise.all([
            // 1. Get all active employees
            supabase
                .from('employees')
                .select('id, name, monthly_hours, hourly_cost')
                .eq('is_active', true),
            
            // 2. Get all time entries for the date range
            supabase
                .from('time_entries')
                .select('employee_name, duration_hours, client_id, date')
                .gte('date', startDate)
                .lt('date', endDate),
            
            // 3. Get all clients
            supabase
                .from('clients')
                .select('id, name'),
            
            // 4. Get ALL employees with hourly cost
            supabase
                .from('employees')
                .select('id, name, hourly_cost')
                .eq('is_active', true),
        ])

        if (employeesError) throw employeesError
        if (entriesError) throw entriesError
        if (clientsError) throw clientsError
        if (allEmpError) throw allEmpError

        // Obtener monthly hours y hourly costs para todos los meses del rango
        const monthlyCostsPromises = monthsInRange.map(({ month: m, year: y }) =>
            supabase
                .from('employee_monthly_costs')
                .select('employee_id, monthly_hours, hourly_cost, month, year')
                .eq('month', m)
                .eq('year', y)
        )

        const clientFeesPromises = monthsInRange.map(({ month: m, year: y }) =>
            supabase
                .from('client_monthly_goals')
                .select('client_id, fee, month, year')
                .eq('month', m)
                .eq('year', y)
        )

        const monthlyCostsResults = await Promise.all(monthlyCostsPromises)
        const clientFeesResults = await Promise.all(clientFeesPromises)

        // Consolidar monthly costs
        const allMonthlyCosts: Array<{ employee_id: string; monthly_hours: number; hourly_cost: number; month: number; year: number }> = []
        monthlyCostsResults.forEach(({ data, error }) => {
            if (error) throw error
            if (data) {
                data.forEach(cost => allMonthlyCosts.push(cost))
            }
        })

        // Consolidar client fees
        const allClientFees: Array<{ client_id: string; fee: number }> = []
        clientFeesResults.forEach(({ data, error }) => {
            if (error) throw error
            if (data) {
                data.forEach(fee => allClientFees.push(fee))
            }
        })

        if (!employees || employees.length === 0) {
            return []
        }

        // Build employee ID to name mapping
        const employeeIdToName = new Map<string, string>()
        allEmployees?.forEach(emp => {
            employeeIdToName.set(emp.id, emp.name)
        })

        // Build employee default cost cache
        const employeeDefaultCostCache = new Map<string, number>()
        allEmployees?.forEach(emp => {
            employeeDefaultCostCache.set(emp.name, emp.hourly_cost)
        })

        // Build employee monthly cost cache: name -> Map<"year-month", hourly_cost>
        const employeeMonthlyCostCache = new Map<string, Map<string, number>>()
        allMonthlyCosts.forEach(cost => {
            const empName = employeeIdToName.get(cost.employee_id)
            if (empName) {
                if (!employeeMonthlyCostCache.has(empName)) {
                    employeeMonthlyCostCache.set(empName, new Map())
                }
                const monthKey = `${cost.year}-${cost.month}`
                employeeMonthlyCostCache.get(empName)!.set(monthKey, cost.hourly_cost)
            }
        })

        // Helper function to get employee cost for a specific date
        const getEmployeeCostForDate = (employeeName: string, date: string): number => {
            const dateObj = new Date(date)
            const entryMonth = dateObj.getMonth() + 1
            const entryYear = dateObj.getFullYear()
            const monthKey = `${entryYear}-${entryMonth}`

            const monthlyCosts = employeeMonthlyCostCache.get(employeeName)
            if (monthlyCosts && monthlyCosts.has(monthKey)) {
                return monthlyCosts.get(monthKey)!
            }

            return employeeDefaultCostCache.get(employeeName) || FALLBACK_COST_RATE
        }

        // Build monthly hours map (aggregate across all months in range)
        // Para rangos, sumamos las horas esperadas de cada mes
        const employeeExpectedHoursMap = new Map<string, number>()
        employees.forEach(emp => {
            // Calcular horas esperadas totales para el rango
            let totalExpectedHours = 0
            
            monthsInRange.forEach(({ month: m, year: y }) => {
                const monthKey = `${y}-${m}`
                // Buscar override para este mes
                const override = allMonthlyCosts.find(
                    cost => cost.employee_id === emp.id && 
                    cost.month === m && 
                    cost.year === y
                )
                totalExpectedHours += override ? override.monthly_hours : emp.monthly_hours
            })
            
            employeeExpectedHoursMap.set(emp.id, totalExpectedHours)
        })

        const clientsMap = new Map(clients?.map(c => [c.id, c.name]) || [])
        
        // Aggregate client fees across all months
        const clientFeesMap = new Map<string, number>()
        allClientFees.forEach(fee => {
            const current = clientFeesMap.get(fee.client_id) || 0
            clientFeesMap.set(fee.client_id, current + fee.fee)
        })

        // Crear Set con nombres de empleados activos (solo empleados con perfil creado)
        const activeEmployeeNames = new Set(employees?.map(e => e.name) || [])

        // Calculate total hours per client (for proportional distribution)
        // SOLO incluir horas de empleados con perfil creado
        const clientTotalHoursMap = new Map<string, number>()
        timeEntries?.forEach(entry => {
            if (entry.client_id && activeEmployeeNames.has(entry.employee_name)) {
                const current = clientTotalHoursMap.get(entry.client_id) || 0
                clientTotalHoursMap.set(entry.client_id, current + entry.duration_hours)
            }
        })

        // Build employee profitability data
        const employeeProfitability = []

        for (const employee of employees) {
            // Get expected hours (aggregated for the range)
            const expectedHours = employeeExpectedHoursMap.get(employee.id) || employee.monthly_hours

            // Get all time entries for this employee
            const employeeEntries = timeEntries?.filter(e => e.employee_name === employee.name) || []
            
            if (employeeEntries.length === 0) {
                // Skip employees with no hours
                continue
            }

            // Calculate total hours and cost (usando costo por fecha)
            let totalHours = 0
            let employeeCost = 0

            employeeEntries.forEach(entry => {
                totalHours += entry.duration_hours
                const hourlyCost = getEmployeeCostForDate(employee.name, entry.date)
                employeeCost += entry.duration_hours * hourlyCost
            })

            // Calcular costo promedio por hora para este empleado
            const avgHourlyCost = totalHours > 0 ? employeeCost / totalHours : 0

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
 * Calculate employee hours progress for a date range
 * Compares actual hours worked vs expected monthly hours (aggregated for range)
 * If endMonth/endYear not provided, defaults to a single month
 */
export async function calculateEmployeeHoursProgress(
    month: number, 
    year: number,
    endMonth?: number,
    endYear?: number
) {
    try {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        
        let endDate: string
        if (endMonth && endYear) {
            const nextMonth = endMonth === 12 ? 1 : endMonth + 1
            const nextYear = endMonth === 12 ? endYear + 1 : endYear
            endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
        } else {
            const nextMonth = month === 12 ? 1 : month + 1
            const nextYear = month === 12 ? year + 1 : year
            endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
        }

        // Generar lista de meses en el rango
        const monthsInRange: Array<{ month: number; year: number }> = []
        let currentMonth = month
        let currentYear = year
        const finalMonth = endMonth || month
        const finalYear = endYear || year

        while (
            currentYear < finalYear ||
            (currentYear === finalYear && currentMonth <= finalMonth)
        ) {
            monthsInRange.push({ month: currentMonth, year: currentYear })
            if (currentMonth === 12) {
                currentMonth = 1
                currentYear++
            } else {
                currentMonth++
            }
        }

        // OPTIMIZATION: Load all data in parallel
        const [
            { data: employees, error: employeesError },
            { data: timeEntries, error: entriesError }
        ] = await Promise.all([
            // 1. Get all active employees with their expected hours
            supabase
                .from('employees')
                .select('id, name, monthly_hours')
                .eq('is_active', true),
            
            // 2. Get all time entries for the date range
            supabase
                .from('time_entries')
                .select('employee_name, duration_hours')
                .gte('date', startDate)
                .lt('date', endDate)
        ])

        if (employeesError) throw employeesError
        if (entriesError) throw entriesError

        if (!employees || employees.length === 0) {
            return []
        }

        // Get monthly costs for all months in range
        const monthlyCostsPromises = monthsInRange.map(({ month: m, year: y }) =>
            supabase
                .from('employee_monthly_costs')
                .select('employee_id, monthly_hours, month, year')
                .eq('month', m)
                .eq('year', y)
        )

        const monthlyCostsResults = await Promise.all(monthlyCostsPromises)

        // Consolidar monthly costs
        const allMonthlyCosts: Array<{ employee_id: string; monthly_hours: number; month: number; year: number }> = []
        monthlyCostsResults.forEach(({ data, error }) => {
            if (error) throw error
            if (data) {
                data.forEach(cost => allMonthlyCosts.push(cost))
            }
        })

        // Create a map of expected hours (aggregated for the range)
        const employeeExpectedHoursMap = new Map<string, number>()
        employees.forEach(emp => {
            let totalExpectedHours = 0
            
            monthsInRange.forEach(({ month: m, year: y }) => {
                // Buscar override para este mes
                const override = allMonthlyCosts.find(
                    cost => cost.employee_id === emp.id && 
                    cost.month === m && 
                    cost.year === y
                )
                totalExpectedHours += override ? override.monthly_hours : emp.monthly_hours
            })
            
            employeeExpectedHoursMap.set(emp.id, totalExpectedHours)
        })

        // Crear Set con nombres de empleados activos (solo empleados con perfil creado)
        const activeEmployeeNames = new Set(employees?.map(e => e.name) || [])

        // Aggregate hours by employee name
        // SOLO incluir horas de empleados con perfil creado
        const actualHoursMap = new Map<string, number>()
        timeEntries?.forEach(entry => {
            if (activeEmployeeNames.has(entry.employee_name)) {
                const current = actualHoursMap.get(entry.employee_name) || 0
                actualHoursMap.set(entry.employee_name, current + entry.duration_hours)
            }
        })

        // Build the progress data
        const progressData = employees.map(employee => {
            // Get expected hours (aggregated for the range)
            const expectedHours = employeeExpectedHoursMap.get(employee.id) || employee.monthly_hours
            
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
