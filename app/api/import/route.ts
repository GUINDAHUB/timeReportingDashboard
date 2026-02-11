import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import { categorizeTask, getDefaultCategoryId } from '@/lib/services/categorizer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface CSVRow {
    Username: string
    'Task Name': string
    'Time Tracked': string
    'Start Text': string
    'Folder Name': string
    'List Name': string
}

interface ParsedEntry {
    taskName: string
    durationHours: number
    date: string
    employeeName: string
    clientName: string
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Read file content
        const text = await file.text()

        // Parse CSV
        const parseResult = Papa.parse<CSVRow>(text, {
            header: true,
            skipEmptyLines: true,
        })

        if (parseResult.errors.length > 0) {
            return NextResponse.json({
                error: 'Error parsing CSV',
                details: parseResult.errors
            }, { status: 400 })
        }

        const rows = parseResult.data

        // Convert to parsed entries
        const entries = convertCSVToTimeEntries(rows)

        if (entries.length === 0) {
            return NextResponse.json({ error: 'No valid entries found in CSV' }, { status: 400 })
        }

        // Detect date range
        const dateRange = detectDateRange(entries)

        // Get clients for fuzzy matching
        const { data: clients } = await supabase
            .from('clients')
            .select('id, name')
            .eq('is_active', true)

        if (!clients || clients.length === 0) {
            return NextResponse.json({
                error: 'No active clients found. Please create clients first.'
            }, { status: 400 })
        }

        // Map client names
        const clientMap = new Map(clients.map(c => [c.name.toLowerCase(), c.id]))

        // Create import batch
        const batchId = uuidv4()

        // Process entries
        const processedEntries = []
        const unmappedClients = new Set<string>()

        // Get default "Sin Clasificar" category
        const defaultCategoryId = await getDefaultCategoryId()

        for (const entry of entries) {
            // Find client
            const clientId = clientMap.get(entry.clientName.toLowerCase())

            if (!clientId) {
                unmappedClients.add(entry.clientName)
                continue
            }

            // Auto-categorize (strict mode: returns null if no keyword match)
            const categorization = await categorizeTask(entry.taskName)

            processedEntries.push({
                task_name: entry.taskName,
                duration_hours: entry.durationHours,
                date: entry.date,
                employee_name: entry.employeeName,
                client_id: clientId,
                category_id: categorization.category_id || defaultCategoryId,
                import_batch_id: batchId,
            })
        }

        if (processedEntries.length === 0) {
            return NextResponse.json({
                error: 'No entries could be mapped to clients',
                unmappedClients: Array.from(unmappedClients)
            }, { status: 400 })
        }

        // Check if data for this month already exists
        const month = new Date(entries[0].date).getMonth() + 1
        const year = new Date(entries[0].date).getFullYear()

        const { data: existingEntries } = await supabase
            .from('time_entries')
            .select('id')
            .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
            .lt('date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`)
            .limit(1)

        let replacedCount = 0

        if (existingEntries && existingEntries.length > 0) {
            // Delete existing entries for this month
            const { error: deleteError, count } = await supabase
                .from('time_entries')
                .delete({ count: 'exact' })
                .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
                .lt('date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`)

            if (deleteError) {
                return NextResponse.json({
                    error: 'Error deleting existing entries',
                    details: deleteError
                }, { status: 500 })
            }

            replacedCount = count || 0
        }

        // Insert new entries
        const { error: insertError, data } = await supabase
            .from('time_entries')
            .insert(processedEntries)
            .select()

        if (insertError) {
            return NextResponse.json({
                error: 'Error inserting entries',
                details: insertError
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            batchId,
            stats: {
                totalRows: rows.length,
                validEntries: entries.length,
                processedEntries: processedEntries.length,
                insertedEntries: data?.length || 0,
                replacedEntries: replacedCount,
                unmappedClients: Array.from(unmappedClients),
                dateRange,
                month,
                year,
            }
        })

    } catch (error) {
        console.error('CSV import error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

function convertCSVToTimeEntries(rows: CSVRow[]): ParsedEntry[] {
    return rows
        .map(row => {
            try {
                // Parse duration from milliseconds column
                const timeTracked = row['Time Tracked'] || ''
                if (!timeTracked) return null

                const milliseconds = parseInt(timeTracked)
                if (isNaN(milliseconds) || milliseconds === 0) return null

                const hours = milliseconds / (1000 * 60 * 60)

                // Parse date (format: "02/02/2026, 9:30 AM CET" or "02/02/2026, 12:00:00 PM CET")
                // Format is MM/DD/YYYY (US format from ClickUp)
                const dateStr = row['Start Text'] || ''
                if (!dateStr) return null

                const datePart = dateStr.split(',')[0]
                const [month, day, year] = datePart.split('/') // Swapped day/month

                if (!day || !month || !year) return null

                const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

                // Extract client name from Folder Name (preferred) or List Name
                const clientName = row['Folder Name'] || row['List Name'] || ''
                if (!clientName) return null

                return {
                    taskName: row['Task Name'] || 'Unnamed Task',
                    durationHours: hours,
                    date: isoDate,
                    employeeName: row.Username || 'Unknown',
                    clientName: clientName.trim(),
                }
            } catch (error) {
                console.error('Error parsing row:', error, row)
                return null
            }
        })
        .filter((entry): entry is ParsedEntry => entry !== null)
}

function detectDateRange(entries: ParsedEntry[]): { start: string; end: string } {
    const dates = entries.map(e => e.date).sort()
    return {
        start: dates[0],
        end: dates[dates.length - 1],
    }
}
