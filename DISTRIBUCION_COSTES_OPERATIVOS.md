# 🎯 Sistema de Distribución de Costes Operativos - IMPLEMENTADO

## ✅ Resumen de la Implementación

Se ha implementado exitosamente el sistema de distribución de costes operativos entre clientes con dos métodos configurables desde la interfaz.

---

## 📊 Funcionalidades Implementadas

### 1. Dos Métodos de Distribución

#### 🔷 Método 1: Por Volumen de Facturación (`revenue`)
- Los costes se reparten proporcionalmente según la facturación de cada cliente
- **Lógica:** Cliente que más factura = Mayor parte de los costes operativos
- **Fórmula:** `Coste_Cliente = (Facturación_Cliente / Facturación_Total) × Costes_Operativos`

**Ejemplo:**
```
Cliente A: 10.000€ facturación (50% del total) → 2.500€ de costes operativos
Cliente B: 6.000€ facturación (30% del total) → 1.500€ de costes operativos
Cliente C: 4.000€ facturación (20% del total) → 1.000€ de costes operativos
```

#### 🔷 Método 2: Por Carga de Trabajo (`workload`)
- Los costes se reparten proporcionalmente según las horas trabajadas
- **Lógica:** Cliente que consume más tiempo del equipo = Mayor parte de los costes operativos
- **Fórmula:** `Coste_Cliente = (Horas_Cliente / Horas_Totales) × Costes_Operativos`

**Ejemplo:**
```
Cliente A: 100h trabajadas (50% del total) → 2.500€ de costes operativos
Cliente B: 80h trabajadas (40% del total) → 2.000€ de costes operativos
Cliente C: 20h trabajadas (10% del total) → 500€ de costes operativos
```

---

## 🔧 Archivos Modificados/Creados

### Base de Datos
✅ `supabase/migrations/005_operational_costs_distribution.sql`
- Añade columna `distribution_method` a `monthly_operational_costs`
- Crea tipo ENUM `operational_cost_distribution_method`

✅ `supabase/migrations/005_operational_costs_distribution_rollback.sql`
- Script para deshacer los cambios si es necesario

✅ `supabase/migrations/005_README.md`
- Documentación completa de la migración

### Backend
✅ `lib/types.ts`
- Añadido tipo `OperationalCostDistributionMethod`
- Actualizada interfaz `MonthlyOperationalCost`

✅ `lib/services/employee-cost-calculator.ts`
- **Actualizada interfaz** `ClientCostBreakdown`:
  - Nuevo campo: `operational_costs`
  - Nuevo campo: `net_margin`
  - Nuevo campo: `net_margin_percent`
- **Actualizada función** `calculateClientCostsForMonth`:
  - Obtiene costes operativos de la BD
  - Distribuye según el método configurado
  - Calcula margen NETO para cada cliente
- **Actualizada función** `calculateMonthlyMetrics`:
  - Incluye totales de costes operativos
  - Incluye totales de margen neto

✅ `app/api/operational-costs/route.ts`
- Actualizado POST para incluir `distribution_method`
- Validación del método de distribución

### Frontend

✅ `app/import/page.tsx`
- **Nuevo selector** de método de distribución con dos opciones:
  - 💰 Reparto por Volumen de Facturación
  - ⏱️ Reparto por Carga de Trabajo
- **Nueva función** `loadDistributionMethod()`: Carga el método actual
- **Nueva función** `handleSaveDistributionMethod()`: Guarda el método seleccionado
- **Estado**: `distributionMethod`, `savingDistribution`

✅ `components/dashboard/profitability-table.tsx`
- **Nueva columna**: "Gastos Operativos"
- **Reemplazada columna**: "Margen Bruto" → "Margen Neto"
- **Reemplazada columna**: "% Margen Bruto" → "% Margen Neto"
- Ordenación por margen NETO (descendente)

✅ `app/dashboard/page.tsx`
- **KPI actualizado**: "Margen Real" → "Margen Neto"
- **Métricas actualizadas**:
  - `totalOperationalCosts`
  - `totalNetMargin`
  - `totalNetMarginPercent`
- Datos de clientes incluyen `operationalCosts` y `netMargin`

✅ `DISTRIBUCION_COSTES_OPERATIVOS.md` (este archivo)
- Documentación completa del sistema

