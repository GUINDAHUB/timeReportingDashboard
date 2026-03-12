/**
 * Categorizer Service
 * 
 * Auto-categorizes tasks based on keyword matching with hierarchical categories
 * Implements strict matching: only assigns if keyword found, otherwise returns null
 * 
 * Matching de keywords:
 * - Palabras sueltas (ej. "ia") se comparan como palabra completa, no como substring
 *   para evitar falsos positivos tipo "borgIA".
 * - Keywords con espacios (frases) se siguen buscando como substring.
 */

import { supabase } from '@/lib/supabase/client'
import { Category, Keyword, CategoryHierarchical } from '@/lib/types'

interface CategoryCache {
    categories: CategoryHierarchical[]
    keywords: Keyword[]
    defaultCategoryId: string | null
    lastFetch: number
}

let cache: CategoryCache | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Load categories and keywords from database
 * Uses hierarchical view and sorts keywords by priority
 */
async function loadCategorizationData(): Promise<CategoryCache> {
    const now = Date.now()

    // Return cached data if still valid
    if (cache && (now - cache.lastFetch) < CACHE_TTL) {
        return cache
    }

    // Fetch categories using hierarchical view
    const { data: categories, error: catError } = await supabase
        .from('categories_hierarchical')
        .select('*')
        .order('sort_order')

    if (catError) throw catError

    // Fetch keywords ordered by priority (highest first)
    const { data: keywords, error: keyError } = await supabase
        .from('keywords')
        .select('*')
        .order('priority', { ascending: false })

    if (keyError) throw keyError

    // Find default "Sin Clasificar" category
    const defaultCategory = (categories || []).find(c => c.is_default)

    cache = {
        categories: categories || [],
        keywords: keywords || [],
        defaultCategoryId: defaultCategory?.id || null,
        lastFetch: now,
    }

    return cache
}

/**
 * Categorize a single task based on its name
 * STRICT MODE: Only returns category ID if keyword match found
 * 
 * @param taskName The task name to categorize
 * @returns Object with category_id (or null) and matched keyword (or null)
 */
export async function categorizeTask(
    taskName: string
): Promise<{ category_id: string | null; keyword_matched: string | null }> {
    const data = await loadCategorizationData()
    const normalizedTaskName = taskName.toLowerCase().trim()

    // Prioridad a nivel de categoría hija (no por keyword):
    // usamos match_priority de la categoría como prioridad.
    const categoryPriority = new Map<string, number>()
    data.categories
        .filter(c => c.parent_id) // solo hijas
        .forEach((cat, index) => {
            // Si no tiene match_priority, usamos el índice como fallback
            categoryPriority.set(
                cat.id,
                typeof (cat as any).match_priority === 'number' ? (cat as any).match_priority : index
            )
        })

    // Tokenizar el nombre de la tarea en palabras (letras/números, ignorando signos)
    const taskTokens = normalizedTaskName
        .split(/[^a-z0-9áéíóúüñ]+/i)
        .filter(Boolean)

    // Construimos estructura de keywords con prioridad heredada de la categoría hija
    const keywordsInfo: Array<{
        normalized: string
        isPhrase: boolean
        category_id: string
        priority: number
        word: string
    }> = []

    data.keywords.forEach(kw => {
        const category = data.categories.find(c => c.id === kw.category_id)
        if (category && category.parent_id) {
            const normalized = (kw.word || '').toLowerCase().trim()
            if (!normalized) return

            keywordsInfo.push({
                normalized,
                isPhrase: normalized.includes(' '),
                category_id: kw.category_id,
                priority: categoryPriority.get(kw.category_id) ?? 0,
                word: kw.word
            })
        }
    })

    let matchedCategory: { category_id: string; keyword_matched: string } | null = null
    let highestPriority = -1

    // Buscar coincidencias y quedarnos con la categoría hija de mayor prioridad
    for (const info of keywordsInfo) {
        let matches = false

        if (info.isPhrase) {
            matches = normalizedTaskName.includes(info.normalized)
        } else {
            matches = taskTokens.includes(info.normalized)
        }

        if (matches && info.priority > highestPriority) {
            highestPriority = info.priority

            matchedCategory = {
                category_id: info.category_id,
                keyword_matched: info.word
            }
        }
    }

    if (matchedCategory) {
        return matchedCategory
    }

    // No match found, return null (will be assigned "Sin Clasificar" by caller)
    return {
        category_id: null,
        keyword_matched: null
    }
}

