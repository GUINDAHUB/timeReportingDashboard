import type { WeeklyReportData } from './weekly-report-data'
import type { WeeklyReportNarrative } from './weekly-report-prompt'

interface WeeklyReportHtmlInput {
    data: WeeklyReportData
    narrative: WeeklyReportNarrative
    generatedAtIso: string
    modelName?: string | null
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function escapeJsonForScript(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e')
}

function highlightLine(text: string): string {
    return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function renderBulletList(items: string[]): string {
    if (!items.length) return '<p class="muted">Sin contenido.</p>'
    return `<ul class="bulleted">${items.map((item) => `<li>${highlightLine(item)}</li>`).join('')}</ul>`
}

function renderHighlightChips(items: string[]): string {
    if (!items.length) return '<p class="muted">Sin highlights para este periodo.</p>'
    return `<div class="chips">${items
        .map((item) => `<article class="chip"><span class="chip-dot"></span><p>${highlightLine(item)}</p></article>`)
        .join('')}</div>`
}

export function buildWeeklyReportHtml({ data, narrative, generatedAtIso, modelName }: WeeklyReportHtmlInput): string {
    const generatedAt = new Date(generatedAtIso).toLocaleString('es-ES')

    const dataForScript = escapeJsonForScript({
        weekLabel: data.weekLabel,
        clients: data.clients,
        employees: data.employees,
        matrix: data.employeeClientMatrix,
        longEntries: data.longEntries,
        sharedTasks: data.sharedTasks,
        perDayHours: data.perDayHours,
    })

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Informe semanal ${escapeHtml(data.weekLabel)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --g-primary: #E40046;
      --g-primary-soft: #FBD5E0;
      --g-accent: #8D1737;
      --g-accent-soft: #E8C5D0;
      --g-bg: #FFFAFC;
      --g-text: #1A1A1A;
      --g-muted: #6F5A63;
      --g-border: #F3DCE4;
      --g-border-strong: #E8B9C8;
      --g-white: #FFFFFF;
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Rethink Sans", "Inter", system-ui, -apple-system, sans-serif;
      color: var(--g-text);
      background: radial-gradient(circle at top right, #fde7ef 0%, #fff 45%);
      line-height: 1.5;
      font-size: 14px;
    }
    .shell { max-width: 1280px; margin: 0 auto; padding: 24px; }
    .header {
      background: linear-gradient(120deg, var(--g-primary), var(--g-accent));
      color: white;
      border-radius: 28px;
      padding: 28px 32px;
      box-shadow: 0 18px 40px rgba(141, 23, 55, 0.26);
    }
    .header-top { display: flex; align-items: center; gap: 10px; }
    .logo-dot {
      display: inline-flex;
      width: 36px; height: 36px;
      border-radius: 999px;
      align-items: center; justify-content: center;
      font-weight: 800;
      background: white;
      color: var(--g-primary);
    }
    h1 { margin: 12px 0 0; font-size: 2rem; line-height: 1.1; }
    .sub { margin-top: 8px; opacity: .95; font-size: .96rem; }

    .cards {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }
    .card {
      background: #fff;
      border: 1px solid var(--g-border);
      border-radius: var(--radius);
      padding: 16px;
    }
    .card .k { font-size: .75rem; color: var(--g-muted); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
    .card .v { margin-top: 6px; font-size: 1.4rem; font-weight: 800; color: var(--g-accent); }
    .card .sub { font-size: .78rem; color: var(--g-muted); margin-top: 2px; opacity: 1; }

    .layout { margin-top: 18px; display: grid; gap: 18px; }
    .panel {
      background: #fff;
      border: 1px solid var(--g-border);
      border-radius: 22px;
      padding: 20px;
    }
    .panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .panel-head h2 {
      margin: 0;
      color: var(--g-accent);
      font-size: 1.25rem;
    }
    .panel-head .num {
      width: 28px; height: 28px;
      background: var(--g-primary);
      color: white;
      border-radius: 999px;
      display: inline-flex; align-items: center; justify-content: center;
      font-weight: 800;
      font-size: .85rem;
    }
    h3 { color: var(--g-accent); margin: 18px 0 10px; font-size: 1rem; }
    h3:first-child { margin-top: 0; }
    .muted { color: var(--g-muted); }
    .small { font-size: .85rem; }

    .grid-2 {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 18px;
    }
    @media (max-width: 980px) { .grid-2 { grid-template-columns: 1fr; } }

    .chart-wrap { position: relative; height: 320px; }
    .chart-wrap-tall { position: relative; height: 380px; }

    .observations {
      background: var(--g-bg);
      border: 1px solid var(--g-border);
      border-radius: 14px;
      padding: 14px 16px;
      margin-top: 14px;
    }
    .observations h4 {
      margin: 0 0 8px;
      font-size: .78rem;
      color: var(--g-accent);
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .observations ul { margin: 0; padding-left: 18px; }
    .observations li { margin-bottom: 4px; }

    .chips {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 10px;
    }
    .chip {
      border: 1px solid var(--g-border);
      background: linear-gradient(180deg, #fff 0%, var(--g-bg) 100%);
      border-radius: 16px;
      padding: 14px 14px 14px 36px;
      position: relative;
    }
    .chip-dot {
      position: absolute;
      left: 14px; top: 18px;
      width: 10px; height: 10px;
      border-radius: 999px;
      background: var(--g-primary);
    }
    .chip p { margin: 0; font-size: .92rem; }

    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; align-items: center; }
    .search {
      flex: 1;
      min-width: 220px;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--g-border-strong);
      background: white;
      font-size: .92rem;
      font-family: inherit;
      color: var(--g-text);
    }
    .search:focus { outline: 2px solid var(--g-primary); outline-offset: 1px; }
    .pill {
      font-size: .78rem; padding: 4px 10px; border-radius: 999px;
      background: var(--g-bg); color: var(--g-accent); border: 1px solid var(--g-border);
    }

    .data-table {
      width: 100%; border-collapse: separate; border-spacing: 0; font-size: .9rem;
    }
    .data-table th, .data-table td {
      border-bottom: 1px solid var(--g-border);
      text-align: left; padding: 10px;
      vertical-align: middle;
    }
    .data-table th {
      background: #fff2f7; color: var(--g-accent);
      cursor: pointer; user-select: none;
      font-size: .78rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
      position: sticky; top: 0; z-index: 1;
    }
    .data-table th .sort-ind { opacity: .35; margin-left: 4px; font-size: .7rem; }
    .data-table th.sorted .sort-ind { opacity: 1; color: var(--g-primary); }
    .data-table tr.expandable { cursor: pointer; }
    .data-table tr.expandable:hover td { background: #fff8fb; }
    .data-table td.numeric { text-align: right; font-variant-numeric: tabular-nums; }
    .data-table th.numeric { text-align: right; }
    .table-wrap { max-height: 480px; overflow: auto; border-radius: 14px; border: 1px solid var(--g-border); }
    .bar-cell { position: relative; min-width: 110px; }
    .bar-cell .bar-track {
      position: relative;
      height: 8px;
      background: var(--g-bg);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 4px;
    }
    .bar-cell .bar-fill {
      position: absolute; left: 0; top: 0; bottom: 0;
      background: linear-gradient(90deg, var(--g-primary), var(--g-accent));
      border-radius: 999px;
    }
    .drilldown {
      background: var(--g-bg);
      border-radius: 12px;
      margin: 4px;
      padding: 14px 16px;
    }
    .drilldown h5 { margin: 0 0 8px; color: var(--g-accent); font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; }
    .drilldown ul { margin: 4px 0 12px; padding-left: 18px; }
    .drilldown li { margin-bottom: 2px; font-size: .88rem; }

    .matrix-wrap { overflow: auto; border-radius: 14px; border: 1px solid var(--g-border); max-height: 520px; }
    .matrix {
      border-collapse: separate; border-spacing: 0;
      font-size: .82rem;
      white-space: nowrap;
    }
    .matrix th, .matrix td { padding: 6px 8px; text-align: center; border-right: 1px solid var(--g-border); border-bottom: 1px solid var(--g-border); }
    .matrix thead th { background: #fff2f7; color: var(--g-accent); position: sticky; top: 0; font-weight: 700; }
    .matrix tbody th { background: #fff8fb; color: var(--g-accent); position: sticky; left: 0; text-align: left; font-weight: 600; }
    .matrix td.value { font-variant-numeric: tabular-nums; }
    .matrix td.zero { color: #c9c0c4; }
    .matrix td .heat-cell { display: inline-block; min-width: 36px; padding: 4px 8px; border-radius: 8px; }

    .badge {
      display: inline-block;
      font-size: .7rem;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .badge.meeting { background: #f5f0ff; color: #5b3aa0; border: 1px solid #d8caf5; }
    .badge.duplicate { background: #fff2f7; color: var(--g-primary); border: 1px solid var(--g-border-strong); }

    .shared-grid { display: grid; gap: 12px; }
    .shared-card {
      border: 1px solid var(--g-border);
      background: linear-gradient(180deg, #fff 0%, var(--g-bg) 100%);
      border-radius: 18px;
      padding: 14px 16px;
    }
    .shared-card-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .shared-card-title { font-weight: 700; color: var(--g-accent); font-size: .98rem; flex: 1; min-width: 200px; }
    .shared-card-meta { font-size: .78rem; color: var(--g-muted); }
    .shared-card ul { margin: 10px 0 0; padding-left: 18px; font-size: .88rem; }
    .shared-card ul li { margin-bottom: 2px; }

    .footer {
      margin-top: 24px;
      font-size: .8rem;
      color: var(--g-muted);
      text-align: center;
    }
    .footer .meta-line { margin-top: 4px; }

    [data-hidden="true"] { display: none !important; }

    .empty {
      padding: 16px;
      border: 1px dashed var(--g-border-strong);
      border-radius: 14px;
      color: var(--g-muted);
      text-align: center;
      background: var(--g-bg);
    }

    @media print {
      body { background: #fff; }
      .header { box-shadow: none; }
      .toolbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="header">
      <div class="header-top"><span class="logo-dot">G.</span><strong>Guinda · Operaciones</strong></div>
      <h1>Informe semanal interactivo</h1>
      <p class="sub">Semana ${escapeHtml(data.weekLabel)} · generado ${escapeHtml(generatedAt)}${modelName ? ` · ${escapeHtml(modelName)}` : ''}</p>
    </section>

    <section class="cards">
      <article class="card"><div class="k">Entradas</div><div class="v">${data.totalEntries}</div></article>
      <article class="card"><div class="k">Horas registradas</div><div class="v">${data.totalHours.toFixed(2)} h</div></article>
      <article class="card"><div class="k">Empleados activos</div><div class="v">${data.distinctEmployees}</div></article>
      <article class="card"><div class="k">Clientes implicados</div><div class="v">${data.distinctClients}</div></article>
      <article class="card"><div class="k">Días con registro</div><div class="v">${data.distinctDays}</div></article>
      <article class="card"><div class="k">Entradas &gt; 3 h</div><div class="v">${data.longEntries.length}</div></article>
      <article class="card"><div class="k">Reuniones / duplicidades</div><div class="v">${data.sharedTasks.length}</div></article>
    </section>

    <section class="layout">

      <article class="panel">
        <div class="panel-head"><span class="num">1</span><h2>Highlights</h2></div>
        ${renderHighlightChips(narrative.highlights)}
        <div class="observations" style="margin-top:16px;">
          <h4>Resumen del rango</h4>
          <p class="small">Semana <strong>${escapeHtml(data.weekLabel)}</strong> · ${data.totalEntries} entradas · ${data.totalHours.toFixed(2)} h · ${data.distinctEmployees} empleados · ${data.distinctClients} clientes · ${data.distinctDays} días con actividad.</p>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head"><span class="num">2</span><h2>Carga por cliente</h2></div>
        <div class="grid-2">
          <div>
            <h3>Distribución de horas</h3>
            <div class="chart-wrap"><canvas id="chartClients"></canvas></div>
          </div>
          <div>
            <h3>Reparto del total</h3>
            <div class="chart-wrap"><canvas id="chartClientsDonut"></canvas></div>
          </div>
        </div>

        <h3 style="margin-top:18px;">Tabla detallada</h3>
        <div class="toolbar">
          <input class="search" id="searchClients" type="search" placeholder="Buscar cliente..." />
          <span class="pill">Pulsa una fila para desplegar detalle</span>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="tableClients">
            <thead>
              <tr>
                <th data-sort="name" data-type="string">Cliente <span class="sort-ind">▾</span></th>
                <th data-sort="hours" data-type="number" class="numeric sorted">Horas <span class="sort-ind">▾</span></th>
                <th data-sort="entries" data-type="number" class="numeric">Entradas <span class="sort-ind">▾</span></th>
                <th data-sort="pct" data-type="number" class="numeric">% total <span class="sort-ind">▾</span></th>
                <th data-sort="avg" data-type="number" class="numeric">h / entrada <span class="sort-ind">▾</span></th>
                <th data-sort="days" data-type="number" class="numeric">Días activos <span class="sort-ind">▾</span></th>
              </tr>
            </thead>
            <tbody id="bodyClients"></tbody>
          </table>
        </div>

        <div class="observations">
          <h4>Observaciones</h4>
          ${renderBulletList(narrative.clientObservations)}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head"><span class="num">3</span><h2>Carga por empleado</h2></div>
        <div class="grid-2">
          <div>
            <h3>Distribución de horas</h3>
            <div class="chart-wrap"><canvas id="chartEmployees"></canvas></div>
          </div>
          <div>
            <h3>Horas / día activo (promedio)</h3>
            <div class="chart-wrap"><canvas id="chartEmployeesAvg"></canvas></div>
          </div>
        </div>

        <h3 style="margin-top:18px;">Tabla detallada</h3>
        <div class="toolbar">
          <input class="search" id="searchEmployees" type="search" placeholder="Buscar empleado..." />
          <span class="pill">Pulsa una fila para desplegar detalle</span>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="tableEmployees">
            <thead>
              <tr>
                <th data-sort="name" data-type="string">Empleado <span class="sort-ind">▾</span></th>
                <th data-sort="hours" data-type="number" class="numeric sorted">Horas <span class="sort-ind">▾</span></th>
                <th data-sort="entries" data-type="number" class="numeric">Entradas <span class="sort-ind">▾</span></th>
                <th data-sort="pct" data-type="number" class="numeric">% total <span class="sort-ind">▾</span></th>
                <th data-sort="avgPerDay" data-type="number" class="numeric">h / día activo <span class="sort-ind">▾</span></th>
                <th data-sort="days" data-type="number" class="numeric">Días activos <span class="sort-ind">▾</span></th>
                <th data-sort="principal" data-type="string">Cliente principal <span class="sort-ind">▾</span></th>
              </tr>
            </thead>
            <tbody id="bodyEmployees"></tbody>
          </table>
        </div>

        <div class="observations">
          <h4>Observaciones</h4>
          ${renderBulletList(narrative.employeeObservations)}
        </div>

        <h3 style="margin-top:18px;">Distribución empleado × cliente principal</h3>
        <p class="muted small">Cada celda es horas registradas por ese empleado en ese cliente. El color crece con las horas.</p>
        <div class="matrix-wrap" id="matrixWrap"></div>
      </article>

      <article class="panel">
        <div class="panel-head"><span class="num">4</span><h2>Entradas dudosas a revisar</h2></div>

        <h3>A. Entradas individuales &gt; 3 horas</h3>
        <div class="toolbar">
          <input class="search" id="searchLong" type="search" placeholder="Buscar tarea / empleado / cliente..." />
          <span class="pill">${data.longEntries.length} entradas detectadas</span>
        </div>
        ${
            data.longEntries.length === 0
                ? '<p class="empty">No hay entradas superiores a 3 horas esta semana.</p>'
                : `<div class="table-wrap">
          <table class="data-table" id="tableLong">
            <thead>
              <tr>
                <th data-sort="hours" data-type="number" class="numeric sorted">Horas <span class="sort-ind">▾</span></th>
                <th data-sort="employee" data-type="string">Empleado <span class="sort-ind">▾</span></th>
                <th data-sort="client" data-type="string">Cliente <span class="sort-ind">▾</span></th>
                <th data-sort="date" data-type="string">Fecha <span class="sort-ind">▾</span></th>
                <th data-sort="task" data-type="string">Tarea <span class="sort-ind">▾</span></th>
              </tr>
            </thead>
            <tbody id="bodyLong"></tbody>
          </table>
        </div>`
        }

        <h3 style="margin-top:22px;">B. Posibles duplicidades / reuniones compartidas</h3>
        <p class="muted small">Misma fecha + tarea muy similar registrada por 2 o más empleados.</p>
        <div class="toolbar">
          <input class="search" id="searchShared" type="search" placeholder="Buscar tarea / cliente / empleado..." />
          <span class="pill">${data.sharedTasks.length} grupos detectados</span>
        </div>
        <div class="shared-grid" id="sharedGrid"></div>

        <div class="observations">
          <h4>Análisis cualitativo</h4>
          ${renderBulletList(narrative.doubtfulAnalysis)}
        </div>
      </article>
    </section>

    <p class="footer">
      Informe generado por Guinda · paleta corporativa #E40046 / #8D1737 / #F2E1E9
      <span class="meta-line">Para ver las gráficas y la interactividad, abre este HTML en un navegador.</span>
    </p>
  </div>

  <script id="report-data" type="application/json">${dataForScript}</script>
  <script>
  (function() {
    const dataNode = document.getElementById('report-data');
    if (!dataNode) return;
    const DATA = JSON.parse(dataNode.textContent || '{}');

    const PRIMARY = '#E40046';
    const ACCENT = '#8D1737';
    const SOFT = 'rgba(228, 0, 70, 0.18)';

    // ---------- Charts (require Chart.js)
    function maybeChart(id, config) {
      const el = document.getElementById(id);
      if (!el || typeof Chart === 'undefined') return null;
      return new Chart(el, config);
    }

    const clientsTop = (DATA.clients || []).slice(0, 12);
    maybeChart('chartClients', {
      type: 'bar',
      data: {
        labels: clientsTop.map(c => c.name),
        datasets: [{
          label: 'Horas',
          data: clientsTop.map(c => c.hours),
          backgroundColor: PRIMARY,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + ' h' } } },
        scales: { x: { beginAtZero: true, ticks: { callback: v => v + ' h' } } },
      },
    });

    const donutItems = (DATA.clients || []).slice(0, 8);
    const restHours = (DATA.clients || []).slice(8).reduce((s, c) => s + c.hours, 0);
    if (restHours > 0) donutItems.push({ name: 'Resto', hours: restHours });
    maybeChart('chartClientsDonut', {
      type: 'doughnut',
      data: {
        labels: donutItems.map(c => c.name),
        datasets: [{
          data: donutItems.map(c => c.hours),
          backgroundColor: ['#E40046','#8D1737','#C53D6A','#F2A1B7','#D67D9A','#A52455','#F4C6D2','#E58CA5','#B4596F'],
          borderColor: '#fff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.parsed.toFixed(2) + ' h' } },
        },
      },
    });

    const empsTop = (DATA.employees || []).slice(0, 12);
    maybeChart('chartEmployees', {
      type: 'bar',
      data: {
        labels: empsTop.map(e => e.name),
        datasets: [{
          label: 'Horas',
          data: empsTop.map(e => e.hours),
          backgroundColor: ACCENT,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + ' h' } } },
        scales: { x: { beginAtZero: true, ticks: { callback: v => v + ' h' } } },
      },
    });

    maybeChart('chartEmployeesAvg', {
      type: 'bar',
      data: {
        labels: empsTop.map(e => e.name),
        datasets: [{
          label: 'Horas por día activo',
          data: empsTop.map(e => e.avgHoursPerActiveDay),
          backgroundColor: PRIMARY,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + ' h/día' } } },
        scales: { x: { beginAtZero: true, ticks: { callback: v => v + ' h' } } },
      },
    });

    // ---------- Helpers
    function escapeHtml(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function hoursCell(hours, max) {
      const pct = max > 0 ? Math.min(100, (hours / max) * 100) : 0;
      return '<div class="bar-cell"><div>' + hours.toFixed(2) + ' h</div><div class="bar-track"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div></div>';
    }

    // ---------- Clients table
    (function() {
      const tbody = document.getElementById('bodyClients');
      if (!tbody) return;
      const rows = (DATA.clients || []).map(c => ({
        name: c.name,
        hours: c.hours,
        entries: c.entries,
        pct: c.pctOfTotal,
        avg: c.avgHoursPerEntry,
        days: c.daysActive,
        top_employees: c.topEmployees || [],
        top_tasks: c.topTasks || [],
      }));
      const maxHours = Math.max.apply(null, rows.map(r => r.hours).concat([0]));

      function render(filtered, sortKey, dir) {
        const sorted = filtered.slice().sort((a, b) => {
          const av = a[sortKey], bv = b[sortKey];
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
        const html = sorted.map((r, idx) => {
          const drill = '<tr class="drill-row" data-hidden="true"><td colspan="6">' +
            '<div class="drilldown">' +
              '<h5>Empleados que más trabajaron</h5>' +
              '<ul>' + r.top_employees.map(e => '<li><strong>' + escapeHtml(e.name) + '</strong> — ' + e.hours.toFixed(2) + ' h (' + e.pct.toFixed(1) + '%)</li>').join('') + '</ul>' +
              '<h5>Tareas dominantes</h5>' +
              '<ul>' + r.top_tasks.map(t => '<li>' + escapeHtml(t.task) + ' — ' + t.hours.toFixed(2) + ' h · ' + t.count + ' entradas</li>').join('') + '</ul>' +
            '</div></td></tr>';
          return '<tr class="expandable" data-row="' + idx + '">' +
            '<td>' + escapeHtml(r.name) + '</td>' +
            '<td class="numeric">' + hoursCell(r.hours, maxHours) + '</td>' +
            '<td class="numeric">' + r.entries + '</td>' +
            '<td class="numeric">' + r.pct.toFixed(1) + '%</td>' +
            '<td class="numeric">' + r.avg.toFixed(2) + '</td>' +
            '<td class="numeric">' + r.days + '</td>' +
            '</tr>' + drill;
        }).join('');
        tbody.innerHTML = html;
        bindRowToggles(tbody);
      }

      attachInteractiveTable({
        table: document.getElementById('tableClients'),
        rows,
        sortKey: 'hours',
        sortDir: -1,
        searchInput: document.getElementById('searchClients'),
        searchFields: ['name'],
        render,
      });
    })();

    // ---------- Employees table
    (function() {
      const tbody = document.getElementById('bodyEmployees');
      if (!tbody) return;
      const rows = (DATA.employees || []).map(e => ({
        name: e.name,
        hours: e.hours,
        entries: e.entries,
        pct: e.pctOfTotal,
        avgPerDay: e.avgHoursPerActiveDay,
        days: e.daysActive,
        principal: e.principalClient ? e.principalClient.name : '—',
        principalPct: e.principalClient ? e.principalClient.pct : 0,
        top_clients: e.topClients || [],
        top_tasks: e.topTasks || [],
      }));
      const maxHours = Math.max.apply(null, rows.map(r => r.hours).concat([0]));

      function render(filtered, sortKey, dir) {
        const sorted = filtered.slice().sort((a, b) => {
          const av = a[sortKey], bv = b[sortKey];
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
        const html = sorted.map((r, idx) => {
          const drill = '<tr class="drill-row" data-hidden="true"><td colspan="7">' +
            '<div class="drilldown">' +
              '<h5>Clientes con más dedicación</h5>' +
              '<ul>' + r.top_clients.map(c => '<li><strong>' + escapeHtml(c.name) + '</strong> — ' + c.hours.toFixed(2) + ' h (' + c.pct.toFixed(1) + '%)</li>').join('') + '</ul>' +
              '<h5>Tareas dominantes</h5>' +
              '<ul>' + r.top_tasks.map(t => '<li>' + escapeHtml(t.task) + ' — ' + t.hours.toFixed(2) + ' h · ' + t.count + ' entradas</li>').join('') + '</ul>' +
            '</div></td></tr>';
          return '<tr class="expandable" data-row="' + idx + '">' +
            '<td>' + escapeHtml(r.name) + '</td>' +
            '<td class="numeric">' + hoursCell(r.hours, maxHours) + '</td>' +
            '<td class="numeric">' + r.entries + '</td>' +
            '<td class="numeric">' + r.pct.toFixed(1) + '%</td>' +
            '<td class="numeric">' + r.avgPerDay.toFixed(2) + '</td>' +
            '<td class="numeric">' + r.days + '</td>' +
            '<td>' + escapeHtml(r.principal) + (r.principalPct ? ' <span class="small muted">(' + r.principalPct.toFixed(1) + '%)</span>' : '') + '</td>' +
            '</tr>' + drill;
        }).join('');
        tbody.innerHTML = html;
        bindRowToggles(tbody);
      }

      attachInteractiveTable({
        table: document.getElementById('tableEmployees'),
        rows,
        sortKey: 'hours',
        sortDir: -1,
        searchInput: document.getElementById('searchEmployees'),
        searchFields: ['name', 'principal'],
        render,
      });
    })();

    // ---------- Long entries table
    (function() {
      const tbody = document.getElementById('bodyLong');
      if (!tbody) return;
      const rows = (DATA.longEntries || []).map(e => ({
        hours: e.hours,
        employee: e.employee,
        client: e.client,
        date: e.date,
        task: e.task,
      }));
      const maxHours = Math.max.apply(null, rows.map(r => r.hours).concat([0]));

      function render(filtered, sortKey, dir) {
        const sorted = filtered.slice().sort((a, b) => {
          const av = a[sortKey], bv = b[sortKey];
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
        tbody.innerHTML = sorted.map(r => (
          '<tr>' +
            '<td class="numeric">' + hoursCell(r.hours, maxHours) + '</td>' +
            '<td>' + escapeHtml(r.employee) + '</td>' +
            '<td>' + escapeHtml(r.client) + '</td>' +
            '<td>' + escapeHtml(r.date) + '</td>' +
            '<td>' + escapeHtml(r.task) + '</td>' +
          '</tr>'
        )).join('');
      }

      attachInteractiveTable({
        table: document.getElementById('tableLong'),
        rows,
        sortKey: 'hours',
        sortDir: -1,
        searchInput: document.getElementById('searchLong'),
        searchFields: ['employee', 'client', 'task', 'date'],
        render,
      });
    })();

    // ---------- Shared tasks (cards)
    (function() {
      const grid = document.getElementById('sharedGrid');
      if (!grid) return;
      const all = (DATA.sharedTasks || []);

      function render(filterText) {
        const q = (filterText || '').trim().toLowerCase();
        const items = all.filter(s => {
          if (!q) return true;
          if ((s.displayTask || '').toLowerCase().includes(q)) return true;
          if ((s.client || '').toLowerCase().includes(q)) return true;
          if ((s.entries || []).some(e => (e.employee || '').toLowerCase().includes(q))) return true;
          return false;
        });

        if (items.length === 0) {
          grid.innerHTML = '<p class="empty">No se han detectado posibles duplicidades o reuniones compartidas para esta búsqueda.</p>';
          return;
        }
        grid.innerHTML = items.map(s => (
          '<article class="shared-card">' +
            '<div class="shared-card-head">' +
              '<span class="shared-card-title">' + escapeHtml(s.displayTask) + '</span>' +
              '<span class="badge ' + (s.flagType === 'meeting' ? 'meeting' : 'duplicate') + '">' + (s.flagType === 'meeting' ? 'Reunión' : 'Posible duplicado') + '</span>' +
            '</div>' +
            '<div class="shared-card-meta">' +
              escapeHtml(s.date) + ' · ' + escapeHtml(s.client) + ' · ' + s.employeesCount + ' empleados · ' + s.totalHours.toFixed(2) + ' h totales' +
            '</div>' +
            '<ul>' + (s.entries || []).map(e => '<li><strong>' + escapeHtml(e.employee) + '</strong> — ' + e.hours.toFixed(2) + ' h · ' + escapeHtml(e.task) + '</li>').join('') + '</ul>' +
          '</article>'
        )).join('');
      }

      const input = document.getElementById('searchShared');
      if (input) input.addEventListener('input', () => render(input.value));
      render('');
    })();

    // ---------- Matrix
    (function() {
      const wrap = document.getElementById('matrixWrap');
      if (!wrap) return;
      const employees = (DATA.employees || []).map(e => e.name);
      const clients = (DATA.clients || []).map(c => c.name);
      const matrix = DATA.matrix || [];
      const cellMap = new Map();
      let maxHours = 0;
      for (const cell of matrix) {
        cellMap.set(cell.employee + '|' + cell.client, cell.hours);
        if (cell.hours > maxHours) maxHours = cell.hours;
      }
      if (employees.length === 0 || clients.length === 0) {
        wrap.innerHTML = '<p class="empty">Sin datos suficientes para la matriz.</p>';
        return;
      }
      function color(hours) {
        if (!hours) return '';
        const alpha = Math.max(0.06, Math.min(0.9, hours / Math.max(1, maxHours)));
        return 'background: rgba(228, 0, 70, ' + alpha.toFixed(2) + '); color: ' + (alpha > 0.5 ? '#fff' : '#3a1620') + ';';
      }
      let html = '<table class="matrix"><thead><tr><th></th>';
      for (const c of clients) html += '<th>' + escapeHtml(c) + '</th>';
      html += '</tr></thead><tbody>';
      for (const emp of employees) {
        html += '<tr><th>' + escapeHtml(emp) + '</th>';
        for (const cli of clients) {
          const v = cellMap.get(emp + '|' + cli) || 0;
          if (v > 0) {
            html += '<td class="value"><span class="heat-cell" style="' + color(v) + '">' + v.toFixed(1) + '</span></td>';
          } else {
            html += '<td class="zero">·</td>';
          }
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      wrap.innerHTML = html;
    })();

    // ---------- Generic interactive table helper
    function attachInteractiveTable(opts) {
      let sortKey = opts.sortKey;
      let sortDir = opts.sortDir;
      let filterText = '';

      function getFiltered() {
        if (!filterText) return opts.rows;
        const q = filterText.toLowerCase();
        return opts.rows.filter(r => opts.searchFields.some(field => String(r[field] || '').toLowerCase().includes(q)));
      }

      function refresh() {
        const headers = opts.table.querySelectorAll('th[data-sort]');
        headers.forEach(th => {
          const isActive = th.getAttribute('data-sort') === sortKey;
          th.classList.toggle('sorted', isActive);
          const ind = th.querySelector('.sort-ind');
          if (ind) ind.textContent = isActive ? (sortDir === 1 ? '▴' : '▾') : '▾';
        });
        opts.render(getFiltered(), sortKey, sortDir);
      }

      opts.table.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.getAttribute('data-sort');
          if (sortKey === key) sortDir = sortDir * -1;
          else { sortKey = key; sortDir = th.getAttribute('data-type') === 'number' ? -1 : 1; }
          refresh();
        });
      });

      if (opts.searchInput) {
        opts.searchInput.addEventListener('input', () => {
          filterText = opts.searchInput.value;
          refresh();
        });
      }

      refresh();
    }

    function bindRowToggles(tbody) {
      tbody.querySelectorAll('tr.expandable').forEach(tr => {
        tr.addEventListener('click', () => {
          const next = tr.nextElementSibling;
          if (next && next.classList.contains('drill-row')) {
            const hidden = next.getAttribute('data-hidden') === 'true';
            next.setAttribute('data-hidden', hidden ? 'false' : 'true');
          }
        });
      });
    }
  })();
  </script>
</body>
</html>`
}
