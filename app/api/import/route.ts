import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import { categorizeTask, getDefaultCategoryId } from '@/lib/services/categorizer'
import { 
    parseICSFile, 
    filterEventsByDateRange, 
    convertICSToTimeEntries,
    getEventsDateRange,
    getMonthDateRange 
} from '@/lib/services/ics-parser'

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
        const employeeName = formData.get('employeeName') as string | null
        const filterMonth = formData.get('filterMonth') as string | null
        const filterYear = formData.get('filterYear') as string | null
        const previewMode = formData.get('previewMode') === 'true'
        const clientMappings = formData.get('clientMappings') as string | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Detect file type
        const isCSV = file.name.toLowerCase().endsWith('.csv')
        const isICS = file.name.toLowerCase().endsWith('.ics') || file.name.toLowerCase().endsWith('.ical')

        if (!isCSV && !isICS) {
            return NextResponse.json({ 
                error: 'Formato no soportado. Solo se aceptan archivos .csv o .ics' 
            }, { status: 400 })
        }

        // Read file content
        const text = await file.text()

        let entries: ParsedEntry[] = []
        let totalRows = 0

        if (isCSV) {
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
            totalRows = rows.length

            // Convert to parsed entries
            entries = convertCSVToTimeEntries(rows)
        } else if (isICS) {
            // Parse ICS
            if (!employeeName) {
                return NextResponse.json({
                    error: 'Para archivos .ics es necesario especificar el nombre del empleado'
                }, { status: 400 })
            }

            try {
                const events = parseICSFile(text)
                totalRows = events.length

                // Filter by month/year if specified
                let filteredEvents = events
                if (filterMonth && filterYear) {
                    const month = parseInt(filterMonth)
                    const year = parseInt(filterYear)
                    const { start, end } = getMonthDateRange(month, year)
                    filteredEvents = filterEventsByDateRange(events, start, end)
                }

                // Convert to time entries with "Sin Clasificar" as default client
                const parsedEntries = convertICSToTimeEntries(
                    filteredEvents, 
                    employeeName,
                    'Sin Clasificar'
                )

                entries = parsedEntries.map(entry => ({
                    taskName: entry.task_name,
                    durationHours: entry.duration_hours,
                    date: entry.date,
                    employeeName: entry.employee_name,
                    clientName: entry.client_name,
                }))
            } catch (error) {
                return NextResponse.json({
                    error: 'Error al parsear archivo .ics',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }, { status: 400 })
            }
        }

        if (entries.length === 0) {
            return NextResponse.json({ error: 'No valid entries found' }, { status: 400 })
        }

        // Detect date range
        const dateRange = detectDateRange(entries)

        // If preview mode for ICS, return entries for classification
        if (previewMode && isICS) {
            return NextResponse.json({
                preview: true,
                entries: entries.map((entry, index) => ({
                    id: index,
                    taskName: entry.taskName,
                    durationHours: entry.durationHours,
                    date: entry.date,
                    employeeName: entry.employeeName,
                    clientName: entry.clientName,
                })),
                totalEntries: entries.length,
                dateRange,
            })
        }

        // If client mappings provided (from classification step)
        if (clientMappings && isICS) {
            const mappings = JSON.parse(clientMappings) as Record<number, string>
            
            // Filter entries to only include those with mappings (discard those without)
            entries = entries.filter((entry, index) => mappings[index] !== undefined)
            
            // Apply client mappings to remaining entries
            entries.forEach((entry, index) => {
                if (mappings[index]) {
                    entry.clientName = mappings[index]
                }
            })
        }

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

        // Ensure "Sin Clasificar" client exists
        let sinClasificarId = clients.find(c => c.name === 'Sin Clasificar')?.id
        if (!sinClasificarId) {
            // Create "Sin Clasificar" client
            const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert({ name: 'Sin Clasificar', default_fee: 0, is_active: true })
                .select()
                .single()

            if (createError || !newClient) {
                return NextResponse.json({
                    error: 'Error creating default "Sin Clasificar" client',
                    details: createError
                }, { status: 500 })
            }

            sinClasificarId = newClient.id
            clients.push(newClient)
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
            // Find client (use "Sin Clasificar" as fallback)
            let clientId = clientMap.get(entry.clientName.toLowerCase())

            if (!clientId) {
                // For ICS imports with "Sin Clasificar", use that client
                if (entry.clientName === 'Sin Clasificar') {
                    clientId = clientMap.get('sin clasificar')
                }
                
                // If still not found, track as unmapped
                if (!clientId) {
                    unmappedClients.add(entry.clientName)
                    continue
                }
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

        // Get month/year for response
        const month = new Date(entries[0].date).getMonth() + 1
        const year = new Date(entries[0].date).getFullYear()

        // Insert new entries (they will be added to existing ones)
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
                totalRows,
                validEntries: entries.length,
                processedEntries: processedEntries.length,
                insertedEntries: data?.length || 0,
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
