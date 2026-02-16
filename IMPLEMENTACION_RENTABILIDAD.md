# 📊 Sistema de Cálculo de Rentabilidad por Cliente - IMPLEMENTADO

## ✅ Resumen de la Implementación

Se ha implementado exitosamente el sistema avanzado de cálculo de rentabilidad que permite calcular el **Margen Bruto** por cliente, considerando:

1. **Coste Personal Directo**: Calculado automáticamente (Horas × Coste/Hora de cada empleado)
2. **Gastos Directos del Cliente**: Campo editable para ingresar gastos variables específicos del cliente
3. **Gastos Operativos Generales**: Campo global por mes para costes fijos de la empresa

## 🎯 Fórmula de Margen Bruto

```
Margen Bruto = Ingresos - (Coste Personal Directo + Gastos Directos)
```

**Margen Bruto %** = (Margen Bruto / Ingresos) × 100

## 📦 Archivos Creados/Modificados

### 1. **Base de Datos**
- ✅ `supabase/migrations/004_profitability_costs.sql` - Migración principal
- ✅ `supabase/migrations/004_profitability_costs_rollback.sql` - Script de rollback
- ✅ `supabase/schema.sql` - Actualizado con las nuevas tablas
- ✅ `supabase/migrations/004_README.md` - Documentación completa

**Nuevas tablas:**
- `client_direct_costs` - Gastos directos por cliente/mes
- `monthly_operational_costs` - Gastos operativos por mes

### 2. **Backend/API**
- ✅ `app/api/client-direct-costs/route.ts` - CRUD para gastos directos
- ✅ `app/api/operational-costs/route.ts` - CRUD para gastos operativos
- ✅ `lib/services/employee-cost-calculator.ts` - Actualizado con cálculo de Margen Bruto
- ✅ `lib/types.ts` - Nuevos tipos TypeScript

### 3. **Frontend**
- ✅ `app/dashboard/page.tsx` - Dashboard con gastos operativos editables
- ✅ `components/dashboard/profitability-table.tsx` - Tabla con gastos directos editables

## 🚀 Cómo Usar

### Paso 1: Ejecutar la Migración SQL

```bash
# Opción A: Usar el script (si existe)
node scripts/run-migrations.js

# Opción B: Manualmente en Supabase Dashboard
# 1. Ve a SQL Editor en Supabase
# 2. Copia el contenido de: supabase/migrations/004_profitability_costs.sql
# 3. Ejecuta el script
```

### Paso 2: Acceder al Dashboard

1. Ve a `/dashboard` en tu aplicación
2. Verás el nuevo banner amarillo de **Gastos Operativos Generales**
3. La tabla de rentabilidad ahora muestra las nuevas columnas

### Paso 3: Configurar Gastos

#### A) Gastos Operativos Generales (Banner superior)
1. Click en **"Editar"**
2. Introduce el monto de gastos fijos del mes (ej: 5000€)
3. Click en **"Guardar"**

#### B) Gastos Directos por Cliente (Tabla)
1. Busca la columna **"Gastos Directos"**
2. Click en el icono del **lápiz** 📝 al lado del monto
3. Introduce el gasto directo del cliente (ej: 1500€)
4. Click en el **check verde** ✓ para guardar

## 📊 Vista en el Dashboard

### Banner de Gastos Operativos
```
┌─────────────────────────────────────────────────────────────┐
│ 🔶 Gastos Operativos Generales del Mes                      │
│    Costes fijos de la empresa (no asignados a cliente)      │
│                                          5.000,00 € [Editar] │
└─────────────────────────────────────────────────────────────┘
```

### Tabla de Rentabilidad por Cliente

| Cliente | Ingresos | Coste Personal | Gastos Directos | Costes Directos | **Margen Bruto** | **% Margen** |
|---------|----------|----------------|-----------------|-----------------|------------------|--------------|
| Cliente A | 10.000€ | 4.000€ | 1.500€ 📝 | 5.500€ | **4.500€** | **45%** ✅ |
| Cliente B | 5.000€ | 3.200€ | 500€ 📝 | 3.700€ | **1.300€** | **26%** ✅ |
| Cliente C | 3.000€ | 2.800€ | 800€ 📝 | 3.600€ | **-600€** | **-20%** ❌ |

## 🔍 Indicadores de Color

### Margen Bruto %
- 🟢 **Verde** ≥ 50% - Excelente rentabilidad
- 🔵 **Azul** ≥ 20% - Buena rentabilidad
- 🟠 **Naranja** ≥ 0% - Rentabilidad baja
- 🔴 **Rojo** < 0% - Pérdidas

## 🛠 APIs Disponibles

### 1. Gastos Directos de Cliente

**GET** - Obtener gastos
```bash
curl -X GET "https://tu-app.com/api/client-direct-costs?clientId=xxx&month=1&year=2026"
```

**POST** - Crear/Actualizar
```bash
curl -X POST "https://tu-app.com/api/client-direct-costs" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "uuid-del-cliente",
    "month": 1,
    "year": 2026,
    "amount": 1500.50,
    "notes": "Gastos Facebook Ads"
  }'
```

