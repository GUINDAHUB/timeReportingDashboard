/**
 * Uncategorized Tasks Service
 * 
 * Manages tasks that haven't been automatically categorized
 */

import { supabase } from '@/lib/supabase/client'
import { UncategorizedTaskSummary, CategoryAssignmentHistory } from '@/lib/types'

/**
 * Get all uncategorized tasks with details
 */
export async function getUncategorizedTasks(
    status: 'pending' | 'reviewed' | 'ignored' | 'all' = 'pending'
): Promise<UncategorizedTaskSummary[]> {
    try {
        // Try to use the view first
        let query = supabase
            .from('uncategorized_tasks_summary')
            .select('*')
            .order('created_at', { ascending: false })

        if (status !== 'all') {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error loading from uncategorized_tasks_summary:', error)
            // If view doesn't exist, return empty array
            // The view is created in migrations, so this is expected if not migrated
            return []
        }

        return data || []
    } catch (error) {
        console.error('Unexpected error in getUncategorizedTasks:', error)
        return []
    }
}

/**
 * Get count of pending uncategorized tasks
 */
export async function getUncategorizedTasksCount(): Promise<number> {
    const { count, error } = await supabase
        .from('uncategorized_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    if (error) throw error

    return count || 0
}

/**
 * Assign category to a task manually
 */
export async function assignCategoryToTask(
    timeEntryId: string,
    categoryId: string,
    assignedBy: string,
    notes?: string
): Promise<void> {
    try {
        // Get current category
        const { data: timeEntry, error: entryError } = await supabase
            .from('time_entries')
            .select('category_id')
            .eq('id', timeEntryId)
            .single()

        if (entryError) {
            console.error('Error fetching time entry:', entryError)
            throw new Error(`No se pudo encontrar la tarea: ${entryError.message}`)
        }

        // Update time entry with new category
        const { error: updateError } = await supabase
            .from('time_entries')
            .update({ category_id: categoryId })
            .eq('id', timeEntryId)

        if (updateError) {
            console.error('Error updating time entry:', updateError)
            throw new Error(`Error al actualizar la categoría: ${updateError.message}`)
        }

        // Try to record assignment history (optional - may fail if migration not run)
        try {
            await supabase
                .from('category_assignments_history')
                .insert({
                    time_entry_id: timeEntryId,
                    old_category_id: timeEntry.category_id,
                    new_category_id: categoryId,
                    assignment_type: 'manual',
                    assigned_by: assignedBy,
                    notes: notes || null
                })
        } catch (historyError) {
            // Non-critical error - just log it
            console.warn('Could not record assignment history (table may not exist):', historyError)
        }

        // Try to mark as reviewed in uncategorized_tasks (optional - may fail if migration not run)
        try {
            await supabase
                .from('uncategorized_tasks')
                .update({
                    status: 'reviewed',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: assignedBy
                })
                .eq('time_entry_id', timeEntryId)
        } catch (reviewError) {
            // Non-critical error - just log it
            console.warn('Could not update uncategorized_tasks (table may not exist):', reviewError)
        }
    } catch (error: any) {
        console.error('Error in assignCategoryToTask:', error)
        throw error
    }
}

/**
 * Bulk assign categories to multiple tasks
 */
export async function bulkAssignCategories(
    assignments: Array<{ timeEntryId: string; categoryId: string }>,
    assignedBy: string
): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const { timeEntryId, categoryId } of assignments) {
        try {
            await assignCategoryToTask(timeEntryId, categoryId, assignedBy, 'Bulk assignment')
            success++
        } catch (error) {
            console.error(`Failed to assign category for entry ${timeEntryId}:`, error)
            failed++
        }
    }

    return { success, failed }
}

/**
 * Mark task as ignored (won't appear in pending list)
 */
export async function ignoreUncategorizedTask(
    uncategorizedTaskId: string,
    reviewedBy: string
): Promise<void> {
    const { error } = await supabase
        .from('uncategorized_tasks')
        .update({
            status: 'ignored',
            reviewed_at: new Date().toISOString(),
            reviewed_by: reviewedBy
        })
        .eq('id', uncategorizedTaskId)

    if (error) throw error
}

/**
 * Add keyword from manual assignment
 * Learns from manual categorization
 */
export async function learnFromAssignment(
    taskName: string,
    categoryId: string,
    priority: number = 5
): Promise<{ keyword: string; created: boolean }> {
    // Extract most significant word from task name (simple heuristic)
    const words = taskName.toLowerCase()
        .split(/[\s,.-]+/)
        .filter(w => w.length > 3) // Only meaningful words

    if (words.length === 0) {
        throw new Error('No suitable keyword found in task name')
    }

    // Use the first meaningful word as keyword
    const keyword = words[0]

    // Check if keyword already exists
    const { data: existing } = await supabase
        .from('keywords')
        .select('id')
        .eq('word', keyword)
        .eq('category_id', categoryId)
        .maybeSingle()

    if (existing) {
        return { keyword, created: false }
    }

    // Create new keyword
    const { error } = await supabase
        .from('keywords')
        .insert({
            category_id: categoryId,
            word: keyword,
            priority: priority
        })

    if (error) throw error

    return { keyword, created: true }
}

/**
 * Get assignment history for a time entry
 */
export async function getAssignmentHistory(
    timeEntryId: string
): Promise<CategoryAssignmentHistory[]> {
    const { data, error } = await supabase
        .from('category_assignments_history')
        .select('*')
        .eq('time_entry_id', timeEntryId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
}

/**
 * Get tasks grouped by suggested pattern for bulk assignment
 */
export async function getTasksByPattern(
    pattern: string
): Promise<UncategorizedTaskSummary[]> {
    const { data, error } = await supabase
        .from('uncategorized_tasks_summary')
        .select('*')
        .eq('status', 'pending')
        .ilike('task_name', `%${pattern}%`)
        .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
}
