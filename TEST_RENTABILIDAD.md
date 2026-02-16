# 🧪 Tests para el Sistema de Rentabilidad

## Verificación Post-Implementación

Sigue estos pasos para verificar que todo está funcionando correctamente.

## ✅ 1. Verificar Base de Datos

### Conectarse a Supabase SQL Editor

```sql
-- 1. Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('client_direct_costs', 'monthly_operational_costs');
-- Debe retornar 2 filas

-- 2. Verificar estructura de client_direct_costs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_direct_costs'
ORDER BY ordinal_position;

-- 3. Verificar estructura de monthly_operational_costs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_operational_costs'
ORDER BY ordinal_position;

-- 4. Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('client_direct_costs', 'monthly_operational_costs');

-- 5. Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('client_direct_costs', 'monthly_operational_costs');

-- 6. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('client_direct_costs', 'monthly_operational_costs');
```

### Resultados Esperados

Todas las queries anteriores deben retornar datos. Si alguna está vacía, la migración falló.

## ✅ 2. Test de APIs

### A) Test API Gastos Operativos

#### Test 1: Crear gastos operativos
```javascript
// En la consola del navegador (F12) o en un script
const testOperationalCosts = async () => {
  const response = await fetch('/api/operational-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: 2,
      year: 2026,
      amount: 5000,
      notes: 'Test: Gastos operativos febrero'
    })
  });
  
  const data = await response.json();
  console.log('✅ Gastos operativos creados:', data);
  return data;
};

testOperationalCosts();
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-generado",
    "month": 2,
    "year": 2026,
    "amount": 5000,
    "notes": "Test: Gastos operativos febrero",
    "created_at": "2026-02-11T...",
    "updated_at": "2026-02-11T..."
  }
}
```

#### Test 2: Obtener gastos operativos
```javascript
const getOperationalCosts = async () => {
  const response = await fetch('/api/operational-costs?month=2&year=2026');
  const data = await response.json();
  console.log('✅ Gastos operativos obtenidos:', data);
  return data;
};

getOperationalCosts();
```

#### Test 3: Actualizar (mismo endpoint POST)
```javascript
const updateOperationalCosts = async () => {
  const response = await fetch('/api/operational-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: 2,
      year: 2026,
      amount: 6000, // Monto actualizado
      notes: 'Test: Gastos actualizados'
    })
  });
  
  const data = await response.json();
  console.log('✅ Gastos operativos actualizados:', data);
  return data;
};

updateOperationalCosts();
```

### B) Test API Gastos Directos de Cliente

Primero necesitas un `client_id`. Obtén uno desde la base de datos:

```sql
-- En Supabase SQL Editor
SELECT id, name FROM clients LIMIT 1;
```

Copia el `id` del cliente para los tests siguientes.

#### Test 1: Crear gastos directos
```javascript
const testClientDirectCosts = async (clientId) => {
  const response = await fetch('/api/client-direct-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId, // Reemplaza con tu client_id
      month: 2,
      year: 2026,
      amount: 1500.50,
      notes: 'Test: Gastos Facebook Ads'
    })
  });
  
  const data = await response.json();
  console.log('✅ Gastos directos creados:', data);
  return data;
};

// Reemplaza 'TU_CLIENT_ID' con el ID real
testClientDirectCosts('TU_CLIENT_ID');
```

#### Test 2: Obtener gastos directos
```javascript
const getClientDirectCosts = async (clientId) => {
  const response = await fetch(
    `/api/client-direct-costs?clientId=${clientId}&month=2&year=2026`
  );
  const data = await response.json();
  console.log('✅ Gastos directos obtenidos:', data);
  return data;
};

getClientDirectCosts('TU_CLIENT_ID');
```

#### Test 3: Actualizar gastos directos
```javascript
const updateClientDirectCosts = async (clientId) => {
  const response = await fetch('/api/client-direct-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      month: 2,
      year: 2026,
      amount: 2000, // Monto actualizado
      notes: 'Test: Gastos actualizados'
    })
  });
  
  const data = await response.json();
  console.log('✅ Gastos directos actualizados:', data);
  return data;
};

updateClientDirectCosts('TU_CLIENT_ID');
```

## ✅ 3. Test de Dashboard

### Test Manual UI

1. **Iniciar la aplicación**
   ```bash
   npm run dev
   ```

2. **Navegar al Dashboard**
   - Ve a `http://localhost:3000/dashboard`
   - Espera a que cargue

