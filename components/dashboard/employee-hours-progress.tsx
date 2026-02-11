'use client'

import { formatHours } from '@/lib/utils'

interface EmployeeHoursData {
    employeeName: string
    expectedHours: number
    actualHours: number
    percentage: number
    deviation: number
}

interface Props {
    data: EmployeeHoursData[]
}

export function EmployeeHoursProgress({ data }: Props) {
    // Sort by percentage descending (most complete first)
    const sortedData = [...data].sort((a, b) => b.percentage - a.percentage)

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                    Progreso de Horas por Empleado
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Comparativa de horas registradas vs. horas mensuales esperadas
                </p>
            </div>

            {sortedData.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                    No hay datos de empleados para mostrar
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedData.map((employee, index) => {
                        const isOvertime = employee.percentage > 100
                        const isCritical = employee.percentage < 50
                        const isWarning = employee.percentage >= 50 && employee.percentage < 80
                        const isGood = employee.percentage >= 80 && employee.percentage <= 100
                        
                        return (
                            <div key={index} className="space-y-2">
                                {/* Employee Info */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                            isOvertime ? 'bg-blue-100 text-blue-700' :
                                            isCritical ? 'bg-red-100 text-red-700' :
                                            isWarning ? 'bg-orange-100 text-orange-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {employee.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {employee.employeeName}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatHours(employee.actualHours)} de {formatHours(employee.expectedHours)}
                                                {employee.deviation !== 0 && (
                                                    <span className={`ml-2 ${
                                                        employee.deviation > 0 ? 'text-blue-600' :
                                                        employee.deviation < 0 && employee.percentage < 80 ? 'text-red-600' :
                                                        'text-gray-500'
                                                    }`}>
                                                        ({employee.deviation > 0 ? '+' : ''}{formatHours(employee.deviation)})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Percentage Badge */}
                                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                        isOvertime ? 'bg-blue-100 text-blue-700' :
                                        isCritical ? 'bg-red-100 text-red-700' :
                                        isWarning ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                        {employee.percentage.toFixed(1)}%
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative">
                                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${
                                                isOvertime ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                                isCritical ? 'bg-gradient-to-r from-red-400 to-red-600' :
                                                isWarning ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                                                'bg-gradient-to-r from-green-400 to-green-600'
                                            }`}
                                            style={{ 
                                                width: `${Math.min(100, employee.percentage)}%`,
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Overflow indicator for overtime */}
                                    {isOvertime && (
                                        <div className="absolute -right-1 top-1/2 -translate-y-1/2">
                                            <div className="flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-lg">
                                                <span>⚠️</span>
                                                <span>+{formatHours(employee.deviation)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Legend */}
            {sortedData.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-gray-600">&lt;50%: Crítico</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-gray-600">50-80%: Atención</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-gray-600">80-100%: Óptimo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-gray-600">&gt;100%: Horas extra</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
