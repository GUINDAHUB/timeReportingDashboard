'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatHours, getMonthName } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

interface TimeEntry {
    id: string
    date: string
    task_name: string
    duration_hours: number
    employee_name: string
    client: { name: string } | null
    category: { name: string } | null
}

export default function ImportCheckPage() {
    const params = useParams()
    const router = useRouter()
    const year = parseInt(params.year as string)
    const month = parseInt(params.month as string)

    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadEntries()
    }, [])

    async function loadEntries() {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

        const { data, error } = await supabase
            .from('time_entries')
            .select(`
        id,
        date,
        task_name,
        duration_hours,
        employee_name,
        client:clients(name),
        category:categories(name)
      `)
            .gte('date', startDate)
            .lt('date', endDate)
            .order('date', { ascending: false })

        if (error) {
            console.error('Error loading entries:', error)
        } else {
            setEntries(data as any)
        }
        setLoading(false)
    }

    const totalHours = entries.reduce((acc, curr) => acc + curr.duration_hours, 0)

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Importar
                </Button>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Registros de {getMonthName(month)} {year}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Verificando datos importados
                        </p>
                    </div>
                    <div className="text-right bg-slate-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">Total Horas</p>
                        <p className="text-2xl font-bold text-slate-800">{formatHours(totalHours)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Tarea / Proyecto</th>
                                <th className="px-6 py-3">Categoría</th>
                                <th className="px-6 py-3">Empleado</th>
                                <th className="px-6 py-3 text-right">Horas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Cargando registros...
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No hay registros para este mes.
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                                            {new Date(entry.date).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {entry.client?.name || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-700 max-w-xs truncate" title={entry.task_name}>
                                            {entry.task_name}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {entry.category?.name || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {entry.employee_name}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-gray-700">
                                            {formatHours(entry.duration_hours)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {!loading && entries.length > 0 && (
                <p className="text-center text-xs text-gray-400 mt-4">
                    Mostrando {entries.length} registros
                </p>
            )}
        </div>
    )
}
