/**
 * ICS Parser Service
 * 
 * Parses Google Calendar .ics exports
 * Extracts calendar events and converts them to time entries
 */

import ICAL from 'ical.js'
import { ParsedTimeEntry } from '@/lib/types'

interface ICSEvent {
    summary: string // Event title
    start: Date
    end: Date
    duration: number // in hours
    description?: string
    location?: string
}

/**
 * Parse ICS file content
 */
export function parseICSFile(fileContent: string): ICSEvent[] {
    try {
        const jcalData = ICAL.parse(fileContent)
        const comp = new ICAL.Component(jcalData)
        const vevents = comp.getAllSubcomponents('vevent')

        const events: ICSEvent[] = []

        for (const vevent of vevents) {
            const event = new ICAL.Event(vevent)
            
            // Skip all-day events or events without start/end
            if (!event.startDate || !event.endDate) continue
            if (event.startDate.isDate) continue // All-day event

            const start = event.startDate.toJSDate()
            const end = event.endDate.toJSDate()
            const durationMs = end.getTime() - start.getTime()
            const durationHours = durationMs / (1000 * 60 * 60)

            // Skip events with 0 duration
            if (durationHours <= 0) continue

            events.push({
                summary: event.summary || 'Sin título',
                start,
                end,
                duration: Math.round(durationHours * 100) / 100, // Round to 2 decimals
                description: event.description || undefined,
                location: event.location || undefined,
            })
        }

        return events
    } catch (error) {
        console.error('Error parsing ICS:', error)
        throw new Error('Error al parsear archivo .ics: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
    events: ICSEvent[],
    startDate: Date,
    endDate: Date
): ICSEvent[] {
    return events.filter(event => {
        const eventDate = event.start
        return eventDate >= startDate && eventDate <= endDate
    })
}

/**
 * Convert ICS events to time entries
 */
export function convertICSToTimeEntries(
    events: ICSEvent[],
    employeeName: string,
    defaultClientName: string = 'Sin Clasificar'
): ParsedTimeEntry[] {
    return events.map(event => {
        // Format date as YYYY-MM-DD
        const date = event.start.toISOString().split('T')[0]

        return {
            task_name: event.summary,
            task_id: `ics-${event.start.getTime()}`, // Generate unique ID from timestamp
            duration_hours: event.duration,
            date,
            employee_name: employeeName,
            employee_id: '',
            folder_name: defaultClientName,
            list_name: defaultClientName,
            client_name: defaultClientName,
            raw_data: {
                summary: event.summary,
                start: event.start.toISOString(),
                end: event.end.toISOString(),
                description: event.description,
                location: event.location,
            },
        }
    })
}

/**
 * Get date range from events
 */
export function getEventsDateRange(events: ICSEvent[]): { start: string; end: string } {
    if (events.length === 0) {
        const today = new Date().toISOString().split('T')[0]
        return { start: today, end: today }
    }

    const dates = events.map(e => e.start.toISOString().split('T')[0]).sort()
    return {
        start: dates[0],
        end: dates[dates.length - 1],
    }
}

/**
 * Parse month/year from date string
 */
export function getMonthYearFromDate(dateStr: string): { month: number; year: number } {
    const date = new Date(dateStr)
    return {
        month: date.getMonth() + 1, // 1-12
        year: date.getFullYear(),
    }
}

/**
 * Create date range for a specific month
 */
export function getMonthDateRange(month: number, year: number): { start: Date; end: Date } {
    const start = new Date(year, month - 1, 1, 0, 0, 0) // First day of month
    const end = new Date(year, month, 0, 23, 59, 59) // Last day of month
    return { start, end }
}