3. **Test Gastos Operativos**
   - [ ] ¿Ves el banner amarillo en la parte superior?
   - [ ] Click en "Editar"
   - [ ] Introduce un valor (ej: 5000)
   - [ ] Click en "Guardar"
   - [ ] ¿El valor se guarda correctamente?
   - [ ] ¿Aparece el toast de confirmación?

4. **Test Gastos Directos**
   - [ ] Busca la columna "Gastos Directos" en la tabla
   - [ ] Click en el icono del lápiz 📝 de algún cliente
   - [ ] Introduce un valor (ej: 1500)
   - [ ] Click en el check verde ✓
   - [ ] ¿El valor se guarda correctamente?
   - [ ] ¿Aparece el toast de confirmación?

5. **Test Cálculos**
   - [ ] ¿La columna "Costes Directos" suma Coste Personal + Gastos Directos?
   - [ ] ¿La columna "Margen Bruto" resta correctamente?
   - [ ] ¿El % Margen Bruto es correcto?
   - [ ] ¿Los colores cambian según el porcentaje?

6. **Test Expansión de Detalles**
   - [ ] Click en la flecha > de un cliente
   - [ ] ¿Se muestra el desglose por empleado?
   - [ ] ¿Los cálculos son correctos?

## ✅ 4. Test de Integración Completa

### Escenario de Prueba Completo

```javascript
// Script completo para probar todo el flujo
const runFullTest = async () => {
  console.log('🧪 Iniciando tests completos...\n');
  
  // 1. Obtener un cliente
  const clientsResponse = await fetch('/api/clients'); // Asume que existe este endpoint
  const clients = await clientsResponse.json();
  const testClient = clients[0]; // Primer cliente
  console.log('1️⃣ Cliente de prueba:', testClient.name);
  
  // 2. Configurar gastos operativos
  console.log('\n2️⃣ Configurando gastos operativos...');
  const opCosts = await fetch('/api/operational-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: 2,
      year: 2026,
      amount: 5000,
      notes: 'Test completo'
    })
  }).then(r => r.json());
  console.log('✅ Gastos operativos:', opCosts);
  
  // 3. Configurar gastos directos del cliente
  console.log('\n3️⃣ Configurando gastos directos del cliente...');
  const directCosts = await fetch('/api/client-direct-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: testClient.id,
      month: 2,
      year: 2026,
      amount: 1500,
      notes: 'Test completo'
    })
  }).then(r => r.json());
  console.log('✅ Gastos directos:', directCosts);
  
  // 4. Verificar cálculos
  console.log('\n4️⃣ Verificando cálculos en el dashboard...');
  console.log('Ve al dashboard y verifica que:');
  console.log('- Gastos operativos: 5.000€');
  console.log(`- Gastos directos de ${testClient.name}: 1.500€`);
  console.log('- El Margen Bruto se calcula correctamente');
  
  console.log('\n✅ Tests completados!');
};

runFullTest();
```

## ✅ 5. Test de Cálculos Matemáticos

### Verificar manualmente con SQL

```sql
-- Obtener datos de un cliente específico para un mes
WITH client_data AS (
  SELECT 
    c.id as client_id,
    c.name as client_name,
    cmg.fee as revenue,
    COALESCE(SUM(te.duration_hours), 0) as total_hours
  FROM clients c
  LEFT JOIN client_monthly_goals cmg ON c.id = cmg.client_id 
    AND cmg.month = 2 AND cmg.year = 2026
  LEFT JOIN time_entries te ON c.id = te.client_id
    AND DATE_PART('month', te.date) = 2
    AND DATE_PART('year', te.date) = 2026
  WHERE c.name = 'NOMBRE_DEL_CLIENTE' -- Reemplaza con un nombre real
  GROUP BY c.id, c.name, cmg.fee
),
employee_costs AS (
  SELECT 
    te.client_id,
    te.employee_name,
    SUM(te.duration_hours) as hours,
    e.hourly_cost,
    SUM(te.duration_hours) * e.hourly_cost as total_cost
  FROM time_entries te
  JOIN employees e ON te.employee_name = e.name
  WHERE DATE_PART('month', te.date) = 2
    AND DATE_PART('year', te.date) = 2026
  GROUP BY te.client_id, te.employee_name, e.hourly_cost
),
direct_costs AS (
  SELECT 
    client_id,
    COALESCE(amount, 0) as direct_cost_amount
  FROM client_direct_costs
  WHERE month = 2 AND year = 2026
)
SELECT 
  cd.client_name,
  cd.revenue,
  COALESCE(SUM(ec.total_cost), 0) as personnel_cost,
  COALESCE(dc.direct_cost_amount, 0) as direct_costs,
  COALESCE(SUM(ec.total_cost), 0) + COALESCE(dc.direct_cost_amount, 0) as total_direct_costs,
  cd.revenue - (COALESCE(SUM(ec.total_cost), 0) + COALESCE(dc.direct_cost_amount, 0)) as gross_margin,
  CASE 
    WHEN cd.revenue > 0 THEN 
      ((cd.revenue - (COALESCE(SUM(ec.total_cost), 0) + COALESCE(dc.direct_cost_amount, 0))) / cd.revenue) * 100
    ELSE 0 
  END as gross_margin_percent
FROM client_data cd
LEFT JOIN employee_costs ec ON cd.client_id = ec.client_id
LEFT JOIN direct_costs dc ON cd.client_id = dc.client_id
GROUP BY cd.client_name, cd.revenue, dc.direct_cost_amount;
```

