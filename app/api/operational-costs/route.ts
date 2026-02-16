import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * GET /api/operational-costs
 * Get operational costs for a specific month/year or all
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const month = searchParams.get('month')
        const year = searchParams.get('year')

        let query = supabase.from('monthly_operational_costs').select('*')

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
        console.error('Error fetching operational costs:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/operational-costs
 * Create or update operational costs for a month
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { month, year, amount, notes, distribution_method } = body

        // Validations
        if (!month || !year) {
            return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
        }

        if (month < 1 || month > 12) {
            return NextResponse.json({ error: 'month must be between 1 and 12' }, { status: 400 })
        }

        const parsedAmount = parseFloat(amount || 0)
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ error: 'amount must be a valid non-negative number' }, { status: 400 })
        }

        // Validate distribution_method
        const validMethods = ['revenue', 'workload']
        const finalDistributionMethod = distribution_method && validMethods.includes(distribution_method) 
            ? distribution_method 
            : 'revenue'

        // Upsert (insert or update if exists)
        const { data, error } = await supabase
            .from('monthly_operational_costs')
            .upsert(
                {
                    month: parseInt(month),
                    year: parseInt(year),
                    amount: parsedAmount,
                    distribution_method: finalDistributionMethod,
                    notes: notes || null,
                },
                { onConflict: 'month,year' }
            )
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error creating/updating operational cost:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * DELETE /api/operational-costs
 * Delete an operational cost entry
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const { error } = await supabase.from('monthly_operational_costs').delete().eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting operational cost:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
