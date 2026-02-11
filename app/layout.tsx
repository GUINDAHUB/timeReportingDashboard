import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Guinda Time Tracking SO',
    description: 'Sistema de análisis de rentabilidad para agencia de marketing',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                    <Navigation />
                    {children}
                    <Toaster />
                </div>
            </body>
        </html>
    )
}
