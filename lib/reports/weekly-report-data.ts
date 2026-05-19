export interface RawTimeEntry {
    id: string
    task_name: string
    duration_hours: number
    date: string
    employee_name: string
    client_name: string
}

export interface ClientStat {
    name: string
    hours: number
    entries: number
    pctOfTotal: number
    avgHoursPerEntry: number
    topEmployees: Array<{ name: string; hours: number; pct: number }>
    topTasks: Array<{ task: string; hours: number; count: number }>
    daysActive: number
}

export interface EmployeeStat {
    name: string
    hours: number
    entries: number
    pctOfTotal: number
    avgHoursPerEntry: number
    daysActive: number
    avgHoursPerActiveDay: number
    topClients: Array<{ name: string; hours: number; pct: number }>
    topTasks: Array<{ task: string; hours: number; count: number }>
    principalClient: { name: string; hours: number; pct: number } | null
}

export interface EmployeeClientCell {
    employee: string
    client: string
    hours: number
    entries: number
}

export interface LongEntry {
    id: string
    employee: string
    client: string
    date: string
    hours: number
    task: string
}

export interface SharedTaskGroup {
    date: string
    normalizedKey: string
    displayTask: string
    client: string
    entries: Array<{
        id: string
        employee: string
        hours: number
        task: string
    }>
    employeesCount: number
    totalHours: number
    flagType: 'meeting' | 'duplicate'
}

export interface WeeklyReportData {
    weekLabel: string
    startDate: string
    endDateExclusive: string
    totalEntries: number
    totalHours: number
    distinctEmployees: number
    distinctClients: number
    distinctDays: number
    clients: ClientStat[]
    employees: EmployeeStat[]
    employeeClientMatrix: EmployeeClientCell[]
    longEntries: LongEntry[]
    sharedTasks: SharedTaskGroup[]
    perDayHours: Array<{ date: string; hours: number; entries: number }>
}

const MEETING_KEYWORDS = [
    'reunion',
    'meeting',
    'call',
    'llamada',
    'sync',
    'daily',
    'standup',
    'kickoff',
    'workshop',
    'sesion',
    'session',
    'mentoria',
    'review',
]

function round2(n: number): number {
    return Math.round(n * 100) / 100
}

