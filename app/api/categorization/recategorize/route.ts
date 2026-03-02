import { NextRequest, NextResponse } from 'next/server'
import { categorizeTask, invalidateCache } from '@/lib/services/categorizer'
import { createServerClient } from '@/lib/supabase/server'

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
 * Dos modos de funcionamiento:
 * 1) Sin cuerpo o sin `updates` -> recategorización por categorías ("Sin Clasificar")
 * 2) Con `updates` -> reclasificación de cliente para entradas concretas
 */
export async function POST(request: NextRequest) {
    const supabase = createServerClient()

    try {
        // Intentar leer cuerpo JSON, pero tolerar peticiones sin cuerpo
        let body: any = null
        let hasUpdatesPayload = false

        try {
            body = await request.json()
            hasUpdatesPayload = !!body && Array.isArray(body.updates) && body.updates.length > 0
        } catch {
            hasUpdatesPayload = false
        }

        /**
         * MODO 1: Reclasificación de clientes (usado por import history)
         * Espera body { updates: Array<{ id: string; clientName: string }> }
         */
        if (hasUpdatesPayload) {
            const updates = body.updates as Array<{ id: string; clientName: string }>

            // Obtener IDs de cliente para los nombres indicados
            const clientNames = [...new Set(updates.map(u => u.clientName))]
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('id, name')
                .in('name', clientNames)

            if (clientError) {
                console.error('Error fetching clients:', clientError)
                return NextResponse.json({ error: 'Error al cargar clientes' }, { status: 500 })
            }

            const clientMap = new Map<string, string>()
            ;(clients || []).forEach(client => {
                clientMap.set(client.name, client.id)
            })

            let successCount = 0
            let errorCount = 0

            for (const update of updates) {
                const clientId = clientMap.get(update.clientName)

                if (!clientId) {
                    console.error(`Client not found: ${update.clientName}`)
                    errorCount++
                    continue
                }

                const { error } = await supabase
                    .from('time_entries')
                    .update({
                        client_id: clientId,
                    })
                    .eq('id', update.id)

                if (error) {
                    console.error(`Error updating entry ${update.id}:`, error)
                    errorCount++
                } else {
                    successCount++
                }
            }

            // Eliminar cliente "Sin Clasificar" si ya no tiene entradas
            const { data: sinClasificarClient } = await supabase
                .from('clients')
                .select('id')
                .eq('name', 'Sin Clasificar')
                .single()

            if (sinClasificarClient) {
                const { count } = await supabase
                    .from('time_entries')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', sinClasificarClient.id)

                if (count === 0) {
                    await supabase
                        .from('clients')
                        .delete()
                        .eq('id', sinClasificarClient.id)

                    console.log('Deleted "Sin Clasificar" client (no entries remaining)')
                }
            }

            return NextResponse.json({
                success: true,
                successCount,
                errorCount,
                message: `${successCount} entradas actualizadas correctamente${
                    errorCount > 0 ? `, ${errorCount} errores` : ''
                }`,
            })
        }

        /**
         * MODO 2: Recategorización automática por categorías (usado por /categorization/uncategorized)
         * Recorre todas las tareas con categoría "Sin Clasificar" y aplica el categorizador.
         */

        // Invalidar cache para asegurar que usamos las keywords más recientes
        invalidateCache()

        // 1. Obtener la categoría por defecto "Sin Clasificar"
        const { data: defaultCategory, error: defaultError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('is_default', true)
            .single()

        if (defaultError || !defaultCategory) {
            return NextResponse.json(
                {
                    error: 'No se encontró la categoría "Sin Clasificar"',
                    details: defaultError,
                },
                { status: 400 }
            )
        }

        // 2. Obtener todas las tareas con categoría "Sin Clasificar"
        const { data: uncategorizedEntries, error: entriesError } = await supabase
            .from('time_entries')
            .select('id, task_name, category_id')
            .eq('category_id', defaultCategory.id)

        if (entriesError) {
            return NextResponse.json(
                {
                    error: 'Error al obtener tareas sin clasificar',
                    details: entriesError,
                },
                { status: 500 }
            )
        }

        if (!uncategorizedEntries || uncategorizedEntries.length === 0) {
            const emptyResult: RecategorizationResult = {
                total_analyzed: 0,
                recategorized: 0,
                still_uncategorized: 0,
                details: [],
            }

            return NextResponse.json({
                success: true,
                result: emptyResult,
            })
        }

        // 3. Recategorizar cada tarea
        const result: RecategorizationResult = {
            total_analyzed: uncategorizedEntries.length,
            recategorized: 0,
            still_uncategorized: 0,
            details: [],
        }

        // Obtener nombres de categorías para el reporte
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name')

        if (categoriesError) {
            console.error('Error loading categories for report:', categoriesError)
        }

        const categoryMap = new Map<string, string>((categories || []).map(c => [c.id, c.name]))

        for (const entry of uncategorizedEntries) {
            try {
                const categorization = await categorizeTask(entry.task_name)

                if (categorization.category_id && categorization.category_id !== defaultCategory.id) {
                    const { error: updateError } = await supabase
                        .from('time_entries')
                        .update({ category_id: categorization.category_id })
                        .eq('id', entry.id)

                    if (updateError) {
                        console.error(`Error updating entry ${entry.id}:`, updateError)
                        result.still_uncategorized++
                        continue
                    }

                    // Registrar historial de cambio (no crítico)
                    try {
                        await supabase.from('category_assignments_history').insert({
                            time_entry_id: entry.id,
                            old_category_id: defaultCategory.id,
                            new_category_id: categorization.category_id,
                            assignment_type: 'automatic',
                            keyword_matched: categorization.keyword_matched,
                            notes: 'Recategorización automática',
                        })
                    } catch (historyError) {
                        console.warn('Could not record history:', historyError)
                    }

                    // Actualizar estado en uncategorized_tasks (no crítico)
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
                        console.warn('Could not update uncategorized_tasks:', uncatError)
                    }

                    result.recategorized++
                    result.details.push({
                        task_name: entry.task_name,
                        old_category: defaultCategory.name,
                        new_category: categoryMap.get(categorization.category_id) || 'Unknown',
                        keyword_matched: categorization.keyword_matched || '',
                    })
                } else {
                    result.still_uncategorized++
                }
            } catch (error) {
                console.error(`Error processing entry ${entry.id}:`, error)
                result.still_uncategorized++
            }
        }

        return NextResponse.json({
            success: true,
            result,
        })
    } catch (error) {
        console.error('Recategorization error:', error)
        return NextResponse.json(
            {
                error: 'Error interno al recategorizar',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