**DELETE** - Eliminar
```bash
curl -X DELETE "https://tu-app.com/api/client-direct-costs?id=xxx"
```

### 2. Gastos Operativos

**GET** - Obtener gastos
```bash
curl -X GET "https://tu-app.com/api/operational-costs?month=1&year=2026"
```

**POST** - Crear/Actualizar
```bash
curl -X POST "https://tu-app.com/api/operational-costs" \
  -H "Content-Type: application/json" \
  -d '{
    "month": 1,
    "year": 2026,
    "amount": 5000.00,
    "notes": "Alquiler + servicios"
  }'
```

## 📈 Ejemplo de Cálculo

### Cliente: "ACME Corp" - Enero 2026

**Datos de entrada:**
- Facturación mensual: 10.000€
- Horas trabajadas: 
  - Juan (40h × 25€/h) = 1.000€
  - María (30h × 30€/h) = 900€
  - Pedro (20h × 22€/h) = 440€
- Gastos directos: 1.500€ (publicidad digital)

**Cálculo:**
```
Coste Personal Directo = 1.000€ + 900€ + 440€ = 2.340€
Gastos Directos = 1.500€
────────────────────────────────────────────────
Costes Directos Totales = 2.340€ + 1.500€ = 3.840€

Margen Bruto = 10.000€ - 3.840€ = 6.160€
% Margen Bruto = (6.160€ / 10.000€) × 100 = 61.6% ✅
```

**Interpretación:** Cliente muy rentable con margen del 61.6%

## 🔄 Rollback (Si algo sale mal)

Si necesitas deshacer la migración:

```sql
-- Ejecuta en Supabase SQL Editor:
-- Archivo: supabase/migrations/004_profitability_costs_rollback.sql
```

**⚠️ ADVERTENCIA:** Esto eliminará TODAS las tablas y datos de gastos.

## 📝 Notas Importantes

### Sobre Gastos Operativos
- De momento solo se **almacenan** los gastos operativos
- En el futuro se usarán para calcular **EBIT (Margen Neto)**:
  ```
  EBIT = Margen Bruto Total - Gastos Operativos Generales
  ```

### Sobre Edición
- Los gastos directos son **editables directamente** desde el dashboard
- Los gastos operativos son **editables desde el banner superior**
- Los cambios se **guardan automáticamente** y actualizan la vista

### Sobre Cálculos
- El **Coste Personal** se calcula automáticamente del registro de horas
- Los **Gastos Directos** deben ingresarse manualmente
- El **Margen Bruto** se recalcula automáticamente al cambiar gastos

## 🎓 Casos de Uso

### Caso 1: Cliente con gastos de publicidad
```
Cliente: "Tienda Online XYZ"
Ingresos: 8.000€
Coste Personal: 3.200€
Gastos Directos: 2.000€ (Facebook + Google Ads)
→ Margen Bruto: 2.800€ (35%)
```

### Caso 2: Cliente de servicios puros (sin gastos externos)
```
Cliente: "Consultoría ABC"
Ingresos: 12.000€
Coste Personal: 5.000€
Gastos Directos: 0€
→ Margen Bruto: 7.000€ (58.3%)
```

### Caso 3: Cliente con materiales y subcontratas
```
Cliente: "Producción Video DEF"
Ingresos: 15.000€
Coste Personal: 6.000€
Gastos Directos: 5.500€ (equipo alquiler + freelance)
→ Margen Bruto: 3.500€ (23.3%)
```

## ✨ Próximos Pasos (Futuro)

1. **EBIT (Margen Neto)**: 
   - Implementar el cálculo final: `EBIT = Margen Bruto - Gastos Operativos`
   - Mostrar en KPI cards del dashboard

2. **Análisis de Tendencias**:
   - Gráficos de evolución del Margen Bruto mes a mes
   - Comparativas entre clientes

3. **Alertas Automáticas**:
   - Notificar cuando un cliente tiene margen negativo
   - Avisos de desviaciones importantes

4. **Exportación**:
   - Exportar reportes de rentabilidad a Excel/PDF

## 🐛 Troubleshooting

### Problema: "No puedo editar los gastos directos"
**Solución**: Verifica que:
1. La migración se ejecutó correctamente
2. Las políticas RLS están activas
3. No hay errores en la consola del navegador

### Problema: "Los cambios no se guardan"
**Solución**: 
1. Revisa la consola del navegador (F12)
2. Verifica que las APIs respondan (Network tab)
3. Comprueba la conexión a Supabase

### Problema: "La tabla no muestra las nuevas columnas"
**Solución**:
1. Refresca el navegador (Ctrl+F5 o Cmd+Shift+R)
2. Limpia la caché del navegador
3. Verifica que el código esté actualizado

## 📞 Soporte

Para cualquier duda o problema:
1. Revisa la documentación en `004_README.md`
2. Verifica los logs en la consola del navegador
3. Revisa los logs de Supabase en el dashboard

---

**✅ Sistema implementado y listo para usar**

Fecha de implementación: 11 de Febrero 2026