function normalizeText(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function topNBy<T>(items: T[], n: number, getScore: (item: T) => number): T[] {
    return [...items].sort((a, b) => getScore(b) - getScore(a)).slice(0, n)
}

function safePct(part: number, total: number): number {
    if (total <= 0) return 0
    return round2((part / total) * 100)
}

function detectMeetingFlag(taskName: string): boolean {
    const normalized = normalizeText(taskName)
    return MEETING_KEYWORDS.some((kw) => normalized.includes(kw))
}

export function computeWeeklyReportData(args: {
    entries: RawTimeEntry[]
    startDate: string
    endDateExclusive: string
    weekLabel: string
}): WeeklyReportData {
    const { entries, startDate, endDateExclusive, weekLabel } = args

    const totalEntries = entries.length
    const totalHours = round2(entries.reduce((sum, e) => sum + Number(e.duration_hours || 0), 0))

    // ---- Per-day hours
    const perDayMap = new Map<string, { hours: number; entries: number }>()
    for (const e of entries) {
        const slot = perDayMap.get(e.date) || { hours: 0, entries: 0 }
        slot.hours += Number(e.duration_hours || 0)
        slot.entries += 1
        perDayMap.set(e.date, slot)
    }
    const perDayHours = Array.from(perDayMap.entries())
        .map(([date, v]) => ({ date, hours: round2(v.hours), entries: v.entries }))
        .sort((a, b) => a.date.localeCompare(b.date))

    // ---- Client aggregates (with drilldowns)
    const byClient = new Map<
        string,
        {
            hours: number
            entries: number
            byEmployee: Map<string, number>
            byTask: Map<string, { hours: number; count: number }>
            days: Set<string>
        }
    >()
    for (const e of entries) {
        const hours = Number(e.duration_hours || 0)
        const slot = byClient.get(e.client_name) || {
            hours: 0,
            entries: 0,
            byEmployee: new Map<string, number>(),
            byTask: new Map<string, { hours: number; count: number }>(),
            days: new Set<string>(),
        }
        slot.hours += hours
        slot.entries += 1
        slot.byEmployee.set(e.employee_name, (slot.byEmployee.get(e.employee_name) || 0) + hours)
        const taskSlot = slot.byTask.get(e.task_name) || { hours: 0, count: 0 }
        taskSlot.hours += hours
        taskSlot.count += 1
        slot.byTask.set(e.task_name, taskSlot)
        slot.days.add(e.date)
        byClient.set(e.client_name, slot)
    }

    const clients: ClientStat[] = Array.from(byClient.entries())
        .map(([name, v]) => {
            const employees = Array.from(v.byEmployee.entries()).map(([n, h]) => ({
                name: n,
                hours: round2(h),
                pct: safePct(h, v.hours),
            }))
            const tasks = Array.from(v.byTask.entries()).map(([t, info]) => ({
                task: t,
                hours: round2(info.hours),
                count: info.count,
            }))
            return {
                name,
                hours: round2(v.hours),
                entries: v.entries,
                pctOfTotal: safePct(v.hours, totalHours),
                avgHoursPerEntry: round2(v.hours / Math.max(1, v.entries)),
                topEmployees: topNBy(employees, 5, (x) => x.hours),
                topTasks: topNBy(tasks, 5, (x) => x.hours),
                daysActive: v.days.size,
            }
        })
        .sort((a, b) => b.hours - a.hours)

    // ---- Employee aggregates (with drilldowns)
    const byEmp = new Map<
        string,
        {
            hours: number
            entries: number
            byClient: Map<string, number>
            byTask: Map<string, { hours: number; count: number }>
            days: Set<string>
        }
    >()
    for (const e of entries) {
        const hours = Number(e.duration_hours || 0)
        const slot = byEmp.get(e.employee_name) || {
            hours: 0,
            entries: 0,
            byClient: new Map<string, number>(),
            byTask: new Map<string, { hours: number; count: number }>(),
            days: new Set<string>(),
        }
        slot.hours += hours
        slot.entries += 1
        slot.byClient.set(e.client_name, (slot.byClient.get(e.client_name) || 0) + hours)
        const taskSlot = slot.byTask.get(e.task_name) || { hours: 0, count: 0 }
        taskSlot.hours += hours
        taskSlot.count += 1
        slot.byTask.set(e.task_name, taskSlot)
        slot.days.add(e.date)
        byEmp.set(e.employee_name, slot)
    }

    const employees: EmployeeStat[] = Array.from(byEmp.entries())
        .map(([name, v]) => {
            const cls = Array.from(v.byClient.entries()).map(([n, h]) => ({
                name: n,
                hours: round2(h),
                pct: safePct(h, v.hours),
            }))
            const tasks = Array.from(v.byTask.entries()).map(([t, info]) => ({
                task: t,
                hours: round2(info.hours),
                count: info.count,
            }))
            const principal = cls.length ? topNBy(cls, 1, (x) => x.hours)[0] : null
            const daysActive = v.days.size
            return {
                name,
                hours: round2(v.hours),
                entries: v.entries,
                pctOfTotal: safePct(v.hours, totalHours),
                avgHoursPerEntry: round2(v.hours / Math.max(1, v.entries)),
                daysActive,
                avgHoursPerActiveDay: round2(v.hours / Math.max(1, daysActive)),
                topClients: topNBy(cls, 5, (x) => x.hours),
                topTasks: topNBy(tasks, 5, (x) => x.hours),
                principalClient: principal,
            }
        })
        .sort((a, b) => b.hours - a.hours)

    // ---- Employee × Client matrix (only non-zero cells)
    const matrix: EmployeeClientCell[] = []
    const matrixCounter = new Map<string, number>()
    for (const e of entries) {
        const key = `${e.employee_name}|${e.client_name}`
        matrixCounter.set(key, (matrixCounter.get(key) || 0) + 1)
    }
    const matrixHours = new Map<string, number>()
    for (const e of entries) {
        const key = `${e.employee_name}|${e.client_name}`
        matrixHours.set(key, (matrixHours.get(key) || 0) + Number(e.duration_hours || 0))
    }
    for (const [key, hours] of matrixHours.entries()) {
        const [employee, client] = key.split('|')
        matrix.push({
            employee,
            client,
            hours: round2(hours),
            entries: matrixCounter.get(key) || 0,
        })
    }

    // ---- Long entries (>3h)
    const longEntries: LongEntry[] = entries
        .filter((e) => Number(e.duration_hours || 0) > 3)
        .map((e) => ({
            id: e.id,
            employee: e.employee_name,
            client: e.client_name,
            date: e.date,
            hours: round2(Number(e.duration_hours || 0)),
            task: e.task_name,
        }))
        .sort((a, b) => b.hours - a.hours)

    // ---- Shared tasks / duplicate meetings detection
    const byDateAndTask = new Map<string, { displayTask: string; client: string; entries: RawTimeEntry[] }>()
    for (const e of entries) {
        const normalized = normalizeText(e.task_name).slice(0, 40)
        if (!normalized) continue
        const key = `${e.date}|${normalized}`
        const slot = byDateAndTask.get(key) || { displayTask: e.task_name, client: e.client_name, entries: [] }
        slot.entries.push(e)
        byDateAndTask.set(key, slot)
    }

    const sharedTasks: SharedTaskGroup[] = []
    for (const [key, slot] of byDateAndTask.entries()) {
        const distinctEmployees = new Set(slot.entries.map((e) => e.employee_name))
        if (distinctEmployees.size < 2) continue
        const [date, normalized] = key.split('|')
        const meeting = detectMeetingFlag(slot.displayTask)
        sharedTasks.push({
            date,
            normalizedKey: normalized,
            displayTask: slot.displayTask,
            client: slot.client,
            entries: slot.entries.map((e) => ({
                id: e.id,
                employee: e.employee_name,
                hours: round2(Number(e.duration_hours || 0)),
                task: e.task_name,
            })),
            employeesCount: distinctEmployees.size,
            totalHours: round2(slot.entries.reduce((s, e) => s + Number(e.duration_hours || 0), 0)),
            flagType: meeting ? 'meeting' : 'duplicate',
        })
    }
    sharedTasks.sort((a, b) => b.totalHours - a.totalHours)

    const distinctEmployees = employees.length
    const distinctClients = clients.length
    const distinctDays = perDayHours.length

    return {
        weekLabel,
        startDate,
        endDateExclusive,
        totalEntries,
        totalHours,
        distinctEmployees,
        distinctClients,
        distinctDays,
        clients,
        employees,
        employeeClientMatrix: matrix,
        longEntries,
        sharedTasks,
        perDayHours,
    }
}