/**
 * Get the default "Sin Clasificar" category ID
 */
export async function getDefaultCategoryId(): Promise<string> {
    const data = await loadCategorizationData()
    if (!data.defaultCategoryId) {
        throw new Error('No default "Sin Clasificar" category configured')
    }
    return data.defaultCategoryId
}

/**
 * Bulk categorize multiple tasks
 * More efficient for CSV imports
 * STRICT MODE: Returns null if no keyword match found
 */
export async function categorizeTasks(
    taskNames: string[]
): Promise<Map<string, { category_id: string | null; keyword_matched: string | null }>> {
    const data = await loadCategorizationData()
    const results = new Map<string, { category_id: string | null; keyword_matched: string | null }>()

    // Prioridad a nivel de categoría hija (no por keyword):
    // usamos match_priority de la categoría como prioridad.
    const categoryPriority = new Map<string, number>()
    data.categories
        .filter(c => c.parent_id) // solo hijas
        .forEach((cat, index) => {
            categoryPriority.set(
                cat.id,
                typeof (cat as any).match_priority === 'number' ? (cat as any).match_priority : index
            )
        })

    // Create a list of keywords with category info, only for child categories
    const keywordsInfo: Array<{
        normalized: string
        isPhrase: boolean
        category_id: string
        priority: number
        word: string
    }> = []

    data.keywords.forEach(kw => {
        const category = data.categories.find(c => c.id === kw.category_id)
        if (category && category.parent_id) {
            const normalized = (kw.word || '').toLowerCase().trim()
            if (!normalized) return

            keywordsInfo.push({
                normalized,
                isPhrase: normalized.includes(' '),
                category_id: kw.category_id,
                priority: categoryPriority.get(kw.category_id) ?? 0,
                word: kw.word
            })
        }
    })

    for (const taskName of taskNames) {
        const normalizedTaskName = taskName.toLowerCase().trim()
        const taskTokens = normalizedTaskName
            .split(/[^a-z0-9áéíóúüñ]+/i)
            .filter(Boolean)

        let matchedCategory: { category_id: string; keyword_matched: string } | null = null
        let highestPriority = -1

        // Find highest priority matching keyword
        for (const info of keywordsInfo) {
            let matches = false

            if (info.isPhrase) {
                matches = normalizedTaskName.includes(info.normalized)
            } else {
                matches = taskTokens.includes(info.normalized)
            }

            if (matches && info.priority > highestPriority) {
                highestPriority = info.priority
                matchedCategory = {
                    category_id: info.category_id,
                    keyword_matched: info.word
                }
            }
        }

        results.set(taskName, matchedCategory || { category_id: null, keyword_matched: null })
    }

    return results
}

/**
 * Get all categories with hierarchical structure
 */
export async function getAllCategories(): Promise<CategoryHierarchical[]> {
    const data = await loadCategorizationData()
    return data.categories
}

/**
 * Get only parent categories
 */
export async function getParentCategories(): Promise<CategoryHierarchical[]> {
    const data = await loadCategorizationData()
    return data.categories.filter(c => c.parent_id === null)
}

/**
 * Get child categories for a parent
 */
export async function getChildCategories(parentId: string): Promise<CategoryHierarchical[]> {
    const data = await loadCategorizationData()
    return data.categories.filter(c => c.parent_id === parentId)
}

/**
 * Get categories organized as a tree structure
 */
export async function getCategoriesTree(): Promise<CategoryHierarchical[]> {
    const data = await loadCategorizationData()
    const parents = data.categories.filter(c => c.parent_id === null)
    
    return parents.map(parent => ({
        ...parent,
        children: data.categories.filter(c => c.parent_id === parent.id)
    }))
}

/**
 * Get category by ID
 */
export async function getCategoryById(categoryId: string): Promise<CategoryHierarchical | null> {
    const data = await loadCategorizationData()
    return data.categories.find(c => c.id === categoryId) || null
}

/**
 * Get keywords for a specific category
 */
export async function getKeywordsForCategory(categoryId: string): Promise<Keyword[]> {
    const data = await loadCategorizationData()
    return data.keywords.filter(k => k.category_id === categoryId)
}

/**
 * Invalidate the cache (call after updating categories/keywords)
 */
export function invalidateCache(): void {
    cache = null
}
