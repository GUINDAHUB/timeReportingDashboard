# 📊 Migración 005: Distribución de Costes Operativos

## 🎯 Objetivo

Implementar la distribución de costes operativos entre clientes mediante dos métodos configurables:

1. **Por Volumen de Facturación** (`revenue`): Los costes se distribuyen proporcionalmente según la facturación de cada cliente
2. **Por Carga de Trabajo** (`workload`): Los costes se distribuyen proporcionalmente según las horas trabajadas en cada cliente

## 📋 Cambios en la Base de Datos

### Nueva Columna: `distribution_method`

Se añade a la tabla `monthly_operational_costs`:

```sql
ALTER TABLE monthly_operational_costs 
ADD COLUMN distribution_method operational_cost_distribution_method 
NOT NULL DEFAULT 'revenue';
```

### Nuevo Tipo ENUM

```sql
CREATE TYPE operational_cost_distribution_method AS ENUM (
    'revenue',      -- Distribución por facturación
    'workload'      -- Distribución por horas trabajadas
);
```

## 🔄 Métodos de Distribución

### 1️⃣ Por Volumen de Facturación (`revenue`)

**Lógica:**
```
Coste_Cliente = (Facturación_Cliente / Facturación_Total) × Costes_Operativos_Totales
```

**Ejemplo:**
- Costes operativos mensuales: 5.000€
- Cliente A factura 10.000€ (50% del total)
- Cliente B factura 6.000€ (30% del total)
- Cliente C factura 4.000€ (20% del total)

**Distribución:**
- Cliente A: 2.500€ (50% de 5.000€)
- Cliente B: 1.500€ (30% de 5.000€)
- Cliente C: 1.000€ (20% de 5.000€)

**Justificación:**
Los clientes que más facturan son los que más valor aportan y deben soportar mayor parte de la estructura empresarial.

### 2️⃣ Por Carga de Trabajo (`workload`)

**Lógica:**
```
Coste_Cliente = (Horas_Cliente / Horas_Totales) × Costes_Operativos_Totales
```

**Ejemplo:**
- Costes operativos mensuales: 5.000€
- Cliente A consume 100h (50% del total)
- Cliente B consume 80h (40% del total)
- Cliente C consume 20h (10% del total)

**Distribución:**
- Cliente A: 2.500€ (50% de 5.000€)
- Cliente B: 2.000€ (40% de 5.000€)
- Cliente C: 500€ (10% de 5.000€)

**Justificación:**
Los costes operativos existen para dar soporte a los empleados. Si un cliente consume el 80% del tiempo del equipo, también consume el 80% de la luz, espacio de oficina, software, etc.

## 📊 Nuevo Cálculo de Margen NETO

Anteriormente se calculaba el **Margen Bruto**:
```
Margen Bruto = Ingresos - (Coste Personal + Gastos Directos)
```

Ahora se calcula el **Margen NETO** (margen real):
```
Margen Neto = Ingresos - (Coste Personal + Gastos Directos + Gastos Operativos)
```

Este margen refleja la rentabilidad REAL después de todos los costes.

## 🖥️ Cambios en la Interfaz

### Página de Importar (`/import`)

Se añade un selector de método de distribución con dos opciones:

- ✅ **Reparto por Volumen de Facturación**
- ✅ **Reparto por Carga de Trabajo**

El cambio se aplica a todos los meses con costes operativos configurados.

### Dashboard (`/dashboard`)

**Cambios en KPIs:**
- El KPI "Margen Real" ahora muestra "Margen Neto"
- Se actualiza el porcentaje de rentabilidad según el margen neto

**Cambios en la Tabla de Rentabilidad:**

Columnas anteriores:
```
Cliente | Ingresos | Coste Personal | Gastos Directos | Margen Bruto | % Margen Bruto
```

Columnas nuevas:
```
Cliente | Ingresos | Coste Personal | Gastos Directos | Gastos Operativos | Margen Neto | % Margen Neto
```

## 🚀 Instalación

### 1. Ejecutar la Migración

```bash
# Opción A: Usar el script
node scripts/run-migrations.js

# Opción B: Ejecutar manualmente en Supabase SQL Editor
# Copiar y ejecutar: supabase/migrations/005_operational_costs_distribution.sql
```

