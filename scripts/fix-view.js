/**
 * Fix Uncategorized Tasks View
 * Corrige el problema donde time_entry_id faltaba en la vista
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
    console.log('🔧 ARREGLANDO VISTA uncategorized_tasks_summary\n')
    console.log('Problema: Faltaba el campo time_entry_id en la vista')
    console.log('Solución: Recrear la vista con el campo correcto\n')
    
    const sql = `
DROP VIEW IF EXISTS uncategorized_tasks_summary;

CREATE OR REPLACE VIEW uncategorized_tasks_summary AS
SELECT 
    ut.id,
    ut.time_entry_id,
    ut.task_name,
    ut.status,
    ut.created_at,
    te.date,
    te.employee_name,
    te.duration_hours,
    c.name as client_name,
    sc.name as suggested_category_name,
    sc.color as suggested_category_color,
    sc.emoji as suggested_category_emoji
FROM uncategorized_tasks ut
JOIN time_entries te ON ut.time_entry_id = te.id
LEFT JOIN clients c ON te.client_id = c.id
LEFT JOIN categories sc ON ut.suggested_category_id = sc.id;
    `.trim()
    
    console.log('📋 SQL a ejecutar:')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    console.log()
    
    console.log('⚠️  NOTA: Este script NO puede ejecutar SQL directamente.')
    console.log('   Por favor, ejecuta este SQL manualmente en Supabase:\n')
    console.log('   1. Ve a Supabase Dashboard → SQL Editor')
    console.log('   2. Copia y pega el SQL de arriba')
    console.log('   3. Click "Run"\n')
    
    console.log('💡 O copia el archivo completo al portapapeles (macOS):')
    console.log('   pbcopy < supabase/fix-uncategorized-view.sql\n')
    
    // Try to verify current state
    console.log('🔍 Verificando estado actual de la vista...\n')
    
    try {
        const { data, error } = await supabase
            .from('uncategorized_tasks_summary')
            .select('*')
            .limit(1)
        
        if (error) {
            console.log('❌ No se pudo acceder a la vista:', error.message)
            console.log('   Esto es normal si aún no has ejecutado el SQL de arriba.\n')
            return
        }
        
        if (data && data.length > 0) {
            const columns = Object.keys(data[0])
            console.log('✅ Vista actual tiene estos campos:')
            console.log('   ' + columns.join(', '))
            console.log()
            
            if (columns.includes('time_entry_id')) {
                console.log('🎉 ¡El campo time_entry_id YA EXISTE!')
                console.log('   La vista está correcta. No necesitas hacer nada.\n')
            } else {
                console.log('❌ El campo time_entry_id NO EXISTE')
                console.log('   Por favor ejecuta el SQL de arriba en Supabase.\n')
            }
        } else {
            console.log('ℹ️  No hay datos en la vista (esto es normal si no has importado tareas)\n')
        }
    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

main().catch(error => {
    console.error('\n💥 Error:', error.message)
    process.exit(1)
})
