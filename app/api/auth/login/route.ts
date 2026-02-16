import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()
        
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            )
        }
        
        const supabase = createServerClient()
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        
        if (error) {
            console.error('Login error:', error.message)
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            )
        }
        
        if (!data.session) {
            return NextResponse.json(
                { error: 'No se pudo crear la sesión' },
                { status: 500 }
            )
        }
        
        // Crear respuesta con cookies de sesión
        const response = NextResponse.json(
            { message: 'Login exitoso' },
            { status: 200 }
        )
        
        // Establecer cookies de sesión manualmente
        response.cookies.set({
            name: 'sb-access-token',
            value: data.session.access_token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 días
            path: '/',
        })
        
        response.cookies.set({
            name: 'sb-refresh-token',
            value: data.session.refresh_token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 días
            path: '/',
        })
        
        return response
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
