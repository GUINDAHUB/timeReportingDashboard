# Migración: Sistema de Empleados

## Resumen

Se ha implementado un nuevo sistema para gestionar costes de empleados. Ahora cada empleado tiene un coste real basado en su salario mensual y horas trabajadas, que se puede personalizar mes a mes.

## Cambios Principales

### 1. Nuevas Tablas en la Base de Datos

- **employees**: Almacena información de empleados con salario y horas por defecto
- **employee_monthly_costs**: Permite configurar costes específicos para cada mes

### 2. Nueva Interfaz de Gestión

- Nueva página `/employees` para configurar empleados
- Añadida entrada "Empleados 👥" en el menú de navegación

### 3. Modelo de Costes Actualizado

**Antes:**
- Coste fijo de 30€/hora para todos los proyectos

**Ahora:**
- **Precio de facturación**: 40€/hora para todos los clientes (configurable en `client_monthly_goals`)
- **Coste real**: Cada empleado tiene su propio coste/hora basado en:
  - Salario mensual ÷ Horas mensuales = Coste por hora
- **Configuración mensual**: Puedes ajustar el salario/horas de cada empleado mes a mes

## Pasos para Aplicar la Migración

### Opción 1: Ejecutar la Migración Completa (Recomendado)

1. Ve al **SQL Editor** en tu proyecto de Supabase
2. Copia y pega el contenido de `supabase/migrations/003_employees.sql`
3. Haz clic en **Run** para ejecutar la migración

### Opción 2: Actualizar el Schema Completo

Si prefieres recrear toda la base de datos:

1. Ve al **SQL Editor** en Supabase
2. Ejecuta el contenido actualizado de `supabase/schema.sql`
   - Esto incluye las nuevas tablas de empleados
   - Solo recomendado si estás empezando o tienes backup de tus datos

## Verificación

Después de aplicar la migración, verifica que las tablas se crearon correctamente:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'employee_monthly_costs');

-- Debería devolver 2 filas:
-- employees
-- employee_monthly_costs
```

## Uso del Sistema de Empleados

### 1. Añadir Empleados

1. Ve a la página **Empleados** en el menú de navegación
2. Haz clic en **➕ Nuevo Empleado**
3. Introduce:
   - **Nombre**: Nombre del empleado
   - **Salario Mensual**: Ej: 2500€
   - **Horas Mensuales**: Ej: 160h (40h/semana × 4 semanas)
4. El sistema calculará automáticamente el coste/hora

### 2. Configurar Costes Mensuales

En la tabla de empleados:
- Cada mes tiene 3 columnas: **Salario**, **Horas**, **€/h**
- Haz clic en cualquier celda de Salario u Horas para personalizar ese mes
- El coste/hora se calcula automáticamente
- Las celdas **azules** indican valores personalizados para ese mes
- Las celdas **grises** usan los valores por defecto del empleado

### 3. Valores por Defecto vs Personalizados

- **Valores por defecto**: Se configuran al crear el empleado (aplican a todos los meses)
- **Valores personalizados**: Se configuran mes a mes y sobrescriben los valores por defecto solo para ese mes

## Próximos Pasos

Los dashboards de **Dashboard** y **Tendencias** aún usan el coste fijo de 30€/hora. En la siguiente fase integraremos el sistema de empleados para calcular:

1. **Coste Real por Cliente**: Suma de (horas de cada empleado × su coste/hora) para cada cliente
2. **Ingresos Facturados**: Horas del cliente × 40€/hora (precio de facturación)
3. **Margen Real**: Ingresos - Costes reales

## Compatibilidad

✅ El sistema actual sigue funcionando sin cambios
✅ Los cálculos existentes no se ven afectados
✅ Puedes empezar a configurar empleados y luego migrar los dashboards

## Soporte

Si encuentras algún problema:
1. Verifica que las tablas se crearon correctamente
2. Revisa la consola del navegador para errores
3. Verifica que las policies de RLS estén configuradas correctamente
