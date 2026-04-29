import { WeeklyReportPromptPayload } from './weekly-report-prompt'

interface WeeklyReportHtmlInput {
    reportMarkdown: string
    payload: WeeklyReportPromptPayload
    generatedAtIso: string
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

type ReportSections = Record<string, string[]>

function parseSections(markdown: string): ReportSections {
    const lines = markdown.split('\n')
    const sections: ReportSections = {}
    let current = ''

    for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue
        if (line.startsWith('### ')) {
            current = line.replace(/^###\s+/, '').toLowerCase()
            sections[current] = sections[current] || []
            continue
        }
        if (line.startsWith('## ')) continue
        if (!current) continue
        sections[current].push(line)
    }

    return sections
}

function linesToCards(lines: string[]): string {
    if (!lines.length) {
        return '<p class="muted">No se han generado highlights para este periodo.</p>'
    }
    return `<div class="chips">${lines
        .map((line) => `<article class="chip">${escapeHtml(line.replace(/^[-*]\s*/, ''))}</article>`)
        .join('')}</div>`
}

function linesToList(lines: string[], fallback: string): string {
    if (!lines.length) return `<p class="muted">${escapeHtml(fallback)}</p>`
    return `<ul>${lines
        .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s*/, ''))}</li>`)
        .join('')}</ul>`
}

function linesToIssueBlocks(lines: string[], fallback: string): string {
    if (!lines.length) return `<p class="muted">${escapeHtml(fallback)}</p>`
    return `<div class="issues">${lines
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean)
        .map(
            (line) => `
            <article class="issue">
              <div class="issue-dot"></div>
              <p>${escapeHtml(line)}</p>
            </article>
          `
        )
        .join('')}</div>`
}

function buildTableRows(rows: Array<{ name: string; hours: number; entries: number }>): string {
    return rows
        .map(
            (row) => `
            <tr>
                <td>${escapeHtml(row.name)}</td>
                <td>${row.hours.toFixed(2)} h</td>
                <td>${row.entries}</td>
                <td>${((row.hours / Math.max(0.01, rows.reduce((s, r) => s + r.hours, 0))) * 100).toFixed(1)}%</td>
            </tr>
        `
        )
        .join('\n')
}

export function buildWeeklyReportHtml({ reportMarkdown, payload, generatedAtIso }: WeeklyReportHtmlInput): string {
    const generatedAt = new Date(generatedAtIso).toLocaleString('es-ES')
    const clientRows = payload.clientHours.map((row) => ({
        name: row.client_name,
        hours: row.total_hours,
        entries: row.entries_count,
    }))
    const employeeRows = payload.employeeHours.map((row) => ({
        name: row.employee_name,
        hours: row.total_hours,
        entries: row.entries_count,
    }))

    const sections = parseSections(reportMarkdown)
    const highlights = sections['1) highlights'] || []
    const clientObservations = sections['2) carga por cliente'] || []
    const employeeObservations = sections['3) carga por empleado'] || []
    const doubtfulEntries = sections['4) entradas dudosas a revisar'] || []
    const recommendations = sections['5) recomendaciones accionables'] || []

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Informe semanal ${escapeHtml(payload.weekLabel)}</title>
  <style>
    :root {
      --g-primary: #E40046;
      --g-accent: #8D1737;
      --g-soft: #F2E1E9;
      --g-text: #1A1A1A;
      --g-white: #FFFFFF;
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Rethink Sans", "Inter", system-ui, -apple-system, sans-serif;
      color: var(--g-text);
      background: radial-gradient(circle at top right, #fde7ef 0%, #fff 45%);
      line-height: 1.45;
    }
    .shell { max-width: 1120px; margin: 0 auto; padding: 24px; }
    .header {
      background: linear-gradient(120deg, var(--g-primary), var(--g-accent));
      color: white;
      border-radius: 28px;
      padding: 28px;
      box-shadow: 0 18px 40px rgba(141, 23, 55, 0.26);
    }
    .logo-dot {
      display: inline-flex;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      background: white;
      color: var(--g-primary);
      margin-right: 10px;
    }
    h1 { margin: 0; font-size: 1.85rem; }
    .sub { margin-top: 8px; opacity: .95; font-size: .96rem; }
    .cards {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }
    .card {
      background: #fff;
      border: 1px solid #f3ceda;
      border-radius: var(--radius);
      padding: 14px;
    }
    .card .k { font-size: .78rem; color: #6f5a63; text-transform: uppercase; letter-spacing: .06em; }
    .card .v { margin-top: 6px; font-size: 1.2rem; font-weight: 800; color: var(--g-accent); }
    .layout {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .panel {
      background: #fff;
      border: 1px solid #f2d7e0;
      border-radius: 20px;
      padding: 16px;
    }
    h2, h3 { color: var(--g-accent); margin: 16px 0 8px; }
    h2:first-child, h3:first-child { margin-top: 0; }
    p { margin: 8px 0; }
    ul { margin: 8px 0 12px; padding-left: 20px; }
    .muted { color: #705f66; }
    .chips {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    .chip {
      border: 1px solid #f0d5df;
      background: #fff6fa;
      border-radius: 16px;
      padding: 12px;
      font-size: .92rem;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .issues {
      display: grid;
      gap: 10px;
    }
    .issue {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      border: 1px solid #f1d4de;
      background: #fff8fb;
      border-radius: 14px;
      padding: 12px;
    }
    .issue p {
      margin: 0;
      font-size: .92rem;
    }
    .issue-dot {
      margin-top: 4px;
      width: 9px;
      min-width: 9px;
      height: 9px;
      border-radius: 999px;
      background: var(--g-primary);
    }
    table { width: 100%; border-collapse: collapse; font-size: .92rem; }
    th, td { border-bottom: 1px solid #f2dce3; text-align: left; padding: 10px 8px; }
    th { background: #fff2f7; color: var(--g-accent); position: sticky; top: 0; }
    .table-wrap { max-height: 420px; overflow: auto; border-radius: 14px; border: 1px solid #f4dbe4; }
    .observations {
      margin-top: 10px;
      border: 1px solid #f1d7e0;
      background: #fff8fb;
      border-radius: 12px;
      padding: 10px 12px;
    }
    .observations h4 {
      margin: 0 0 8px;
      font-size: .82rem;
      color: var(--g-accent);
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .observations ul { margin: 0; }
    .footer { margin-top: 14px; font-size: .8rem; color: #6d5a61; }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="shell">
    <section class="header">
      <div><span class="logo-dot">G.</span><strong>Guinda</strong></div>
      <h1>Informe semanal interactivo</h1>
      <p class="sub">Semana ${escapeHtml(payload.weekLabel)} · generado el ${escapeHtml(generatedAt)}</p>
    </section>

    <section class="cards">
      <article class="card"><div class="k">Entradas</div><div class="v">${payload.totalEntries}</div></article>
      <article class="card"><div class="k">Horas registradas</div><div class="v">${payload.totalHours.toFixed(2)} h</div></article>
      <article class="card"><div class="k">Clientes</div><div class="v">${payload.clients.length}</div></article>
      <article class="card"><div class="k">Empleados</div><div class="v">${payload.employees.length}</div></article>
    </section>

    <section class="layout">
      <article class="panel">
        <h3>1) Highlights</h3>
        ${linesToCards(highlights)}
      </article>

      <article class="panel">
        <div class="two-col">
          <section>
        <h3>2) Carga por cliente</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Horas</th><th>Entradas</th><th>% horas</th></tr></thead>
            <tbody>${buildTableRows(clientRows)}</tbody>
          </table>
        </div>
        <div class="observations">
          <h4>Observaciones</h4>
          ${linesToList(clientObservations, 'Sin observaciones adicionales de carga por cliente.')}
        </div>
          </section>

          <section>
        <h3 style="margin-top:16px;">3) Carga por empleado</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Empleado</th><th>Horas</th><th>Entradas</th><th>% horas</th></tr></thead>
            <tbody>${buildTableRows(employeeRows)}</tbody>
          </table>
        </div>
        <div class="observations">
          <h4>Observaciones</h4>
          ${linesToList(employeeObservations, 'Sin observaciones adicionales de carga por empleado.')}
        </div>
          </section>
        </div>
      </article>

      <article class="panel">
        <h3>4) Entradas dudosas a revisar</h3>
        ${linesToIssueBlocks(doubtfulEntries, 'No se han detectado entradas dudosas en este periodo.')}
      </article>

      <article class="panel">
        <h3>5) Recomendaciones accionables</h3>
        ${linesToList(recommendations, 'Sin recomendaciones adicionales para esta semana.')}
      </article>
    </section>

    <p class="footer">Diseño Guinda · paleta #E40046 / #8D1737 / #F2E1E9 · tipografía sugerida: Rethink Sans.</p>
  </div>
</body>
</html>`
}
