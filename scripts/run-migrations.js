/**
 * Migration Helper Script
 * Muestra las instrucciones para ejecutar las migraciones en Supabase
 */

const fs = require('fs')
const path = require('path')

console.log('=' .repeat(80))
console.log('🔄 SISTEMA DE CATEGORÍAS JERÁRQUICAS - GUÍA DE MIGRACIÓN')
console.log('='.repeat(80))
console.log()

console.log('⚠️  IMPORTANTE: BACKUP PRIMERO')
console.log('   Antes de continuar, haz un backup de tu base de datos en Supabase.')
console.log()

console.log('📋 INSTRUCCIONES:')
console.log()
console.log('1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard')
console.log('2. Abre el "SQL Editor" en el menú lateral')
console.log('3. Crea una nueva query')
console.log('4. Copia y pega CADA migración en orden')
console.log('5. Ejecuta cada una y verifica que no hay errores')
console.log()

const migrations = [
    {
        path: path.join(__dirname, '..', 'supabase', 'migrations', '001_hierarchical_categories.sql'),
        name: 'Migración 1: Estructura Jerárquica',
        description: 'Añade soporte para categorías padre-hijo, prioridades en keywords, y tablas de tracking'
    },
    {
        path: path.join(__dirname, '..', 'supabase', 'migrations', '002_migrate_to_hierarchical.sql'),
        name: 'Migración 2: Migración de Datos',
        description: 'Crea las subcategorías, migra keywords existentes, y reorganiza la estructura'
    }
]

migrations.forEach((migration, index) => {
    console.log('='.repeat(80))
    console.log(`📝 ${migration.name}`)
    console.log('='.repeat(80))
    console.log()
    console.log(`Descripción: ${migration.description}`)
    console.log(`Archivo:     ${migration.path}`)
    console.log()
    
    if (fs.existsSync(migration.path)) {
        const sql = fs.readFileSync(migration.path, 'utf-8')
        const lineCount = sql.split('\n').length
        const sizeKB = (sql.length / 1024).toFixed(2)
        
        console.log(`📊 Estadísticas:`)
        console.log(`   • Líneas: ${lineCount}`)
        console.log(`   • Tamaño: ${sizeKB} KB`)
        console.log()
        console.log(`✅ Archivo encontrado y listo para ejecutar`)
        console.log()
        console.log(`💡 Para copiar al portapapeles (macOS):`)
        console.log(`   pbcopy < "${migration.path}"`)
        console.log()
        console.log(`💡 Para copiar al portapapeles (Linux):`)
        console.log(`   xclip -selection clipboard < "${migration.path}"`)
        console.log()
    } else {
        console.log(`❌ ERROR: Archivo no encontrado`)
        console.log()
    }
})

console.log('='.repeat(80))
console.log('📖 VERIFICACIÓN POST-MIGRACIÓN')
console.log('='.repeat(80))
console.log()
console.log('Después de ejecutar las migraciones, verifica en Supabase SQL Editor:')
console.log()
console.log(`SELECT 
    COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as categorias_padre,
    COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as subcategorias,
    COUNT(*) as total
FROM categories;`)
console.log()
console.log('Deberías ver:')
console.log('  • 6 categorías padre (incluyendo "Sin Clasificar")')
console.log('  • 16 subcategorías')
console.log('  • 22 total')
console.log()

console.log('='.repeat(80))
console.log('🎯 PRÓXIMOS PASOS')
console.log('='.repeat(80))
console.log()
console.log('Una vez completadas las migraciones:')
console.log()
console.log('1. Reinicia la aplicación Next.js')
console.log('2. Navega a /settings/categories')
console.log('3. Navega a /categorization/uncategorized')
console.log('4. Importa un CSV nuevo para probar')
console.log()
console.log('📖 Consulta MIGRATION_GUIDE.md para documentación completa')
console.log()
console.log('='.repeat(80))
