import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { categorizeTask, invalidateCache } from '@/lib/services/categorizer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface RecategorizationResult {
    total_analyzed: number
    recategorized: number
    still_uncategorized: number
    details: Array<{
        task_name: string
        old_category: string
        new_category: string
        keyword_matched: string
    }>
}

/**
 * POST /api/categorization/recategorize
 * 
 * Recategoriza tareas que están marcadas como "Sin Clasificar"
 * usando las keywords actualizadas
 */
export async function POST(request: NextRequest) {
    try {
        // Invalidar cache para asegurar que usamos las keywords más recientes
        invalidateCache()

        // 1. Obtener el ID de la categoría "Sin Clasificar"
        const { data: defaultCategory, error: defaultError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('is_default', true)
            .single()

        if (defaultError || !defaultCategory) {
            return NextResponse.json({
                error: 'No se encontró la categoría "Sin Clasificar"',
                details: defaultError
            }, { status: 400 })
        }

        // 2. Obtener todas las tareas con categoría "Sin Clasificar"
        const { data: uncategorizedEntries, error: entriesError } = await supabase
            .from('time_entries')
            .select('id, task_name, category_id')
            .eq('category_id', defaultCategory.id)

        if (entriesError) {
            return NextResponse.json({
                error: 'Error al obtener tareas sin clasificar',
                details: entriesError
            }, { status: 500 })
        }

        if (!uncategorizedEntries || uncategorizedEntries.length === 0) {
            return NextResponse.json({
                success: true,
                result: {
                    total_analyzed: 0,
                    recategorized: 0,
                    still_uncategorized: 0,
                    details: []
                }
            })
        }

        // 3. Recategorizar cada tarea
        const result: RecategorizationResult = {
            total_analyzed: uncategorizedEntries.length,
            recategorized: 0,
            still_uncategorized: 0,
            details: []
        }

        // Obtener nombres de categorías para el reporte
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name')

        if (categoriesError) {
            console.error('Error loading categories for report:', categoriesError)
        }

        const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || [])

        for (const entry of uncategorizedEntries) {
            try {
                // Intentar categorizar
                const categorization = await categorizeTask(entry.task_name)

                if (categorization.category_id && categorization.category_id !== defaultCategory.id) {
                    // Se encontró una categoría válida, actualizar
                    const { error: updateError } = await supabase
                        .from('time_entries')
                        .update({ category_id: categorization.category_id })
                        .eq('id', entry.id)

                    if (updateError) {
                        console.error(`Error updating entry ${entry.id}:`, updateError)
                        continue
                    }

                    // Registrar historial de cambio
                    try {
                        await supabase
                            .from('category_assignments_history')
                            .insert({
                                time_entry_id: entry.id,
                                old_category_id: defaultCategory.id,
                                new_category_id: categorization.category_id,
                                assignment_type: 'automatic',
                                keyword_matched: categorization.keyword_matched,
                                notes: 'Recategorización automática'
                            })
                    } catch (historyError) {
                        // Non-critical, just log
                        console.warn('Could not record history:', historyError)
                    }

                    // Actualizar estado en uncategorized_tasks
                    try {
                        await supabase
                            .from('uncategorized_tasks')
                            .update({
                                status: 'reviewed',
                                reviewed_at: new Date().toISOString(),
                                reviewed_by: 'system'
                            })
                            .eq('time_entry_id', entry.id)
                    } catch (uncatError) {
                        // Non-critical
                        console.warn('Could not update uncategorized_tasks:', uncatError)
                    }

                    result.recategorized++
                    result.details.push({
                        task_name: entry.task_name,
                        old_category: defaultCategory.name,
                        new_category: categoryMap.get(categorization.category_id) || 'Unknown',
                        keyword_matched: categorization.keyword_matched || ''
                    })
                } else {
                    // Sigue sin categoría
                    result.still_uncategorized++
                }
            } catch (error) {
                console.error(`Error processing entry ${entry.id}:`, error)
                result.still_uncategorized++
            }
        }

        return NextResponse.json({
            success: true,
            result
        })

    } catch (error) {
        console.error('Recategorization error:', error)
        return NextResponse.json({
            error: 'Error interno al recategorizar',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