---

## 🚀 Cómo Usarlo

### Paso 1: Ejecutar la Migración SQL

**Opción A - Script automático:**
```bash
node scripts/run-migrations.js
```

**Opción B - Manualmente en Supabase:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia el contenido de `supabase/migrations/005_operational_costs_distribution.sql`
3. Ejecuta el script

### Paso 2: Configurar el Método de Distribución

1. Ve a la página de **Importar** (`/import`)
2. Verás un nuevo panel morado: **"Método de Reparto de Costes Operativos"**
3. Selecciona uno de los dos métodos:
   - 💰 **Por Volumen de Facturación**
   - ⏱️ **Por Carga de Trabajo**
4. Haz clic en **"Guardar Método de Reparto"**

### Paso 3: Configurar Costes Operativos

1. Ve a **Gestión de Clientes** (`/clients`)
2. Introduce los costes operativos del mes
3. Los costes se distribuirán automáticamente según el método configurado

### Paso 4: Ver Resultados en el Dashboard

1. Ve al **Dashboard** (`/dashboard`)
2. Verás:
   - **KPI "Margen Neto"** (en vez de "Margen Real")
   - **Tabla de Rentabilidad** con nueva columna "Gastos Operativos"
   - **Columna "Margen Neto"** (en vez de "Margen Bruto")

---

## 📐 Fórmula del Margen NETO

### Antes (Margen Bruto)
```
Margen Bruto = Ingresos - (Coste Personal + Gastos Directos)
```

### Ahora (Margen NETO) ✅
```
Margen Neto = Ingresos - (Coste Personal + Gastos Directos + Gastos Operativos)
```

El **Margen NETO** es el margen **REAL** después de todos los costes.

---

## 📊 Ejemplo Completo de Uso

### Configuración Inicial
- **Costes Operativos del Mes:** 5.000€
- **Método Seleccionado:** Por Carga de Trabajo

### Datos de Clientes (Enero 2026)

| Cliente | Facturación | Horas | Coste Personal | Gastos Directos |
|---------|-------------|-------|----------------|-----------------|
| ACME Corp | 10.000€ | 100h | 3.000€ | 1.000€ |
| Beta Ltd | 6.000€ | 80h | 2.400€ | 500€ |
| Gamma Inc | 4.000€ | 20h | 600€ | 200€ |
| **TOTAL** | **20.000€** | **200h** | **6.000€** | **1.700€** |

### Cálculo de Distribución de Costes Operativos

**Total de Horas:** 200h

- **ACME Corp:** (100h / 200h) × 5.000€ = **2.500€**
- **Beta Ltd:** (80h / 200h) × 5.000€ = **2.000€**
- **Gamma Inc:** (20h / 200h) × 5.000€ = **500€**

### Margen NETO por Cliente

#### ACME Corp
```
Ingresos:           10.000€
- Coste Personal:    3.000€
- Gastos Directos:   1.000€
- Gastos Operativos: 2.500€
────────────────────────────
Margen Neto:         3.500€ (35%)
```

#### Beta Ltd
```
Ingresos:           6.000€
- Coste Personal:   2.400€
- Gastos Directos:    500€
- Gastos Operativos: 2.000€
────────────────────────────
Margen Neto:        1.100€ (18.3%)
```

#### Gamma Inc
```
Ingresos:           4.000€
- Coste Personal:     600€
- Gastos Directos:    200€
- Gastos Operativos:  500€
────────────────────────────
Margen Neto:        2.700€ (67.5%)
```

### Totales
```
Facturación Total:  20.000€
- Costes Personal:   6.000€
- Gastos Directos:   1.700€
- Gastos Operativos: 5.000€
─────────────────────────────
Margen Neto Total:   7.300€ (36.5%)
```

---

## 🎯 ¿Qué Método Elegir?

### 💰 Por Volumen de Facturación

**Úsalo cuando:**
- ✅ Los clientes tienen tarifas muy diferentes
- ✅ La facturación refleja mejor el valor aportado
- ✅ Tienes clientes premium que justifican mayores costes

**Ventajas:**
- Refleja la contribución económica de cada cliente
- Los clientes grandes asumen mayor parte de la estructura
- Más justo desde perspectiva de valor generado

