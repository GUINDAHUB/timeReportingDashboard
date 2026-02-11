/**
 * Database Health Check Script
 * Verifica el estado de las tablas y migraciones
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables manually
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local')
    if (!fs.existsSync(envPath)) {
        console.error('❌ Error: No se encontró .env.local')
        process.exit(1)
    }
    
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const env = {}
    
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim()
            env[key] = value
        }
    })
    
    return env
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variables de entorno no encontradas en .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable(tableName, requiredColumns = []) {
    console.log(`\n🔍 Verificando tabla: ${tableName}`)
    
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
        
        if (error) {
            console.log(`   ❌ Tabla NO existe o no es accesible`)
            console.log(`   Error: ${error.message}`)
            return false
        }
        
        console.log(`   ✅ Tabla existe y es accesible`)
        
        // Check columns if data exists
        if (data && data.length > 0) {
            const columns = Object.keys(data[0])
            console.log(`   📋 Columnas encontradas: ${columns.join(', ')}`)
            
            // Check required columns
            if (requiredColumns.length > 0) {
                const missing = requiredColumns.filter(col => !columns.includes(col))
                if (missing.length > 0) {
                    console.log(`   ⚠️  Columnas faltantes: ${missing.join(', ')}`)
                    return false
                }
            }
        }
        
        return true
    } catch (error) {
        console.log(`   ❌ Error inesperado: ${error.message}`)
        return false
    }
}

async function checkCategoriesHierarchy() {
    console.log(`\n🏗️  Verificando estructura jerárquica de categorías`)
    
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name, parent_id')
        
        if (error) {
            console.log(`   ❌ Error: ${error.message}`)
            return false
        }
        
        const parents = data.filter(c => !c.parent_id)
        const children = data.filter(c => c.parent_id)
        
        console.log(`   📊 Total categorías: ${data.length}`)
        console.log(`   📁 Categorías padre: ${parents.length}`)
        console.log(`   📄 Subcategorías: ${children.length}`)
        
        if (parents.length === 6 && children.length === 16) {
            console.log(`   ✅ Estructura correcta (6 padres + 16 hijos = 22 total)`)
            return true
        } else {
            console.log(`   ⚠️  Estructura diferente a la esperada`)
            console.log(`   ℹ️  Se esperaban: 6 padres + 16 hijos`)
            return false
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
        return false
    }
}

async function checkKeywordsPriority() {
    console.log(`\n🏷️  Verificando keywords con prioridades`)
    
    try {
        const { data, error } = await supabase
            .from('keywords')
            .select('id, word, priority')
            .limit(5)
        
        if (error) {
            console.log(`   ❌ Error: ${error.message}`)
            return false
        }
        
        const hasPriority = data.every(k => k.priority !== undefined)
        
        if (hasPriority) {
            console.log(`   ✅ Keywords tienen columna 'priority'`)
            console.log(`   📊 Ejemplo de prioridades: ${data.map(k => `${k.word}(${k.priority})`).join(', ')}`)
            return true
        } else {
            console.log(`   ❌ Keywords NO tienen columna 'priority'`)
            console.log(`   ℹ️  Necesitas ejecutar la migración 001`)
            return false
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
        return false
    }
}

async function main() {
    console.log('=' .repeat(80))
    console.log('🔬 DIAGNÓSTICO DE BASE DE DATOS')
    console.log('='.repeat(80))
    console.log(`📡 Conectando a: ${supabaseUrl}`)
    
    // Test connection
    const { error } = await supabase.from('categories').select('count').limit(1)
    if (error) {
        console.error('\n❌ Error de conexión a Supabase:', error.message)
        process.exit(1)
    }
    console.log('✅ Conexión establecida\n')
    
    let allChecks = []
    
    // Check core tables
    console.log('=' .repeat(80))
    console.log('📋 TABLAS BÁSICAS')
    console.log('='.repeat(80))
    
    allChecks.push(await checkTable('categories', ['id', 'name', 'parent_id']))
    allChecks.push(await checkTable('keywords', ['id', 'word', 'category_id', 'priority']))
    allChecks.push(await checkTable('time_entries', ['id', 'task_name', 'category_id']))
    
    // Check new tables
    console.log('\n' + '='.repeat(80))
    console.log('📋 TABLAS NUEVAS (de migraciones)')
    console.log('='.repeat(80))
    
    allChecks.push(await checkTable('uncategorized_tasks', ['id', 'time_entry_id', 'status']))
    allChecks.push(await checkTable('category_assignments_history', ['id', 'time_entry_id', 'assignment_type']))
    
    // Check structure
    console.log('\n' + '='.repeat(80))
    console.log('🏗️  ESTRUCTURA DE DATOS')
    console.log('='.repeat(80))
    
    allChecks.push(await checkCategoriesHierarchy())
    allChecks.push(await checkKeywordsPriority())
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 RESUMEN')
    console.log('='.repeat(80))
    
    const passed = allChecks.filter(c => c === true).length
    const failed = allChecks.filter(c => c === false).length
    
    console.log(`\n✅ Verificaciones exitosas: ${passed}`)
    console.log(`❌ Verificaciones fallidas: ${failed}`)
    console.log(`📊 Total: ${allChecks.length}`)
    
    if (failed === 0) {
        console.log('\n🎉 ¡TODO CORRECTO! Tu base de datos está lista.')
        console.log('   Puedes usar el sistema sin problemas.\n')
    } else if (failed === 2 && !allChecks[3] && !allChecks[4]) {
        console.log('\n⚠️  LAS MIGRACIONES NO SE HAN EJECUTADO')
        console.log('   Las tablas básicas existen pero faltan las nuevas.')
        console.log('\n📋 Pasos a seguir:')
        console.log('   1. Ejecuta: npm run migrate:help')
        console.log('   2. Sigue las instrucciones para ejecutar las migraciones')
        console.log('   3. Vuelve a ejecutar este script para verificar\n')
    } else {
        console.log('\n⚠️  HAY PROBLEMAS CON LA BASE DE DATOS')
        console.log('\n📋 Posibles soluciones:')
        console.log('   1. Verifica que tienes acceso a Supabase')
        console.log('   2. Ejecuta las migraciones si no lo has hecho')
        console.log('   3. Revisa los errores específicos arriba')
        console.log('   4. Consulta MIGRATION_GUIDE.md para más ayuda\n')
    }
    
    console.log('='.repeat(80))
}

main().catch(error => {
    console.error('\n💥 Error fatal:', error.message)
    process.exit(1)
})
