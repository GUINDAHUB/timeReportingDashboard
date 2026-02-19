import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { updates } = body // Array of { id: string, clientName: string }

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json(
                { error: 'Se requiere un array de actualizaciones' },
                { status: 400 }
            )
        }

        // Get client IDs for the given client names
        const clientNames = [...new Set(updates.map(u => u.clientName))]
        const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('id, name')
            .in('name', clientNames)

        if (clientError) {
            console.error('Error fetching clients:', clientError)
            return NextResponse.json({ error: 'Error al cargar clientes' }, { status: 500 })
        }

        // Create a map of client name to client ID
        const clientMap = new Map<string, string>()
        clients.forEach(client => {
            clientMap.set(client.name, client.id)
        })

        // Update each entry
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
                    updated_at: new Date().toISOString()
                })
                .eq('id', update.id)

            if (error) {
                console.error(`Error updating entry ${update.id}:`, error)
                errorCount++
            } else {
                successCount++
            }
        }

        // Check if "Sin Clasificar" client still has entries
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

            // If no entries remain, delete the "Sin Clasificar" client
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
            message: `${successCount} entradas actualizadas correctamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`
        })

    } catch (error) {
        console.error('Error in recategorize:', error)
        return NextResponse.json(
            { error: 'Error al reclasificar entradas' },
            { status: 500 }
        )
    }
}
