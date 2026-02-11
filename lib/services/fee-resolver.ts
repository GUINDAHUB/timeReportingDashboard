/**
 * Fee Resolver Service
 * 
 * Critical business logic: Determine the correct fee for a client in a specific month.
 * 
 * Logic:
 * 1. Check if client_monthly_goals has an entry for the client/month/year
 * 2. If yes, use that fee
 * 3. If no, return null (client was not active that month)
 */

import { supabase } from '@/lib/supabase/client'
import { ClientMonthlyGoal } from '@/lib/types'

export interface FeeResolution {
    fee: number | null
    source: 'monthly_goal' | 'none'
    monthly_goal_id?: string
}

/**
 * Get the applicable fee for a client in a specific month/year
 * Returns null if client has no fee configured for that month
 */
export async function getFeeForMonth(
    clientId: string,
    month: number,
    year: number
): Promise<FeeResolution> {
    try {
        // Try to find a monthly goal
        const { data: monthlyGoal, error: goalError } = await supabase
            .from('client_monthly_goals')
            .select('*')
            .eq('client_id', clientId)
            .eq('month', month)
            .eq('year', year)
            .single()

        if (!goalError && monthlyGoal) {
            return {
                fee: monthlyGoal.fee,
                source: 'monthly_goal',
                monthly_goal_id: monthlyGoal.id,
            }
        }

        // No fee configured for this month
        return {
            fee: null,
            source: 'none',
        }
    } catch (error) {
        console.error('Error resolving fee:', error)
        throw error
    }
}

/**
 * Get fees for multiple clients in a specific month
 * More efficient than calling getFeeForMonth multiple times
 * Returns null for clients with no fee configured for that month
 */
export async function getFeesForClients(
    clientIds: string[],
    month: number,
    year: number
): Promise<Map<string, FeeResolution>> {
    const feesMap = new Map<string, FeeResolution>()

    // Fetch all monthly goals for this period
    const { data: monthlyGoals } = await supabase
        .from('client_monthly_goals')
        .select('*')
        .in('client_id', clientIds)
        .eq('month', month)
        .eq('year', year)

    // Create a map of monthly goals
    const goalsMap = new Map<string, ClientMonthlyGoal>()
    monthlyGoals?.forEach(goal => {
        goalsMap.set(goal.client_id, goal)
    })

    // Resolve fee for each client
    clientIds.forEach(clientId => {
        const goal = goalsMap.get(clientId)

        if (goal) {
            feesMap.set(clientId, {
                fee: goal.fee,
                source: 'monthly_goal',
                monthly_goal_id: goal.id,
            })
        } else {
            // No fee configured for this month
            feesMap.set(clientId, {
                fee: null,
                source: 'none',
            })
        }
    })

    return feesMap
}

/**
 * Update or create a monthly goal for a client
 */
export async function setMonthlyFee(
    clientId: string,
    month: number,
    year: number,
    fee: number,
    expectedHours?: number
): Promise<ClientMonthlyGoal> {
    // Try to update existing
    const { data: existing } = await supabase
        .from('client_monthly_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('month', month)
        .eq('year', year)
        .single()

    if (existing) {
        // Update
        const { data, error } = await supabase
            .from('client_monthly_goals')
            .update({
                fee,
                expected_hours: expectedHours,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single()

        if (error) throw error
        return data
    } else {
        // Insert new
        const { data, error } = await supabase
            .from('client_monthly_goals')
            .insert({
                client_id: clientId,
                month,
                year,
                fee,
                expected_hours: expectedHours,
            })
            .select()
            .single()

        if (error) throw error
        return data
    }
}

/**
 * Get all monthly goals for a client (for historical view)
 */
export async function getClientMonthlyGoals(clientId: string): Promise<ClientMonthlyGoal[]> {
    const { data, error } = await supabase
        .from('client_monthly_goals')
        .select('*')
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

    if (error) throw error
    return data || []
}
