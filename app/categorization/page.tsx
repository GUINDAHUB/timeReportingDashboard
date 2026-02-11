'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatHours, formatNumber } from '@/lib/utils'
import { Clock, ListTodo, Users, FolderKanban, Layers } from 'lucide-react'
import { FiltersPanel } from '@/components/categorization/filters-panel'
import { CategoryDistributionChart } from '@/components/categorization/category-distribution-chart'
import { EmployeeHoursChart } from '@/components/categorization/employee-hours-chart'
import { ClientHoursChart } from '@/components/categorization/client-hours-chart'
import { TasksDetailTable } from '@/components/categorization/tasks-detail-table'
import { StatsCard } from '@/components/categorization/stats-card'

interface TimeEntry {
    id: string
    task_name: string
    employee_name: string
    duration_hours: number
    date: string
    client_id: string | null
    category_id: string | null
}

interface Client {
    id: string
    name: string
}

interface Category {
    id: string
    name: string
    color: string
    emoji: string | null
}

export default function CategorizationPage() {
    const [loading, setLoading] = useState(true)
    
    // Filters state
    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [selectedClient, setSelectedClient] = useState('all')
    const [selectedEmployee, setSelectedEmployee] = useState('all')
    const [selectedCategory, setSelectedCategory] = useState('all')

    // Data state
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [employees, setEmployees] = useState<string[]>([])

    useEffect(() => {
        loadData()
    }, [selectedMonth, selectedYear])

    async function loadData() {
        setLoading(true)
        try {
            // Calculate date range for selected month
            const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
            const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
            const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
            const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

            // Fetch time entries
            const { data: entriesData, error: entriesError } = await supabase
                .from('time_entries')
                .select('id, task_name, employee_name, duration_hours, date, client_id, category_id')
                .gte('date', startDate)
                .lt('date', endDate)
                .order('date', { ascending: false })

            if (entriesError) throw entriesError

            // Fetch clients
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('id, name')
                .order('name')

            if (clientsError) throw clientsError

            // Fetch categories
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('categories')
                .select('id, name, color, emoji')
                .order('sort_order')

            if (categoriesError) throw categoriesError

            // Extract unique employees
            const uniqueEmployees = Array.from(
                new Set(entriesData?.map(e => e.employee_name) || [])
            ).sort()

            setEntries(entriesData || [])
            setClients(clientsData || [])
            setCategories(categoriesData || [])
            setEmployees(uniqueEmployees)

        } catch (error) {
            console.error('Error loading categorization data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Apply filters
    const filteredEntries = entries.filter(entry => {
        if (selectedClient !== 'all' && entry.client_id !== selectedClient) return false
        if (selectedEmployee !== 'all' && entry.employee_name !== selectedEmployee) return false
        if (selectedCategory !== 'all' && entry.category_id !== selectedCategory) return false
        return true
    })

    // Calculate statistics
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration_hours, 0)
    const totalTasks = filteredEntries.length
    const uniqueEmployeesCount = new Set(filteredEntries.map(e => e.employee_name)).size
    const uniqueClientsCount = new Set(filteredEntries.filter(e => e.client_id).map(e => e.client_id)).size
    const uniqueCategoriesCount = new Set(filteredEntries.filter(e => e.category_id).map(e => e.category_id)).size

    // Prepare category distribution data
    const categoryDistribution = categories.map(cat => {
        const hours = filteredEntries
            .filter(e => e.category_id === cat.id)
            .reduce((sum, e) => sum + e.duration_hours, 0)
        
        return {
            name: cat.name,
            value: hours,
            color: cat.color,
            emoji: cat.emoji
        }
    }).filter(c => c.value > 0)

    // Prepare employee hours data
    const employeeHours = employees.map(emp => {
        const empEntries = filteredEntries.filter(e => e.employee_name === emp)
        return {
            name: emp,
            hours: empEntries.reduce((sum, e) => sum + e.duration_hours, 0),
            tasks: empEntries.length
        }
    }).filter(e => e.hours > 0)

    // Prepare client hours data
    const clientHours = clients.map(client => {
        const clientEntries = filteredEntries.filter(e => e.client_id === client.id)
        return {
            name: client.name,
            hours: clientEntries.reduce((sum, e) => sum + e.duration_hours, 0),
            tasks: clientEntries.length
        }
    }).filter(c => c.hours > 0)

    // Prepare tasks detail table data
    const tasksDetail = filteredEntries.map(entry => {
        const client = clients.find(c => c.id === entry.client_id)
        const category = categories.find(c => c.id === entry.category_id)
        
        return {
            id: entry.id,
            taskName: entry.task_name,
            employeeName: entry.employee_name,
            clientName: client?.name || 'Sin cliente',
            categoryName: category?.name || 'Sin categoría',
            categoryEmoji: category?.emoji || null,
            categoryColor: category?.color || '#94a3b8',
            hours: entry.duration_hours,
            date: entry.date
        }
    })

    const handleResetFilters = () => {
        setSelectedClient('all')
        setSelectedEmployee('all')
        setSelectedCategory('all')
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando datos...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Categorización</h1>
                    <p className="text-gray-600 mt-1">Análisis detallado de tareas por categorías, personas y clientes</p>
                </div>

                {/* Filters */}
                <FiltersPanel
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    selectedClient={selectedClient}
                    selectedEmployee={selectedEmployee}
                    selectedCategory={selectedCategory}
                    clients={clients}
                    employees={employees}
                    categories={categories}
                    onMonthChange={setSelectedMonth}
                    onYearChange={setSelectedYear}
                    onClientChange={setSelectedClient}
                    onEmployeeChange={setSelectedEmployee}
                    onCategoryChange={setSelectedCategory}
                    onReset={handleResetFilters}
                />

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                    <StatsCard
                        title="Total Horas"
                        value={formatHours(totalHours)}
                        subtitle="Registradas en el periodo"
                        icon={Clock}
                        color="blue"
                    />
                    <StatsCard
                        title="Total Tareas"
                        value={formatNumber(totalTasks, 0)}
                        subtitle="Tareas completadas"
                        icon={ListTodo}
                        color="orange"
                    />
                    <StatsCard
                        title="Personas"
                        value={uniqueEmployeesCount}
                        subtitle="Miembros activos"
                        icon={Users}
                        color="green"
                    />
                    <StatsCard
                        title="Clientes"
                        value={uniqueClientsCount}
                        subtitle="Clientes con actividad"
                        icon={FolderKanban}
                        color="purple"
                    />
                    <StatsCard
                        title="Categorías"
                        value={uniqueCategoriesCount}
                        subtitle="Categorías utilizadas"
                        icon={Layers}
                        color="pink"
                    />
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <CategoryDistributionChart data={categoryDistribution} />
                    <EmployeeHoursChart data={employeeHours} />
                    <ClientHoursChart data={clientHours} />
                </div>

                {/* Detailed Table */}
                <TasksDetailTable data={tasksDetail} />

                {/* Empty State */}
                {filteredEntries.length === 0 && (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-6xl mb-4">📋</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                No hay datos para los filtros seleccionados
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Intenta cambiar los filtros o selecciona un periodo diferente.
                            </p>
                            <button
                                onClick={handleResetFilters}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                )}

                {/* Info Panel */}
                {filteredEntries.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                        <h4 className="font-semibold text-blue-900 mb-3">
                            📊 Resumen del Análisis
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-blue-700 font-medium">Promedio por Tarea</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {totalTasks > 0 ? formatHours(totalHours / totalTasks) : '0h'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-blue-700 font-medium">Promedio por Persona</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {uniqueEmployeesCount > 0 ? formatHours(totalHours / uniqueEmployeesCount) : '0h'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-blue-700 font-medium">Categoría Principal</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {categoryDistribution.length > 0 
                                        ? `${categoryDistribution[0].emoji || ''} ${categoryDistribution[0].name}`.trim()
                                        : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