### 2. Reiniciar la Aplicación

```bash
npm run dev
```

### 3. Configurar el Método de Distribución

1. Ve a `/import`
2. Selecciona el método de distribución deseado
3. Haz clic en "Guardar Método de Reparto"

## 📝 Uso

### Configurar Costes Operativos

1. Ve a `/clients`
2. Introduce los costes operativos del mes
3. El sistema los distribuirá automáticamente según el método configurado

### Cambiar el Método de Distribución

1. Ve a `/import`
2. Selecciona el nuevo método
3. Guarda los cambios
4. El dashboard se actualizará automáticamente

## 🔄 Rollback

Si necesitas deshacer los cambios:

```sql
-- Ejecutar en Supabase SQL Editor:
-- Archivo: supabase/migrations/005_operational_costs_distribution_rollback.sql
```

**⚠️ ADVERTENCIA:** Esto eliminará el campo `distribution_method`. Los costes operativos NO se eliminarán.

## 🧪 Ejemplo Completo

### Datos de Entrada (Enero 2026)

**Costes Operativos:** 5.000€
**Método:** Por Carga de Trabajo (`workload`)

**Clientes:**
| Cliente | Facturación | Horas | Coste Personal | Gastos Directos |
|---------|-------------|-------|----------------|-----------------|
| ACME    | 10.000€     | 100h  | 3.000€         | 1.000€          |
| Beta Co | 6.000€      | 80h   | 2.400€         | 500€            |
| Gamma   | 4.000€      | 20h   | 600€           | 200€            |
| **TOTAL** | **20.000€** | **200h** | **6.000€** | **1.700€** |

### Cálculo de Distribución

**Total Horas:** 200h

**Distribución de Costes Operativos:**
- ACME: (100h / 200h) × 5.000€ = 2.500€
- Beta Co: (80h / 200h) × 5.000€ = 2.000€
- Gamma: (20h / 200h) × 5.000€ = 500€

### Margen Neto por Cliente

**ACME:**
```
Ingresos: 10.000€
- Coste Personal: 3.000€
- Gastos Directos: 1.000€
- Gastos Operativos: 2.500€
─────────────────────────
Margen Neto: 3.500€ (35%)
```

**Beta Co:**
```
Ingresos: 6.000€
- Coste Personal: 2.400€
- Gastos Directos: 500€
- Gastos Operativos: 2.000€
─────────────────────────
Margen Neto: 1.100€ (18.3%)
```

**Gamma:**
```
Ingresos: 4.000€
- Coste Personal: 600€
- Gastos Directos: 200€
- Gastos Operativos: 500€
─────────────────────────
Margen Neto: 2.700€ (67.5%)
```

### Totales

```
Facturación Total: 20.000€
- Costes Personal: 6.000€
- Gastos Directos: 1.700€
- Gastos Operativos: 5.000€
───────────────────────────
Margen Neto Total: 7.300€ (36.5%)
```

## 💡 Recomendaciones

### ¿Qué método usar?

**Por Volumen de Facturación** (`revenue`):
- ✅ Cuando tienes clientes con tarifas muy diferentes
- ✅ Cuando la facturación refleja mejor el valor aportado
- ✅ Modelo de negocio orientado a valor

**Por Carga de Trabajo** (`workload`):
- ✅ Cuando todos los clientes pagan tarifas similares
- ✅ Cuando quieres reflejar el coste real de recursos consumidos
- ✅ Modelo de negocio orientado a horas

### Buenas Prácticas

1. **Consistencia:** Mantén el mismo método durante varios meses para comparar resultados
2. **Revisión:** Revisa ambos métodos periódicamente para validar tu elección
3. **Documentación:** Documenta qué método usas y por qué
4. **Comunicación:** Si facturas costes operativos a clientes, comunica claramente el criterio usado

## 📞 Soporte

Para cualquier duda o problema:
1. Revisa los logs en la consola del navegador
2. Verifica que la migración se ejecutó correctamente
3. Comprueba que tienes costes operativos configurados

---

**✅ Migración 005 completada**

Fecha de implementación: 12 de Febrero 2026
