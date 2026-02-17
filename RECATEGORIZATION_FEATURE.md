# 🔄 Funcionalidad de Recategorización Automática

## 📋 Resumen

Se ha implementado una nueva funcionalidad que permite recategorizar automáticamente las tareas marcadas como "Sin Clasificar" cuando se actualizan las keywords y categorías.

## ✨ Características Implementadas

### 1. Botón de Recategorización
- **Ubicación**: Página de tareas sin clasificar (`/categorization/uncategorized`)
- **Funcionalidad**: Vuelve a ejecutar el categorizador sobre todas las tareas "Sin Clasificar"
- **Estado visual**: Muestra un spinner animado durante el proceso

### 2. API Endpoint de Recategorización
- **Ruta**: `POST /api/categorization/recategorize`
- **Funcionalidad**:
  1. Invalida el cache del categorizador para usar las keywords más recientes
  2. Busca todas las tareas con categoría "Sin Clasificar"
  3. Ejecuta el categorizador sobre cada tarea
  4. Actualiza las categorías si encuentra coincidencias
  5. Registra el historial de cambios
  6. Retorna estadísticas detalladas

### 3. Diálogo de Resultados
- **Métricas mostradas**:
  - **Tareas analizadas**: Total de tareas sin clasificar procesadas
  - **Tareas recategorizadas**: Número de tareas que encontraron nueva categoría
  - **Tareas sin categoría**: Tareas que siguen sin clasificar
  
- **Detalles**:
  - Nombre de la tarea
  - Categoría anterior → Categoría nueva
  - Keyword que coincidió

## 🔧 Archivos Modificados/Creados

### Nuevos Archivos
```
app/api/categorization/recategorize/route.ts  (169 líneas)
```

### Archivos Modificados
```
app/categorization/uncategorized/page.tsx
- Añadido botón "Recategorizar" en el header
- Añadida función handleRecategorize()
- Añadido estado para resultados de recategorización
- Añadido modal de resultados
```

## 🎯 Flujo de Funcionamiento

```
1. Usuario actualiza keywords/categorías en Configuración
   ↓
2. Usuario va a Tareas Sin Clasificar
   ↓
3. Usuario hace clic en "Recategorizar"
   ↓
4. Sistema invalida cache y recarga keywords actuales
   ↓
5. Sistema busca todas las tareas "Sin Clasificar"
   ↓
6. Para cada tarea:
   - Ejecuta categorizeTask()
   - Si encuentra keyword → actualiza categoría
   - Registra en historial
   - Marca como "reviewed" en uncategorized_tasks
   ↓
7. Muestra modal con resultados:
   - Estadísticas generales
   - Lista detallada de cambios
   - Keywords que coincidieron
```

## 🗄️ Interacción con Base de Datos

### Tablas Afectadas

1. **time_entries**
   - UPDATE: Actualiza `category_id` cuando encuentra coincidencia

2. **category_assignments_history**
   - INSERT: Registra cada cambio de categoría con:
     - `old_category_id`: "Sin Clasificar"
     - `new_category_id`: Nueva categoría encontrada
     - `assignment_type`: "automatic"
     - `keyword_matched`: Palabra clave que coincidió
     - `notes`: "Recategorización automática"

3. **uncategorized_tasks**
   - UPDATE: Marca como `status = 'reviewed'` las tareas recategorizadas
   - UPDATE: Establece `reviewed_by = 'system'`
   - UPDATE: Establece `reviewed_at` con timestamp actual

### Queries Principales

```sql
-- Obtener categoría "Sin Clasificar"
SELECT id, name FROM categories WHERE is_default = true;

-- Obtener tareas sin clasificar
SELECT id, task_name, category_id 
FROM time_entries 
WHERE category_id = [defaultCategoryId];

-- Actualizar categoría
UPDATE time_entries 
SET category_id = [newCategoryId] 
WHERE id = [entryId];

-- Registrar historial
INSERT INTO category_assignments_history (...);

-- Marcar como revisada
UPDATE uncategorized_tasks 
SET status = 'reviewed', reviewed_at = NOW(), reviewed_by = 'system'
WHERE time_entry_id = [entryId];
```

