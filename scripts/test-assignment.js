/**
 * Test Assignment Script
 * Prueba directa de asignación de categoría
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables manually
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const env = {}
    
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            env[match[1].trim()] = match[2].trim()
        }
    })
    
    return env
}

const env = loadEnv()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function main() {
    console.log('🧪 TEST DE ASIGNACIÓN DE CATEGORÍA\n')
    
    // 1. Get a time entry
    console.log('1️⃣ Buscando una tarea...')
    const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('id, task_name, category_id')
        .limit(1)
    
    if (entriesError || !entries || entries.length === 0) {
        console.error('❌ No se encontraron tareas:', entriesError?.message)
        return
    }
    
    const entry = entries[0]
    console.log(`✅ Tarea encontrada: "${entry.task_name}" (ID: ${entry.id})`)
    console.log(`   Categoría actual: ${entry.category_id || 'ninguna'}\n`)
    
    // 2. Get a category
    console.log('2️⃣ Buscando una categoría...')
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .not('parent_id', 'is', null)
        .limit(1)
    
    if (catError || !categories || categories.length === 0) {
        console.error('❌ No se encontraron categorías:', catError?.message)
        return
    }
    
    const category = categories[0]
    console.log(`✅ Categoría encontrada: "${category.name}" (ID: ${category.id})\n`)
    
    // 3. Try to update
    console.log('3️⃣ Intentando asignar categoría...')
    const { error: updateError } = await supabase
        .from('time_entries')
        .update({ category_id: category.id })
        .eq('id', entry.id)
    
    if (updateError) {
        console.error(`❌ ERROR al actualizar:`)
        console.error(`   Mensaje: ${updateError.message}`)
        console.error(`   Código: ${updateError.code}`)
        console.error(`   Detalles: ${JSON.stringify(updateError.details)}`)
        console.error(`   Hint: ${updateError.hint}`)
        return
    }
    
    console.log(`✅ Categoría asignada correctamente!\n`)
    
    // 4. Try to record history
    console.log('4️⃣ Intentando registrar en historial...')
    const { error: historyError } = await supabase
        .from('category_assignments_history')
        .insert({
            time_entry_id: entry.id,
            old_category_id: entry.category_id,
            new_category_id: category.id,
            assignment_type: 'manual',
            assigned_by: 'test-script',
            notes: 'Test de script de diagnóstico'
        })
    
    if (historyError) {
        console.error(`❌ ERROR al registrar historial:`)
        console.error(`   Mensaje: ${historyError.message}`)
        console.error(`   Código: ${historyError.code}`)
        return
    }
    
    console.log(`✅ Historial registrado correctamente!\n`)
    
    // 5. Verify
    console.log('5️⃣ Verificando cambio...')
    const { data: updated, error: verifyError } = await supabase
        .from('time_entries')
        .select('id, task_name, category_id')
        .eq('id', entry.id)
        .single()
    
    if (verifyError) {
        console.error(`❌ Error al verificar:`, verifyError.message)
        return
    }
    
    console.log(`✅ Verificación exitosa:`)
    console.log(`   Tarea: "${updated.task_name}"`)
    console.log(`   Categoría: ${updated.category_id}`)
    console.log(`   Cambió: ${entry.category_id !== updated.category_id ? 'SÍ ✅' : 'NO ❌'}\n`)
    
    console.log('🎉 ¡TODAS LAS OPERACIONES FUNCIONAN CORRECTAMENTE!\n')
    console.log('📋 Si el error persiste en la UI, puede ser un problema de:')
    console.log('   1. Cache del navegador (prueba Cmd+Shift+R para recargar)')
    console.log('   2. El ID de la tarea no es correcto')
    console.log('   3. Abre la consola del navegador para ver el error real\n')
}

main().catch(error => {
    console.error('\n💥 Error inesperado:', error.message)
    console.error(error)
    process.exit(1)
})
