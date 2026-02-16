'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        
        if (!email || !password) {
            toast.error('Por favor completa todos los campos')
            return
        }
        
        setLoading(true)
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })
            
            const data = await response.json()
            
            if (!response.ok) {
                if (response.status === 429) {
                    toast.error(data.error)
                } else {
                    toast.error(data.error || 'Error al iniciar sesión')
                }
                return
            }
            
            toast.success('Sesión iniciada correctamente')
            router.push('/')
            router.refresh()
        } catch (error) {
            console.error('Login error:', error)
            toast.error('Error de conexión. Por favor, intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {/* Logo/Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
                            <svg 
                                className="w-8 h-8 text-white" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Guinda Time Tracking
                        </h1>
                        <p className="text-slate-600 text-sm">
                            Acceso restringido - Inicia sesión para continuar
                        </p>
                    </div>
                    
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label 
                                htmlFor="email" 
                                className="text-sm font-medium text-slate-700"
                            >
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                                autoComplete="email"
                                className="w-full"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label 
                                htmlFor="password" 
                                className="text-sm font-medium text-slate-700"
                            >
                                Contraseña
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                autoComplete="current-password"
                                className="w-full"
                            />
                        </div>
                        
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg 
                                        className="animate-spin h-4 w-4" 
                                        viewBox="0 0 24 24"
                                    >
                                        <circle 
                                            className="opacity-25" 
                                            cx="12" 
                                            cy="12" 
                                            r="10" 
                                            stroke="currentColor" 
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path 
                                            className="opacity-75" 
                                            fill="currentColor" 
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Iniciando sesión...
                                </span>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </Button>
                    </form>
                    
                    {/* Security notice */}
                    <div className="pt-4 border-t border-slate-200">
                        <p className="text-xs text-center text-slate-500">
                            🔒 Conexión segura • Protección contra fuerza bruta
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
