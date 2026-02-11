/**
 * CSV Parser Service
 * 
 * Parses ClickUp time tracking CSV exports
 * Handles the exact format from example.csv
 */

import Papa from 'papaparse'
import { CSVRow, ParsedTimeEntry, ClientMapping } from '@/lib/types'
import { millisecondsToHours } from '@/lib/utils'

/**
 * Parse ClickUp CSV file
 */
export function parseClickUpCSV(file: File): Promise<CSVRow[]> {
    return new Promise((resolve, reject) => {
        Papa.parse<CSVRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`))
                } else {
                    resolve(results.data)
                }
            },
            error: (error) => {
                reject(error)
            },
        })
    })
}

/**
 * Extract client name from CSV row
 * Tries Folder Name first, then List Name
 */
function extractClientName(row: CSVRow): string {
    // Prefer Folder Name as it's typically the client name
    const folderName = row['Folder Name']?.trim()
    if (folderName && folderName !== '') {
        return folderName
    }

    // Fallback to List Name
    const listName = row['List Name']?.trim()
    if (listName && listName !== '') {
        return listName
    }

    return 'Unknown'
}

/**
 * Parse date from ClickUp "Start Text" format
 * Example: "02/02/2026, 12:00:00 PM CET"
 */
function parseClickUpDate(dateText: string): string {
    try {
        // Extract just the date part: "02/02/2026"
        const datePart = dateText.split(',')[0]
        const [day, month, year] = datePart.split('/')

        // Return in ISO format: YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    } catch (error) {
        console.error('Error parsing date:', dateText, error)
        return new Date().toISOString().split('T')[0]
    }
}

/**
 * Convert CSV rows to parsed time entries
 */
export function convertCSVToTimeEntries(rows: CSVRow[]): ParsedTimeEntry[] {
    return rows.map(row => {
        const durationMs = parseInt(row['Time Tracked'] || '0', 10)
        const durationHours = millisecondsToHours(durationMs)

        return {
            task_name: row['Task Name'] || 'Untitled Task',
            task_id: row['Task ID'] || row['Time Entry ID'] || '',
            duration_hours: Math.round(durationHours * 100) / 100, // Round to 2 decimals
            date: parseClickUpDate(row['Start Text']),
            employee_name: row['Username'] || 'Unknown',
            employee_id: row['User ID'] || '',
            folder_name: row['Folder Name'] || '',
            list_name: row['List Name'] || '',
            client_name: extractClientName(row),
            raw_data: row,
        }
    })
}

/**
 * Detect date range in parsed entries
 */
export function detectDateRange(entries: ParsedTimeEntry[]): { start: string; end: string } {
    if (entries.length === 0) {
        const today = new Date().toISOString().split('T')[0]
        return { start: today, end: today }
    }

    const dates = entries.map(e => e.date).sort()
    return {
        start: dates[0],
        end: dates[dates.length - 1],
    }
}

/**
 * Get unique client names from parsed entries
 */
export function getUniqueClients(entries: ParsedTimeEntry[]): string[] {
    const clientSet = new Set<string>()
    entries.forEach(entry => {
        if (entry.client_name && entry.client_name !== 'Unknown') {
            clientSet.add(entry.client_name)
        }
    })
    return Array.from(clientSet).sort()
}

/**
 * Fuzzy match client name to database clients
 * Simple implementation - can be enhanced with levenshtein distance
 */
export function fuzzyMatchClient(
    csvName: string,
    dbClientNames: string[]
): { match: string | null; confidence: 'exact' | 'fuzzy' | 'unmapped' } {
    const normalized = csvName.toLowerCase().trim()

    // Try exact match first
    const exactMatch = dbClientNames.find(name => name.toLowerCase() === normalized)
    if (exactMatch) {
        return { match: exactMatch, confidence: 'exact' }
    }

    // Try partial match (contains)
    const partialMatch = dbClientNames.find(name =>
        name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase())
    )
    if (partialMatch) {
        return { match: partialMatch, confidence: 'fuzzy' }
    }

    return { match: null, confidence: 'unmapped' }
}

/**
 * Auto-map CSV clients to database clients
 */
export function autoMapClients(
    csvClients: string[],
    dbClients: Array<{ id: string; name: string }>
): ClientMapping[] {
    const dbNames = dbClients.map(c => c.name)
    const mappings: ClientMapping[] = []

    for (const csvName of csvClients) {
        const fuzzyResult = fuzzyMatchClient(csvName, dbNames)

        if (fuzzyResult.match) {
            const dbClient = dbClients.find(c => c.name === fuzzyResult.match)
            mappings.push({
                csv_name: csvName,
                client_id: dbClient?.id || null,
                confidence: fuzzyResult.confidence,
            })
        } else {
            mappings.push({
                csv_name: csvName,
                client_id: null,
                confidence: 'unmapped',
            })
        }
    }

    return mappings
}

/**
 * Validate parsed entries
 */
export function validateEntries(entries: ParsedTimeEntry[]): Array<{ index: number; error: string }> {
    const errors: Array<{ index: number; error: string }> = []

    entries.forEach((entry, index) => {
        if (!entry.task_name || entry.task_name.trim() === '') {
            errors.push({ index, error: 'Missing task name' })
        }

        if (entry.duration_hours <= 0) {
            errors.push({ index, error: 'Invalid duration (must be > 0)' })
        }

        if (!entry.date || entry.date === '') {
            errors.push({ index, error: 'Missing or invalid date' })
        }

        if (!entry.employee_name || entry.employee_name.trim() === '') {
            errors.push({ index, error: 'Missing employee name' })
        }
    })

    return errors
}
