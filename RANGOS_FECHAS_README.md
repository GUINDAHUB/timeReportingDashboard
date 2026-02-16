# Sistema de Rangos de Fechas - Dashboard

## 📋 Resumen de la Implementación

Se ha implementado un sistema completo de selección de rangos de fechas para el dashboard de rentabilidad. Ahora puedes visualizar métricas agregadas de múltiples meses, lo cual es especialmente útil para proyectos que duran varios meses.

## ✨ Funcionalidades Implementadas

### 1. **Selector de Rango de Fechas** (`DateRangeSelector`)
- **Modo Mes Único**: Navegación mes a mes (modo predeterminado)
- **Modo Rango**: Selección de múltiples meses
- **Presets Rápidos**:
  - Últimos 3 meses
  - Últimos 6 meses
  - Este año (enero al mes actual)
  - Año pasado (enero a diciembre del año anterior)
- **Rango Personalizado**: Selector manual de mes/año inicio y fin
- **Botón "Hoy"**: Volver rápidamente al mes actual
- **Indicador Visual**: Muestra claramente si estás en modo mes único o rango

### 2. **Cálculos de Rentabilidad Mejorados**
Todas las funciones de cálculo ahora soportan rangos de fechas:

#### `calculateClientCostsForMonth()`
- Agrega **facturación** de todos los meses del rango
- Suma **gastos directos** de cada mes
- Calcula **costos de personal** usando la tarifa correcta para cada mes
- Considera **overrides mensuales** de costos por empleado

#### `calculateMonthlyMetrics()`
- Métricas agregadas para todo el periodo:
  - Facturación total
  - Horas totales (estimadas y reales)
  - Costes totales
  - Márgenes brutos y reales
  - Desviaciones de horas

#### `calculateEmployeeProfitability()`
- Rentabilidad por empleado en el rango completo
- Distribución proporcional de ingresos
- Horas esperadas agregadas del periodo
- Costos calculados con tarifas por mes

#### `calculateEmployeeHoursProgress()`
- Progreso de horas vs. esperadas en el rango
- Suma de horas mensuales esperadas
- Desviaciones totales del periodo

### 3. **Store de Fechas Actualizado** (`date-store.ts`)
Nuevas funciones:
- `setDateRange(startMonth, startYear, endMonth, endYear)`: Establece un rango
- `getDateRange()`: Devuelve el rango en formato SQL
- Soporte para modo `'range'` además de `'month'`, `'ytd'`, `'all'`

### 4. **Tipos Actualizados** (`types.ts`)
```typescript
export type DateFilterMode = 'month' | 'range' | 'ytd' | 'all'

export interface DateFilter {
    mode: DateFilterMode
    month: number
    year: number
    startMonth?: number
    startYear?: number
    endMonth?: number
    endYear?: number
}
```

## 🎯 Casos de Uso

### Ejemplo 1: Proyecto de 3 meses
Un proyecto que dura de marzo a mayo, donde:
- **Marzo**: 50 horas de trabajo, 0€ facturación
- **Abril**: 30 horas de trabajo, 0€ facturación  
- **Mayo**: 20 horas de trabajo, 15.000€ facturación total

Con el selector de rango puedes:
1. Seleccionar "Rango personalizado"
2. Desde: Marzo 2025
3. Hasta: Mayo 2025
4. Ver métricas consolidadas: 100h totales, 15.000€ ingresos, margen real del proyecto completo

### Ejemplo 2: Análisis Trimestral
Quieres ver el rendimiento del Q1 (primer trimestre):
1. Click en "Seleccionar rango"
2. Click en "Últimos 3 meses" (preset)
3. Automáticamente muestra el rango de los últimos 3 meses desde hoy

### Ejemplo 3: Comparación Anual
Ver todo el año actual hasta la fecha:
1. Click en "Seleccionar rango"
2. Click en "Este año"
3. Muestra de enero al mes actual

## 🔧 Detalles Técnicos

### Cálculo de Costos por Empleado
El sistema es inteligente y aplica el costo correcto según el mes:
- Si un empleado tiene un override mensual (vacaciones, aumento, etc.), lo usa
- Si no, usa su tarifa por defecto
- Calcula el costo total agregando: `Σ(horas_mes_i × tarifa_mes_i)`

### Agregación de Datos
Para rangos de meses:
- **Ingresos**: Suma de todos los `client_monthly_goals.fee` del rango
- **Gastos Directos**: Suma de todos los `client_direct_costs.amount` del rango
- **Horas**: Suma de todas las `time_entries` en el rango
- **Horas Esperadas**: Suma de `employee_monthly_costs.monthly_hours` (o default) de cada mes

### Validación
- No permite seleccionar fecha fin anterior a fecha inicio
- Muestra alertas si el rango es inválido
- Mantiene compatibilidad con modo mes único

## 🎨 Interfaz de Usuario

### Modo Mes Único
```
[←] [📅 Enero 2025] [→] [Seleccionar rango] [Hoy]
```

### Modo Rango Activo
```
[📅 Marzo 2025 - Mayo 2025] [Rango activo] [✕] [Hoy]
```

### Panel de Selección
Cuando haces click en "Seleccionar rango", se abre un panel con:
- 4 botones de presets rápidos (grid 2x2)
- Separador visual
- Selectores personalizados (mes + año para inicio y fin)
- Botones "Cancelar" y "Aplicar"

## 📊 Impacto en el Dashboard

Todos los KPIs se ajustan automáticamente al rango seleccionado:
- **Facturación Total**: Suma del periodo
- **Horas Invertidas**: Total del periodo vs. estimadas
- **Coste Real**: Agregado con tarifas correctas por mes
- **Margen Real**: Calculado sobre el periodo completo
- **Desviación de Horas**: Estimadas vs. reales del periodo
- **Rentabilidad por Cliente**: Consolidada en el rango
- **Progreso de Empleados**: Horas trabajadas vs. esperadas del periodo
- **Rentabilidad por Empleado**: Ingresos generados vs. costos en el rango

## 🚀 Cómo Usar

1. **Abrir el Dashboard**: `/dashboard`
2. **Seleccionar Rango**:
   - Click en "Seleccionar rango"
   - Elegir preset o configurar personalizado
   - Click en "Aplicar"
3. **Ver Métricas**: Todas las tablas y gráficos se actualizan automáticamente
4. **Volver a Mes Único**: Click en el botón "✕" o en "Hoy"

## 🔄 Compatibilidad

- ✅ **Retrocompatible**: El modo mes único funciona exactamente igual que antes
- ✅ **Persistencia**: El rango seleccionado se guarda en localStorage
- ✅ **Performance**: Queries optimizadas con carga paralela
- ✅ **Validación**: Previene configuraciones inválidas

## 📝 Archivos Modificados

1. **`lib/types.ts`**: Tipos actualizados para DateFilter
2. **`lib/store/date-store.ts`**: Store con soporte para rangos
3. **`components/dashboard/date-range-selector.tsx`**: Nuevo componente (337 líneas)
4. **`lib/services/employee-cost-calculator.ts`**: Funciones actualizadas para rangos
5. **`app/dashboard/page.tsx`**: Dashboard usando el nuevo selector

## 🎉 Ventajas

- **Visión Completa**: Ver proyectos multi-mes completos
- **Análisis Flexible**: Comparar periodos personalizados
- **Presets Útiles**: Acceso rápido a rangos comunes
- **Precisión**: Costos calculados correctamente por mes
- **UX Intuitiva**: Interfaz clara y fácil de usar

---

**Fecha de Implementación**: 11 de Febrero, 2026
**Estado**: ✅ Completado y testeado
