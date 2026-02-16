import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = createServerClient()
        await supabase.auth.signOut()
        
        const response = NextResponse.json(
            { message: 'Logout exitoso' },
            { status: 200 }
        )
        
        // Limpiar cookies
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
        
        return response
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { error: 'Error al cerrar sesión' },
            { status: 500 }
        )
    }
}