## 🔒 Seguridad

- El endpoint está protegido por el middleware de autenticación
- Solo usuarios autenticados pueden ejecutar la recategorización
- Se registra todo en el historial para auditoría
- Manejo de errores robusto con try-catch
- Validación de datos antes de actualizar

## 💡 Casos de Uso

### Caso 1: Nuevas Keywords Añadidas
```
Escenario: El usuario añade keyword "diseño" a categoría "Creatividad"
Acción: Hacer clic en "Recategorizar"
Resultado: Todas las tareas con "diseño" en el nombre se asignan automáticamente
```

### Caso 2: Corrección de Categorías
```
Escenario: Se reorganizan las categorías y keywords
Acción: Hacer clic en "Recategorizar"
Resultado: Las tareas se reasignan según las nuevas reglas
```

### Caso 3: Importación Masiva
```
Escenario: Se importan 500 tareas y 200 quedan sin clasificar
Acción: Añadir keywords relevantes y hacer clic en "Recategorizar"
Resultado: Se clasifican automáticamente las que ahora tienen match
```

## 📊 Ejemplo de Resultado

```json
{
  "success": true,
  "result": {
    "total_analyzed": 45,
    "recategorized": 28,
    "still_uncategorized": 17,
    "details": [
      {
        "task_name": "Diseño de banner promocional",
        "old_category": "Sin Clasificar",
        "new_category": "Creatividad y Diseño",
        "keyword_matched": "diseño"
      },
      {
        "task_name": "Edición de vídeo corporativo",
        "old_category": "Sin Clasificar",
        "new_category": "Postproducción",
        "keyword_matched": "edición"
      }
      // ... más tareas
    ]
  }
}
```

## 🎨 UI/UX

### Botón de Recategorización
- **Estado normal**: Azul con icono de actualización
- **Estado loading**: Icono girando + texto "Recategorizando..."
- **Estado disabled**: Gris cuando está cargando o procesando

### Modal de Resultados
- **Métricas**: 3 tarjetas con colores semánticos
  - Azul: Total analizadas
  - Verde: Recategorizadas exitosamente
  - Naranja: Aún sin categoría
- **Lista de detalles**: Scroll si hay muchas tareas
- **Visual claro**: Categoría antigua → categoría nueva con keyword

## 🚀 Mejoras Futuras (Opcionales)

1. **Recategorización selectiva**: Permitir seleccionar qué tareas recategorizar
2. **Preview antes de aplicar**: Mostrar qué cambios se harían antes de ejecutar
3. **Recategorización automática**: Ejecutar automáticamente cuando se añaden keywords
4. **Notificaciones**: Enviar notificación cuando termina el proceso
5. **Progreso en tiempo real**: Mostrar barra de progreso durante la recategorización
6. **Deshacer**: Permitir revertir la recategorización

## 🧪 Pruebas Recomendadas

1. ✅ Recategorizar con 0 tareas sin clasificar
2. ✅ Recategorizar con tareas que no tienen keywords
3. ✅ Recategorizar después de añadir nuevas keywords
4. ✅ Verificar que se actualiza el historial correctamente
5. ✅ Verificar que se marcan como "reviewed" en uncategorized_tasks
6. ✅ Verificar que el cache se invalida correctamente
7. ✅ Verificar el comportamiento con errores de red

## 📝 Notas Técnicas

- El cache del categorizador se invalida antes de recategorizar
- La función es **idempotente**: se puede ejecutar múltiples veces sin problemas
- Si una tarea ya está categorizada correctamente, no se modifica
- Los errores individuales no detienen el proceso completo
- Se usan transacciones implícitas de Supabase para consistencia
- El historial se registra de forma no crítica (si falla, no afecta la actualización)

## 🔗 Referencias

- Servicio de categorización: `lib/services/categorizer.ts`
- Tipos TypeScript: `lib/types.ts`
- Página de tareas: `app/categorization/uncategorized/page.tsx`
- API endpoint: `app/api/categorization/recategorize/route.ts`

---

**Implementado por**: Antigravity AI  
**Fecha**: Febrero 2026  
**Versión**: 1.0
