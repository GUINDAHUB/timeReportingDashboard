import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * GET /api/client-direct-costs
 * Get direct costs for a specific client and month/year, or all for a month
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const clientId = searchParams.get('clientId')
        const month = searchParams.get('month')
        const year = searchParams.get('year')

        let query = supabase.from('client_direct_costs').select('*')

        if (clientId) {
            query = query.eq('client_id', clientId)
        }
        if (month) {
            query = query.eq('month', parseInt(month))
        }
        if (year) {
            query = query.eq('year', parseInt(year))
        }

        const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('Error fetching client direct costs:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/client-direct-costs
 * Create or update a direct cost entry for a client
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { client_id, month, year, amount, notes } = body

        // Validations
        if (!client_id || !month || !year) {
            return NextResponse.json(
                { error: 'client_id, month, and year are required' },
                { status: 400 }
            )
        }

        if (month < 1 || month > 12) {
            return NextResponse.json({ error: 'month must be between 1 and 12' }, { status: 400 })
        }

        const parsedAmount = parseFloat(amount || 0)
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ error: 'amount must be a valid non-negative number' }, { status: 400 })
        }

        // Upsert (insert or update if exists)
        const { data, error } = await supabase
            .from('client_direct_costs')
            .upsert(
                {
                    client_id,
                    month: parseInt(month),
                    year: parseInt(year),
                    amount: parsedAmount,
                    notes: notes || null,
                },
                { onConflict: 'client_id,month,year' }
            )
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error creating/updating client direct cost:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * DELETE /api/client-direct-costs
 * Delete a direct cost entry
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const { error } = await supabase.from('client_direct_costs').delete().eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting client direct cost:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
