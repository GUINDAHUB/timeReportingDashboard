import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format currency for Spanish locale
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
    }).format(amount)
}

/**
 * Format number for Spanish locale
 */
export function formatNumber(num: number, decimals: number = 2): string {
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num)
}

/**
 * Format hours in a human-readable way
 */
export function formatHours(hours: number): string {
    if (hours < 1) {
        return `${Math.round(hours * 60)} min`
    }
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    if (minutes === 0) {
        return `${wholeHours} h`
    }
    return `${wholeHours} h ${minutes} min`
}

/**
 * Convert milliseconds to hours
 */
export function millisecondsToHours(ms: number): number {
    return ms / (1000 * 60 * 60)
}

/**
 * Get month name in Spanish
 */
export function getMonthName(month: number): string {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return months[month - 1] || ''
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0
    return (part / total) * 100
}

/**
 * Get default cost per hour from env
 */
export function getDefaultCostPerHour(): number {
    const envValue = process.env.NEXT_PUBLIC_DEFAULT_COST_PER_HOUR
    return envValue ? parseFloat(envValue) : 30
}

/**
 * Get currency from env
 */
export function getCurrency(): string {
    return process.env.NEXT_PUBLIC_CURRENCY || 'EUR'
}