**Compara estos resultados con lo que muestra el dashboard.**

## ✅ 6. Test de Validaciones

### Test de validaciones del API

```javascript
// Test 1: Intentar crear con mes inválido
const testInvalidMonth = async () => {
  const response = await fetch('/api/operational-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: 13, // ❌ Inválido
      year: 2026,
      amount: 5000
    })
  });
  
  console.log('Status:', response.status); // Debe ser 400
  const data = await response.json();
  console.log('Error esperado:', data); // Debe tener mensaje de error
};

// Test 2: Intentar crear con monto negativo
const testNegativeAmount = async () => {
  const response = await fetch('/api/operational-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: 2,
      year: 2026,
      amount: -1000 // ❌ Inválido
    })
  });
  
  console.log('Status:', response.status); // Debe ser 400
  const data = await response.json();
  console.log('Error esperado:', data);
};

// Test 3: Intentar crear sin campos requeridos
const testMissingFields = async () => {
  const response = await fetch('/api/operational-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 5000 // ❌ Faltan month y year
    })
  });
  
  console.log('Status:', response.status); // Debe ser 400
  const data = await response.json();
  console.log('Error esperado:', data);
};

testInvalidMonth();
testNegativeAmount();
testMissingFields();
```

## ✅ 7. Checklist Final

### Migración
- [ ] La migración SQL se ejecutó sin errores
- [ ] Las 2 tablas nuevas existen en la base de datos
- [ ] Los índices fueron creados correctamente
- [ ] Los triggers funcionan (updated_at se actualiza)
- [ ] Las políticas RLS están activas

### APIs
- [ ] GET `/api/operational-costs` funciona
- [ ] POST `/api/operational-costs` funciona
- [ ] GET `/api/client-direct-costs` funciona
- [ ] POST `/api/client-direct-costs` funciona
- [ ] Las validaciones funcionan correctamente
- [ ] Los errores retornan código 400/500 apropiado

### Dashboard
- [ ] El banner de gastos operativos se muestra
- [ ] Se pueden editar los gastos operativos
- [ ] La tabla muestra las nuevas columnas
- [ ] Se pueden editar los gastos directos
- [ ] Los cálculos son correctos
- [ ] Los colores cambian según el margen
- [ ] Los toasts de confirmación aparecen

### Cálculos
- [ ] Coste Personal se calcula correctamente
- [ ] Gastos Directos se almacenan correctamente
- [ ] Costes Directos Totales = Personal + Directos
- [ ] Margen Bruto = Ingresos - Costes Directos
- [ ] % Margen Bruto es correcto

## 🐛 Si algo falla...

### Error en migración
```bash
# Ejecutar rollback
# En Supabase SQL Editor, corre:
# supabase/migrations/004_profitability_costs_rollback.sql

# Luego volver a ejecutar:
# supabase/migrations/004_profitability_costs.sql
```

### Error en API
1. Revisa la consola del navegador (F12)
2. Revisa Network tab para ver el error exacto
3. Verifica que Supabase esté funcionando
4. Verifica las variables de entorno

### Error en cálculos
1. Verifica con SQL que los datos son correctos
2. Compara con la query de verificación arriba
3. Revisa `employee-cost-calculator.ts` por errores de lógica

## 📝 Reportar Problemas

Si encuentras algún bug:

1. Anota el error exacto
2. Captura la consola del navegador
3. Indica qué test falló
4. Proporciona datos de ejemplo que reproduzcan el error

---

**✅ Si todos los tests pasan, el sistema está funcionando correctamente!**
