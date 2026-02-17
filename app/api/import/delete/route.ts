import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const batchId = searchParams.get('batchId')

        if (!batchId) {
            return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
        }

        // Delete entries for this import batch
        const { error, count } = await supabase
            .from('time_entries')
            .delete({ count: 'exact' })
            .eq('import_batch_id', batchId)

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
