import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const month = parseInt(searchParams.get('month') || '')
        const year = parseInt(searchParams.get('year') || '')

        if (!month || !year) {
            return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
        }

        // Calculate dates
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01` // Works correctly for Dec -> Jan

        // Delete entries for this month
        const { error, count } = await supabase
            .from('time_entries')
            .delete({ count: 'exact' })
            .gte('date', startDate)
            .lt('date', endDate)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count
        })

    } catch (error) {
        console.error('Error deleting entries:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}
