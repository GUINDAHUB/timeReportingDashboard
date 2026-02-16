'use client'

import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { getMonthName } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DateRangeSelectorProps {
    mode: 'month' | 'range'
    month: number
    year: number
    startMonth?: number
    startYear?: number
    endMonth?: number
    endYear?: number
    onMonthChange: (month: number, year: number) => void
    onRangeChange: (startMonth: number, startYear: number, endMonth: number, endYear: number) => void
    onModeChange: (mode: 'month' | 'range') => void
}

export function DateRangeSelector({
    mode,
    month,
    year,
    startMonth,
    startYear,
    endMonth,
    endYear,
    onMonthChange,
    onRangeChange,
    onModeChange
}: DateRangeSelectorProps) {
    const [showRangePicker, setShowRangePicker] = useState(false)
    const [tempStartMonth, setTempStartMonth] = useState(startMonth || month)
    const [tempStartYear, setTempStartYear] = useState(startYear || year)
    const [tempEndMonth, setTempEndMonth] = useState(endMonth || month)
    const [tempEndYear, setTempEndYear] = useState(endYear || year)

    // Navegación para modo mes único
    const handlePrevious = () => {
        if (month === 1) {
            onMonthChange(12, year - 1)
        } else {
            onMonthChange(month - 1, year)
        }
    }

    const handleNext = () => {
        if (month === 12) {
            onMonthChange(1, year + 1)
        } else {
            onMonthChange(month + 1, year)
        }
    }

    const handleToday = () => {
        const now = new Date()
        onMonthChange(now.getMonth() + 1, now.getFullYear())
        onModeChange('month')
        setShowRangePicker(false)
    }

    const isCurrentMonth = () => {
        const now = new Date()
        return mode === 'month' && month === now.getMonth() + 1 && year === now.getFullYear()
    }

    // Presets de rangos
    const applyPreset = (preset: 'last3' | 'last6' | 'thisYear' | 'lastYear') => {
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        switch (preset) {
            case 'last3':
                // Últimos 3 meses desde el mes actual
                const start3 = new Date(currentYear, currentMonth - 3, 1)
                onRangeChange(
                    start3.getMonth() + 1,
                    start3.getFullYear(),
                    currentMonth,
                    currentYear
                )
                break
            case 'last6':
                // Últimos 6 meses desde el mes actual
                const start6 = new Date(currentYear, currentMonth - 6, 1)
                onRangeChange(
                    start6.getMonth() + 1,
                    start6.getFullYear(),
                    currentMonth,
                    currentYear
                )
                break
            case 'thisYear':
                // De enero al mes actual del año actual
                onRangeChange(1, currentYear, currentMonth, currentYear)
                break
            case 'lastYear':
                // Todo el año pasado
                onRangeChange(1, currentYear - 1, 12, currentYear - 1)
                break
        }
        setShowRangePicker(false)
    }

    const applyCustomRange = () => {
        // Validar que el rango sea válido
        const startDate = new Date(tempStartYear, tempStartMonth - 1)
        const endDate = new Date(tempEndYear, tempEndMonth - 1)

        if (startDate > endDate) {
            alert('La fecha de inicio debe ser anterior a la fecha de fin')
            return
        }

        onRangeChange(tempStartMonth, tempStartYear, tempEndMonth, tempEndYear)
        setShowRangePicker(false)
    }

    const cancelRangeMode = () => {
        onModeChange('month')
        setShowRangePicker(false)
    }

    // Formato de visualización
    const getDisplayText = () => {
        if (mode === 'range' && startMonth && startYear && endMonth && endYear) {
            if (startMonth === endMonth && startYear === endYear) {
                return `${getMonthName(startMonth)} ${startYear}`
            }
            return `${getMonthName(startMonth)} ${startYear} - ${getMonthName(endMonth)} ${endYear}`
        }
        return `${getMonthName(month)} ${year}`
    }

    return (
        <div className="relative">
            <div className="flex items-center gap-3 bg-white px-4 py-2 border rounded-lg shadow-sm">
                {/* Navegación solo en modo mes */}
                {mode === 'month' && (
                    <button
                        onClick={handlePrevious}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Mes anterior"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                )}

                {/* Display actual */}
                <div className="flex items-center gap-2 min-w-[220px] justify-center">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-base font-semibold text-gray-900 capitalize">
                        {getDisplayText()}
                    </span>
                </div>

                {/* Navegación solo en modo mes */}
                {mode === 'month' && (
                    <button
                        onClick={handleNext}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Mes siguiente"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                )}

                {/* Botón de rango */}
                <Button
                    variant={mode === 'range' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowRangePicker(!showRangePicker)}
                    className="ml-2"
                >
                    {mode === 'range' ? 'Rango activo' : 'Seleccionar rango'}
                </Button>

                {/* Botón cancelar rango */}
                {mode === 'range' && (
                    <button
                        onClick={cancelRangeMode}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Volver a mes único"
                    >
                        <X className="w-5 h-5 text-red-600" />
                    </button>
                )}

                {/* Botón Hoy */}
                {!isCurrentMonth() && (
                    <button
                        onClick={handleToday}
                        className="ml-2 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                        Hoy
                    </button>
                )}
            </div>

            {/* Panel de selección de rango */}
            {showRangePicker && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-white border rounded-lg shadow-lg p-4 w-[400px]">
                    <h3 className="font-semibold text-gray-900 mb-3">Seleccionar Rango de Fechas</h3>

                    {/* Presets */}
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Accesos rápidos:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('last3')}
                                className="text-sm"
                            >
                                Últimos 3 meses
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('last6')}
                                className="text-sm"
                            >
                                Últimos 6 meses
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('thisYear')}
                                className="text-sm"
                            >
                                Este año
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('lastYear')}
                                className="text-sm"
                            >
                                Año pasado
                            </Button>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 mb-3">Rango personalizado:</p>

                        {/* Fecha inicio */}
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Desde:
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={tempStartMonth}
                                    onChange={(e) => setTempStartMonth(Number(e.target.value))}
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>
                                            {getMonthName(m)}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={tempStartYear}
                                    onChange={(e) => setTempStartYear(Number(e.target.value))}
                                    className="w-20 px-2 py-1 border rounded text-sm"
                                    min="2020"
                                    max="2100"
                                />
                            </div>
                        </div>

                        {/* Fecha fin */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Hasta:
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={tempEndMonth}
                                    onChange={(e) => setTempEndMonth(Number(e.target.value))}
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>
                                            {getMonthName(m)}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={tempEndYear}
                                    onChange={(e) => setTempEndYear(Number(e.target.value))}
                                    className="w-20 px-2 py-1 border rounded text-sm"
                                    min="2020"
                                    max="2100"
                                />
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRangePicker(false)}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={applyCustomRange}
                                className="flex-1"
                            >
                                Aplicar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
