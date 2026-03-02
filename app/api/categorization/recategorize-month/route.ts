import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { categorizeTasks, invalidateCache } from '@/lib/services/categorizer'

interface MonthlyRecategorizationResult {
    total_analyzed: number
    updated: number
    unchanged: number
    errors: number
    details: Array<{
        task_name: string
        old_category: string | null
        new_category: string
        keyword_matched: string
    }>
}

export async function POST(request: NextRequest) {
    const supabase = createServerClient()

    try {
        const body = await request.json()
        const { year, month } = body as { year?: number; month?: number }

        if (
            !year ||
            !month ||
            typeof year !== 'number' ||
            typeof month !== 'number' ||
            month < 1 ||
            month > 12
        ) {
            return NextResponse.json(
                { error: 'Parámetros inválidos. Se requiere year (número) y month (1-12).' },
                { status: 400 }
            )
        }

        // Invalidar cache para asegurar que usamos las keywords más recientes
        invalidateCache()

        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

        // Cargar todas las entries del mes
        const { data: entries, error: entriesError } = await supabase
            .from('time_entries')
            .select('id, task_name, category_id')
            .gte('date', startDate)
            .lt('date', endDate)

        if (entriesError) {
            console.error('Error loading time_entries for monthly recategorization:', entriesError)
            return NextResponse.json(
                { error: 'Error al cargar tareas para recategorización mensual' },
                { status: 500 }
            )
        }

        if (!entries || entries.length === 0) {
            const emptyResult: MonthlyRecategorizationResult = {
                total_analyzed: 0,
                updated: 0,
                unchanged: 0,
                errors: 0,
                details: [],
            }

            return NextResponse.json({
                success: true,
                result: emptyResult,
            })
        }

        // Cargar categorías para mostrar nombres en el resumen
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name, is_default')

        if (categoriesError) {
            console.error('Error loading categories for monthly recategorization:', categoriesError)
        }

        const categoryNameMap = new Map<string, string>()
        let defaultCategoryId: string | null = null

        for (const cat of categories || []) {
            categoryNameMap.set(cat.id, cat.name)
            if (cat.is_default) {
                defaultCategoryId = cat.id
            }
        }

        // Ejecutar categorización en bloque por nombre de tarea
        const taskNames = entries.map(e => e.task_name)
        const categorizationResults = await categorizeTasks(taskNames)

        const result: MonthlyRecategorizationResult = {
            total_analyzed: entries.length,
            updated: 0,
            unchanged: 0,
            errors: 0,
            details: [],
        }

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const categ = categorizationResults.get(entry.task_name)

            // Si no hay resultado de categorización
            if (!categ) {
                result.unchanged++
                continue
            }

            // Caso 1: hay nueva categoría sugerida por keyword
            if (categ.category_id) {
                // Si la categoría es la misma, no hacemos nada
                if (categ.category_id === entry.category_id) {
                    result.unchanged++
                    continue
                }

                try {
                    const { error: updateError } = await supabase
                        .from('time_entries')
                        .update({ category_id: categ.category_id })
                        .eq('id', entry.id)

                    if (updateError) {
                        console.error(`Error updating entry ${entry.id}:`, updateError)
                        result.errors++
                        continue
                    }

                    // Registrar historial de cambio (no crítico)
                    try {
                        await supabase.from('category_assignments_history').insert({
                            time_entry_id: entry.id,
                            old_category_id: entry.category_id,
                            new_category_id: categ.category_id,
                            assignment_type: 'automatic',
                            keyword_matched: categ.keyword_matched,
                            notes: 'Recategorización mensual desde ajustes de categorías',
                        })
                    } catch (historyError) {
                        console.warn('Could not record monthly recategorization history:', historyError)
                    }

                    // Si venía de "Sin Clasificar" y ahora tiene categoría, marcar como revisada
                    if (defaultCategoryId && entry.category_id === defaultCategoryId) {
                        try {
                            await supabase
                                .from('uncategorized_tasks')
                                .update({
                                    status: 'reviewed',
                                    reviewed_at: new Date().toISOString(),
                                    reviewed_by: 'system',
                                })
                                .eq('time_entry_id', entry.id)
                        } catch (uncatError) {
                            console.warn(
                                'Could not update uncategorized_tasks for monthly recategorization:',
                                uncatError
                            )
                        }
                    }

                    result.updated++
                    result.details.push({
                        task_name: entry.task_name,
                        old_category: entry.category_id
                            ? categoryNameMap.get(entry.category_id) || null
                            : null,
                        new_category: categoryNameMap.get(categ.category_id) || 'Nueva categoría',
                        keyword_matched: categ.keyword_matched || '',
                    })
                } catch (err) {
                    console.error(`Unexpected error processing entry ${entry.id}:`, err)
                    result.errors++
                }

                continue
            }

            // Caso 2: NO hay keyword que encaje -> mover a "Sin Clasificar" si existe
            if (!defaultCategoryId) {
                result.unchanged++
                continue
            }

            // Si ya estaba en "Sin Clasificar", lo dejamos tal cual
            if (entry.category_id === defaultCategoryId) {
                result.unchanged++
                continue
            }

            try {
                const { error: updateError } = await supabase
                    .from('time_entries')
                    .update({ category_id: defaultCategoryId })
                    .eq('id', entry.id)

                if (updateError) {
                    console.error(`Error updating entry ${entry.id} to default category:`, updateError)
                    result.errors++
                    continue
                }

                // Registrar historial del cambio a "Sin Clasificar" (no crítico)
                try {
                    await supabase.from('category_assignments_history').insert({
                        time_entry_id: entry.id,
                        old_category_id: entry.category_id,
                        new_category_id: defaultCategoryId,
                        assignment_type: 'automatic',
                        keyword_matched: null,
                        notes: 'Recategorización mensual: sin keyword, movido a "Sin Clasificar"',
                    })
                } catch (historyError) {
                    console.warn(
                        'Could not record monthly recategorization history to default category:',
                        historyError
                    )
                }

                // Asegurar que aparece en la tabla de tareas sin clasificar
                try {
                    await supabase
                        .from('uncategorized_tasks')
                        .upsert(
                            {
                                time_entry_id: entry.id,
                                task_name: entry.task_name,
                                status: 'pending',
                            },
                            {
                                onConflict: 'time_entry_id',
                                ignoreDuplicates: true,
                            }
                        )
                } catch (uncatInsertError) {
                    console.warn(
                        'Could not insert into uncategorized_tasks for monthly recategorization:',
                        uncatInsertError
                    )
                }

                result.updated++
                result.details.push({
                    task_name: entry.task_name,
                    old_category: entry.category_id
                        ? categoryNameMap.get(entry.category_id) || null
                        : null,
                    new_category: categoryNameMap.get(defaultCategoryId) || 'Sin Clasificar',
                    keyword_matched: '',
                })
            } catch (err) {
                console.error(`Unexpected error processing entry ${entry.id} to default category:`, err)
                result.errors++
            }
        }

        return NextResponse.json({
            success: true,
            result,
        })
    } catch (error) {
        console.error('Monthly recategorization error:', error)
        return NextResponse.json(
            {
                error: 'Error interno al recategorizar el mes',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

