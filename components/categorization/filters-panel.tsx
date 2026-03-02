'use client'

import { Calendar, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMonthName } from '@/lib/utils'

interface FiltersProps {
    // Date filter
    mode: 'month' | 'range'
    selectedMonth: number
    selectedYear: number
    rangeStartMonth: number
    rangeStartYear: number
    rangeEndMonth: number
    rangeEndYear: number
    onModeChange: (mode: 'month' | 'range') => void
    onMonthChange: (month: number) => void
    onYearChange: (year: number) => void
    onRangeStartMonthChange: (month: number) => void
    onRangeStartYearChange: (year: number) => void
    onRangeEndMonthChange: (month: number) => void
    onRangeEndYearChange: (year: number) => void

    // Other filters
    selectedClient: string
    selectedEmployee: string
    selectedCategory: string
    clients: Array<{ id: string; name: string }>
    employees: string[]
    categories: Array<{ id: string; name: string; emoji: string | null }>
    onClientChange: (clientId: string) => void
    onEmployeeChange: (employee: string) => void
    onCategoryChange: (categoryId: string) => void
    onReset: () => void
}

export function FiltersPanel({
    mode,
    selectedMonth,
    selectedYear,
    rangeStartMonth,
    rangeStartYear,
    rangeEndMonth,
    rangeEndYear,
    selectedClient,
    selectedEmployee,
    selectedCategory,
    clients,
    employees,
    categories,
    onModeChange,
    onMonthChange,
    onYearChange,
    onRangeStartMonthChange,
    onRangeStartYearChange,
    onRangeEndMonthChange,
    onRangeEndYearChange,
    onClientChange,
    onEmployeeChange,
    onCategoryChange,
    onReset
}: FiltersProps) {
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    const hasActiveFilters = selectedClient !== 'all' || selectedEmployee !== 'all' || selectedCategory !== 'all'

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                </div>
                <div className="flex items-center gap-3">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
                        <button
                            type="button"
                            onClick={() => onModeChange('month')}
                            className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                mode === 'month'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Mes
                        </button>
                        <button
                            type="button"
                            onClick={() => onModeChange('range')}
                            className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                mode === 'range'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Rango meses
                        </button>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={onReset}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Date filter */}
                {mode === 'month' ? (
                    <>
                        {/* Month */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mes
                            </label>
                            <Select
                                value={selectedMonth.toString()}
                                onValueChange={(v) => onMonthChange(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(month => (
                                        <SelectItem key={month} value={month.toString()}>
                                            {getMonthName(month)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Año
                            </label>
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(v) => onYearChange(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                ) : (
                    <>
                        {/* From month/year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Desde mes
                            </label>
                            <Select
                                value={rangeStartMonth.toString()}
                                onValueChange={(v) => onRangeStartMonthChange(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(month => (
                                        <SelectItem key={month} value={month.toString()}>
                                            {getMonthName(month)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Desde año
                            </label>
                            <Select
                                value={rangeStartYear.toString()}
                                onValueChange={(v) => onRangeStartYearChange(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* To month/year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hasta mes
                            </label>
                            <Select
                                value={rangeEndMonth.toString()}
                                onValueChange={(v) => onRangeEndMonthChange(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(month => (
                                        <SelectItem key={month} value={month.toString()}>
                                            {getMonthName(month)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hasta año
                            </label>
                            <Select
                                value={rangeEndYear.toString()}
                                onValueChange={(v) => onRangeEndYearChange(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* Client */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cliente
                    </label>
                    <Select value={selectedClient} onValueChange={onClientChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los clientes</SelectItem>
                            {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Employee */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Persona
                    </label>
                    <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las personas</SelectItem>
                            {employees.map(employee => (
                                <SelectItem key={employee} value={employee}>
                                    {employee}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría
                    </label>
                    <Select value={selectedCategory} onValueChange={onCategoryChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.emoji && `${category.emoji} `}{category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
