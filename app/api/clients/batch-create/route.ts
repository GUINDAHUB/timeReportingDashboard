import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
    try {
        const { clients } = await request.json()

        if (!clients || !Array.isArray(clients) || clients.length === 0) {
            return NextResponse.json({ error: 'List of clients is required' }, { status: 400 })
        }

        // Filter out duplicates within the request
        const uniqueClients = Array.from(new Set(clients.map((c: string) => c.trim())))

        // Prepare insert data
        const clientsToInsert = uniqueClients.map(name => ({
            name,
            is_active: true,
            default_fee: 0 // Optional, handled by default value in DB usually
        }))

        // Upsert (ignore duplicates if name constraint exists, but here we just want to create missing ones)
        // Actually, simple insert with ignore duplicates is best if name is unique
        const { data, error } = await supabase
            .from('clients')
            .upsert(clientsToInsert, { onConflict: 'name', ignoreDuplicates: true })
            .select()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            created: data
        })

    } catch (error) {
        console.error('Error creating clients:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}
