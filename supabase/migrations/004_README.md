# Migración 004: Sistema de Rentabilidad - Gastos Directos y Operativos

## 📋 Descripción

Esta migración añade soporte para calcular el **Margen Bruto** de cada cliente mediante la inclusión de:

1. **Gastos Directos del Cliente (Variable)**: Gastos específicos asignados a un cliente en un mes determinado
2. **Gastos Operativos Generales (Fijo)**: Gastos globales de la empresa por mes (para futura implementación de EBIT)

## 🎯 Métricas Implementadas

### Margen Bruto
```
Margen Bruto = Ingresos - (Coste Personal Directo + Gastos Directos)
```

Donde:
- **Ingresos**: Facturación del cliente ese mes
- **Coste Personal Directo**: Suma de (Horas × Coste/Hora) de cada empleado
- **Gastos Directos**: Gastos variables externos asignados al cliente

## 🚀 Cómo Ejecutar la Migración

### Opción 1: Usando el Script de Node.js (Recomendado)

```bash
# Desde la raíz del proyecto
node scripts/run-migrations.js
```

### Opción 2: Ejecución Manual en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Copia y pega el contenido de `004_profitability_costs.sql`
4. Ejecuta el script

### Opción 3: Usando Supabase CLI

```bash
# Si tienes Supabase CLI instalado
supabase migration up
```

## 🔄 Rollback (En caso de problemas)

Si necesitas revertir los cambios:

```bash
# En Supabase SQL Editor, ejecuta:
# supabase/migrations/004_profitability_costs_rollback.sql
```

**⚠️ ADVERTENCIA**: El rollback eliminará TODAS las tablas y datos de gastos directos y operativos.

## 📊 Nuevas Tablas Creadas

### 1. `client_direct_costs`
Almacena gastos directos por cliente y mes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK a `clients` |
| month | INTEGER | Mes (1-12) |
| year | INTEGER | Año (2000-2100) |
| amount | NUMERIC(10,2) | Cantidad en euros |
| notes | TEXT | Notas opcionales |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

**Constraint**: UNIQUE(client_id, month, year)

### 2. `monthly_operational_costs`
Almacena gastos operativos generales mensuales de la empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Primary key |
| month | INTEGER | Mes (1-12) |
| year | INTEGER | Año (2000-2100) |
| amount | NUMERIC(10,2) | Cantidad en euros |
| notes | TEXT | Notas opcionales |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

**Constraint**: UNIQUE(month, year)

## 🎨 Funcionalidades en el Dashboard

### 1. Gastos Operativos Generales
- **Ubicación**: Banner amarillo en la parte superior del dashboard
- **Funcionalidad**: Editable directamente desde el dashboard
- **Uso**: Click en "Editar" → Introducir cantidad → "Guardar"

### 2. Gastos Directos por Cliente
- **Ubicación**: Columna "Gastos Directos" en la tabla de rentabilidad
- **Funcionalidad**: Editable inline con icono de lápiz
- **Uso**: Click en el icono del lápiz → Introducir cantidad → Check verde para guardar

### 3. Visualización de Métricas
La tabla de rentabilidad ahora muestra:
- **Ingresos**: Facturación del cliente
- **Coste Personal**: Suma de horas × coste/hora de empleados
- **Gastos Directos**: Gastos externos del cliente (editable)
- **Costes Directos**: Total = Coste Personal + Gastos Directos
- **Margen Bruto**: Ingresos - Costes Directos
- **% Margen Bruto**: Porcentaje de rentabilidad

## 🔌 API Endpoints Añadidos

### Gastos Directos de Cliente

#### GET `/api/client-direct-costs`
Obtener gastos directos.

Query params:
- `clientId` (opcional): ID del cliente
- `month` (opcional): Mes (1-12)
- `year` (opcional): Año

```bash
GET /api/client-direct-costs?clientId=xxx&month=1&year=2026
```

#### POST `/api/client-direct-costs`
Crear o actualizar gastos directos.

```json
{
  "client_id": "uuid",
  "month": 1,
  "year": 2026,
  "amount": 1500.50,
  "notes": "Gastos de publicidad Facebook Ads"
}
```

#### DELETE `/api/client-direct-costs?id=xxx`
Eliminar entrada de gastos directos.

### Gastos Operativos

#### GET `/api/operational-costs`
Obtener gastos operativos.

Query params:
- `month` (opcional): Mes (1-12)
- `year` (opcional): Año

```bash
GET /api/operational-costs?month=1&year=2026
```

#### POST `/api/operational-costs`
Crear o actualizar gastos operativos.

```json
{
  "month": 1,
  "year": 2026,
  "amount": 5000.00,
  "notes": "Alquiler oficina + servicios"
}
```

#### DELETE `/api/operational-costs?id=xxx`
Eliminar entrada de gastos operativos.

## ✅ Verificación Post-Migración

Ejecuta estas queries para verificar que todo está correcto:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('client_direct_costs', 'monthly_operational_costs');

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('client_direct_costs', 'monthly_operational_costs');

-- Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('client_direct_costs', 'monthly_operational_costs');
```

## 📝 Notas Importantes

1. **Row Level Security (RLS)**: Actualmente configurado con política "Allow all" para single-tenant. Cuando implementes multi-tenancy, deberás actualizar las políticas.

2. **Gastos Operativos**: De momento solo se almacenan. En futuras versiones se usarán para calcular el **EBIT (Margen Neto)**:
   ```
   EBIT = Margen Bruto Total - Gastos Operativos
   ```

3. **Valores por Defecto**: Si no se especifican gastos directos para un cliente, se asume 0€.

4. **Edición en Tiempo Real**: Los cambios en gastos directos y operativos se reflejan inmediatamente en el dashboard tras guardar.

## 🐛 Troubleshooting

### Error: "relation already exists"
La migración ya se ejecutó. Si necesitas re-ejecutarla:
1. Ejecuta primero el rollback: `004_profitability_costs_rollback.sql`
2. Luego ejecuta la migración: `004_profitability_costs.sql`

### Error: "permission denied"
Verifica que tienes permisos de administrador en la base de datos.

### Los datos no se actualizan en el dashboard
1. Verifica que la API responde correctamente
2. Revisa la consola del navegador para errores
3. Refresca el dashboard (F5)

## 👨‍💻 Autor

Implementado por: Backend Developer & Data Analyst
Fecha: 11 de Febrero 2026
