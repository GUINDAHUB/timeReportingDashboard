import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rate limiting en memoria (se resetea al reiniciar el servidor)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutos en milisegundos

function getClientIP(request: NextRequest): string {
    // Intentar obtener IP real detrás de proxies/CDN
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    if (realIP) {
        return realIP
    }
    return 'unknown'
}

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const attempts = loginAttempts.get(ip)
    
    if (!attempts) {
        return false
    }
    
    // Si ya pasó el tiempo de bloqueo, resetear
    if (now > attempts.resetAt) {
        loginAttempts.delete(ip)
        return false
    }
    
    return attempts.count >= MAX_ATTEMPTS
}

function recordLoginAttempt(ip: string, success: boolean) {
    const now = Date.now()
    const attempts = loginAttempts.get(ip)
    
    if (success) {
        // Login exitoso, limpiar intentos
        loginAttempts.delete(ip)
        return
    }
    
    if (!attempts || now > attempts.resetAt) {
        // Primer intento o intentos expirados
        loginAttempts.set(ip, {
            count: 1,
            resetAt: now + LOCKOUT_DURATION
        })
    } else {
        // Incrementar contador
        attempts.count++
        loginAttempts.set(ip, attempts)
    }
    
    // Limpiar entradas antiguas cada 100 intentos
    if (loginAttempts.size > 100) {
        for (const [key, value] of loginAttempts.entries()) {
            if (now > value.resetAt) {
                loginAttempts.delete(key)
            }
        }
    }
}

export async function middleware(request: NextRequest) {
    const ip = getClientIP(request)
    
    // Check si está intentando hacer login
    if (request.nextUrl.pathname === '/api/auth/login' && request.method === 'POST') {
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { 
                    error: 'Demasiados intentos fallidos. Por favor, espera 15 minutos e intenta de nuevo.' 
                },
                { status: 429 }
            )
        }
    }
    
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })
    
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: any) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )
    
    const { data: { session } } = await supabase.auth.getSession()
    
    // Rutas públicas (solo login)
    const isLoginPage = request.nextUrl.pathname === '/login'
    const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth')
    
    // Si no hay sesión y no está en login, redirigir
    if (!session && !isLoginPage && !isAuthApi) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
    
    // Si hay sesión y está en login, redirigir al dashboard
    if (session && isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }
    
    // Headers de seguridad y no indexación
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

// Exportar para uso en API routes
export { recordLoginAttempt }