### ⏱️ Por Carga de Trabajo

**Úsalo cuando:**
- ✅ Todos los clientes pagan tarifas similares
- ✅ Quieres reflejar el coste real de recursos consumidos
- ✅ El tiempo dedicado es el mejor indicador de consumo de recursos

**Ventajas:**
- Refleja el uso real de recursos de la empresa
- Más preciso para calcular rentabilidad por cliente
- Cliente que consume más tiempo, paga más estructura

---

## 💡 Consejos y Mejores Prácticas

### 1. Consistencia
Mantén el mismo método durante varios meses para poder comparar resultados históricos.

### 2. Análisis Comparativo
Prueba ambos métodos para ver cuál refleja mejor tu realidad:
1. Guarda el método actual
2. Revisa los márgenes netos
3. Cambia al otro método
4. Compara los resultados
5. Elige el que mejor se adapte a tu modelo de negocio

### 3. Documentación
Documenta qué método usas y por qué. Esto te ayudará en el futuro.

### 4. Comunicación con Clientes
Si facturas parte de los costes operativos a tus clientes, comunica claramente:
- Qué método de reparto usas
- Por qué es justo
- Cómo se calcula su parte

### 5. Revisión Periódica
Revisa trimestralmente si el método sigue siendo el más adecuado.

---

## 🔄 Cambiar el Método de Distribución

Puedes cambiar el método en cualquier momento:

1. Ve a `/import`
2. Selecciona el nuevo método
3. Haz clic en "Guardar"
4. El sistema actualizará **todos** los costes operativos existentes
5. El dashboard se actualizará automáticamente

**⚠️ Importante:** El cambio afecta a todos los meses con costes operativos.

---

## 🔙 Rollback (Deshacer Cambios)

Si necesitas deshacer la implementación:

```sql
-- Ejecutar en Supabase SQL Editor:
-- supabase/migrations/005_operational_costs_distribution_rollback.sql
```

**⚠️ ADVERTENCIA:** 
- Esto eliminará el campo `distribution_method`
- Los costes operativos NO se eliminarán
- El sistema volverá a NO distribuir costes operativos

---

## 📋 Checklist de Implementación

- [x] Migración SQL creada
- [x] Tipos TypeScript actualizados
- [x] Calculador de costes actualizado
- [x] API de costes operativos actualizada
- [x] Página de importar con selector de método
- [x] Tabla de rentabilidad actualizada
- [x] Dashboard actualizado con margen neto
- [x] Documentación completa
- [ ] **Ejecutar migración SQL** (pendiente)
- [ ] Configurar método de distribución
- [ ] Probar con datos reales

---

## 🐛 Troubleshooting

### Problema: No veo la columna "Gastos Operativos"
**Solución:**
1. Refresca el navegador (Ctrl+F5)
2. Verifica que la migración se ejecutó correctamente
3. Limpia la caché del navegador

### Problema: Los costes no se distribuyen
**Solución:**
1. Verifica que tienes costes operativos configurados para el mes
2. Verifica que has guardado el método de distribución
3. Revisa los logs en la consola del navegador

### Problema: El método guardado no se aplica
**Solución:**
1. Ve a `/import` y vuelve a guardar el método
2. Verifica que hay costes operativos configurados
3. Refresca el dashboard

---

## 📞 Próximos Pasos Sugeridos

1. **Ejecutar la migración SQL**
2. **Configurar el método de distribución** en `/import`
3. **Introducir costes operativos** en `/clients`
4. **Revisar resultados** en el dashboard
5. **Comparar ambos métodos** para decidir cuál usar
6. **Documentar la decisión** para el equipo

---

**✅ Sistema Completamente Implementado**

Fecha de implementación: 12 de Febrero 2026
Autor: Asistente de Desarrollo

---

## 🎉 Resultado Final

Ahora tienes un sistema completo de análisis de rentabilidad que incluye:

1. ✅ Costes de personal (automático según horas)
2. ✅ Gastos directos por cliente (editables)
3. ✅ Gastos operativos distribuidos (configurable)
4. ✅ **Margen NETO real** por cliente
5. ✅ Comparación entre dos métodos de distribución
6. ✅ Interfaz intuitiva para configurar todo

¡Ya puedes tomar decisiones basadas en datos reales de rentabilidad!
