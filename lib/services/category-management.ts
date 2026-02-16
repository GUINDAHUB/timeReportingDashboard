/**
 * Category Management Service
 * 
 * CRUD operations for categories and keywords
 */

import { supabase } from '@/lib/supabase/client'
import { Category, CategoryHierarchical, Keyword } from '@/lib/types'
import { invalidateCache } from './categorizer'

/**
 * Create a new category
 */
export async function createCategory(category: {
    name: string
    description?: string
    color: string
    emoji?: string
    parent_id?: string | null
    sort_order?: number
}): Promise<Category> {
    const { data, error } = await supabase
        .from('categories')
        .insert({
            name: category.name,
            description: category.description || null,
            color: category.color,
            emoji: category.emoji || null,
            parent_id: category.parent_id || null,
            sort_order: category.sort_order || 0,
            is_default: false
        })
        .select()
        .single()

    if (error) throw error

    invalidateCache()
    return data
}

/**
 * Update an existing category
 */
export async function updateCategory(
    categoryId: string,
    updates: {
        name?: string
        description?: string
        color?: string
        emoji?: string
        sort_order?: number
        parent_id?: string | null
    }
): Promise<Category> {
    const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single()

    if (error) throw error

    invalidateCache()
    return data
}

/**
 * Delete a category
 * Note: This will cascade delete to keywords and set time_entries.category_id to NULL
 */
export async function deleteCategory(categoryId: string): Promise<void> {
    // Check if it's the default category
    const { data: category } = await supabase
        .from('categories')
        .select('is_default')
        .eq('id', categoryId)
        .single()

    if (category?.is_default) {
        throw new Error('Cannot delete the default "Sin Clasificar" category')
    }

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

    if (error) throw error

    invalidateCache()
}

/**
 * Reorder categories (update sort_order)
 */
export async function reorderCategories(
    categoryIds: string[]
): Promise<void> {
    const updates = categoryIds.map((id, index) => ({
        id,
        sort_order: index * 10
    }))

    for (const update of updates) {
        await supabase
            .from('categories')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
    }

    invalidateCache()
}

/**
 * Create a new keyword
 */
export async function createKeyword(keyword: {
    category_id: string
    word: string
    priority?: number
}): Promise<Keyword> {
    const { data, error } = await supabase
        .from('keywords')
        .insert({
            category_id: keyword.category_id,
            word: keyword.word.toLowerCase().trim(),
            priority: keyword.priority || 0
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            throw new Error('Esta keyword ya existe para esta categoría')
        }
        throw error
    }

    invalidateCache()
    return data
}

/**
 * Update a keyword
 */
export async function updateKeyword(
    keywordId: string,
    updates: {
        word?: string
        category_id?: string
        priority?: number
    }
): Promise<Keyword> {
    const cleanUpdates: any = { ...updates }
    if (cleanUpdates.word) {
        cleanUpdates.word = cleanUpdates.word.toLowerCase().trim()
    }

    const { data, error } = await supabase
        .from('keywords')
        .update(cleanUpdates)
        .eq('id', keywordId)
        .select()
        .single()

    if (error) throw error

    invalidateCache()
    return data
}

/**
 * Delete a keyword
 */
export async function deleteKeyword(keywordId: string): Promise<void> {
    const { error } = await supabase
        .from('keywords')
        .delete()
        .eq('id', keywordId)

    if (error) throw error

    invalidateCache()
}

/**
 * Bulk create keywords for a category
 */
export async function bulkCreateKeywords(
    categoryId: string,
    words: string[],
    priority: number = 0
): Promise<Keyword[]> {
    const keywords = words.map(word => ({
        category_id: categoryId,
        word: word.toLowerCase().trim(),
        priority
    }))

    const { data, error } = await supabase
        .from('keywords')
        .insert(keywords)
        .select()

    if (error) throw error

    invalidateCache()
    return data || []
}

/**
 * Get all keywords for a category
 */
export async function getKeywordsByCategory(
    categoryId: string
): Promise<Keyword[]> {
    const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('category_id', categoryId)
        .order('priority', { ascending: false })
        .order('word')

    if (error) throw error

    return data || []
}

/**
 * Search keywords
 */
export async function searchKeywords(
    searchTerm: string
): Promise<Array<Keyword & { category_name: string; category_color: string }>> {
    const { data, error } = await supabase
        .from('keywords')
        .select(`
            *,
            categories!inner (
                name,
                color
            )
        `)
        .ilike('word', `%${searchTerm}%`)
        .order('priority', { ascending: false })

    if (error) throw error

    return (data || []).map((item: any) => ({
        ...item,
        category_name: item.categories.name,
        category_color: item.categories.color
    }))
}

/**
 * Get category usage statistics
 */
export async function getCategoryStats(categoryId: string): Promise<{
    total_hours: number
    entry_count: number
    employee_count: number
    date_range: { start: string; end: string } | null
}> {
    // Obtener empleados activos con perfil creado
    const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('name')
        .eq('is_active', true)

    if (employeesError) throw employeesError

    const activeEmployeeNames = new Set(employees?.map(e => e.name) || [])

    const { data, error } = await supabase
        .from('time_entries')
        .select('duration_hours, employee_name, date')
        .eq('category_id', categoryId)

    if (error) throw error

    // Filtrar solo empleados con perfil creado
    const filteredData = data?.filter(entry => activeEmployeeNames.has(entry.employee_name)) || []

    if (filteredData.length === 0) {
        return {
            total_hours: 0,
            entry_count: 0,
            employee_count: 0,
            date_range: null
        }
    }

    const totalHours = filteredData.reduce((sum, entry) => sum + entry.duration_hours, 0)
    const uniqueEmployees = new Set(filteredData.map(e => e.employee_name))
    const dates = filteredData.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime())

    return {
        total_hours: totalHours,
        entry_count: filteredData.length,
        employee_count: uniqueEmployees.size,
        date_range: {
            start: dates[0].toISOString(),
            end: dates[dates.length - 1].toISOString()
        }
    }
}

/**
 * Duplicate a category with all its keywords
 */
export async function duplicateCategory(
    categoryId: string,
    newName: string
): Promise<Category> {
    // Get original category
    const { data: original, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single()

    if (fetchError) throw fetchError

    // Create new category
    const newCategory = await createCategory({
        name: newName,
        description: original.description || undefined,
        color: original.color,
        emoji: original.emoji || undefined,
        parent_id: original.parent_id,
        sort_order: original.sort_order + 1
    })

    // Duplicate keywords
    const keywords = await getKeywordsByCategory(categoryId)
    if (keywords.length > 0) {
        await bulkCreateKeywords(
            newCategory.id,
            keywords.map(k => k.word),
            keywords[0].priority
        )
    }

    return newCategory
}
