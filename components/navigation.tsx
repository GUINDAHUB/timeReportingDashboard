'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
    { href: '/', label: 'Inicio', icon: '🏠' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/trends', label: 'Tendencias', icon: '📈' },
    { 
        label: 'Categorización', 
        icon: '🎯',
        dropdown: [
            { href: '/categorization', label: 'Vista General', icon: '📊' },
            { href: '/categorization/uncategorized', label: 'Tareas Sin Clasificar', icon: '❓' },
            { href: '/settings/categories', label: 'Gestionar Categorías', icon: '⚙️' },
        ]
    },
    { href: '/clients', label: 'Clientes', icon: '🏢' },
    { href: '/employees', label: 'Empleados', icon: '👥' },
    { href: '/import', label: 'Importar', icon: '📤' },
]

export function Navigation() {
    const pathname = usePathname()
    const router = useRouter()
    const [loggingOut, setLoggingOut] = useState(false)
    
    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            })
            
            if (response.ok) {
                toast.success('Sesión cerrada correctamente')
                router.push('/login')
                router.refresh()
            } else {
                toast.error('Error al cerrar sesión')
            }
        } catch (error) {
            console.error('Logout error:', error)
            toast.error('Error al cerrar sesión')
        } finally {
            setLoggingOut(false)
        }
    }

    return (
        <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-2xl">🍒</span>
                        <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Guinda Time Tracking
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-1">
                        {navItems.map((item) => {
                            if ('dropdown' in item && item.dropdown) {
                                return (
                                    <NavDropdown
                                        key={item.label}
                                        label={item.label}
                                        icon={item.icon}
                                        items={item.dropdown}
                                        currentPath={pathname}
                                    />
                                )
                            }

                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href!}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    )}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    {item.label}
                                </Link>
                            )
                        })}
                        
                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 flex items-center gap-2"
                            title="Cerrar sesión"
                        >
                            <LogOut className="w-4 h-4" />
                            {loggingOut ? 'Saliendo...' : 'Salir'}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

function NavDropdown({ 
    label, 
    icon, 
    items, 
    currentPath 
}: { 
    label: string
    icon: string
    items: Array<{ href: string; label: string; icon: string }>
    currentPath: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const isActive = items.some(item => currentPath === item.href || currentPath.startsWith(item.href + '/'))

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                    isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
            >
                <span className="mr-1">{icon}</span>
                {label}
                <ChevronDown className={cn(
                    'w-4 h-4 transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {items.map((item) => {
                        const itemActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                                    itemActive
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                )}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
