# 🍒 Guinda Time Tracking SO

Sistema de análisis de rentabilidad para agencias de marketing. Importa datos de ClickUp, gestiona fees variables por mes, y visualiza la rentabilidad de tus clientes a lo largo del tiempo.

## ✨ Características

- 📊 **Dashboard Mensual**: KPIs en tiempo real, tabla de rentabilidad por cliente
- 📈 **Análisis de Tendencias**: Gráficos de evolución de ingresos vs costes
- 📤 **Importación Doble**: Carga desde ClickUp (.csv) o Google Calendar (.ics)
- 🎯 **Clasificación Interactiva**: Asigna clientes a tareas antes de guardar (archivos .ics)
- 🏢 **Gestión de Clientes**: Fees variables por mes, histórico completo
- 🤖 **Categorización Automática**: Clasifica tareas por palabras clave
- 💰 **Cálculos Financieros**: Márgenes, rentabilidad, KPIs avanzados

## 🚀 Quickstart

### 1. Requisitos

- Node.js 18+ y npm
- Cuenta de Supabase

### 2. Instalación

```bash
# Ya instalado, pero si necesitas reinstalar:
npm install
```

### 3. Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **Settings** > **API** y copia:
   - Project URL
   - Anon public key

3. Crea el archivo `.env.local`:

```bash
cp .env.local.example .env.local
```

4. Edita `.env.local` con tus credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
NEXT_PUBLIC_DEFAULT_COST_PER_HOUR=30
NEXT_PUBLIC_CURRENCY=EUR
```

### 4. Crear la Base de Datos

1. Ve al **SQL Editor** en Supabase
2. Ejecuta el contenido de `supabase/schema.sql`
3. Ejecuta el contenido de `supabase/seed.sql`

### 5. Ejecutar la Aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
timeReportingDashboard/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx             # Página de inicio
│   └── globals.css          # Estilos globales
├── lib/
│   ├── services/            # Lógica de negocio
│   │   ├── fee-resolver.ts  # Resolución de fees mensuales
│   │   ├── categorizer.ts   # Auto-categorización
│   │   └── csv-parser.ts    # Parseo de CSVs
│   ├── store/               # State management
│   │   └── date-store.ts    # Filtro global de fechas
│   ├── supabase/            # Clientes de Supabase
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utilidades
├── supabase/
│   ├── schema.sql           # Esquema de base de datos
│   └── seed.sql             # Datos iniciales
└── components/              # Componentes React (próximamente)
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales

1. **clients** - Información de clientes y fee por defecto
2. **client_monthly_goals** - Fees variables por mes/año
3. **categories** - 5 categorías de servicios (Gestión, Creatividad, Producción, Postproducción, Operativa)
4. **keywords** - Keywords para auto-categorización
5. **time_entries** - Registros de tiempo importados

### Lógica de Fees

El sistema busca primero un fee específico para el mes en `client_monthly_goals`. Si no existe, usa el `default_fee` de `clients`.

## 📊 Categorías de Servicios

Basado en el flujo de trabajo de marketing:

- 🟢 **Gestión de Cuenta y Estrategia**: Reuniones, informes, KPIs
- 🟡 **Creatividad y Planificación**: Ideación, calendarios, guiones
- 🟠 **Producción de Campo**: Rodajes, sesiones, coordinación
- 🔴 **Postproducción y Retrabajo**: Edición, diseño, correcciones
- 🔵 **Operativa Diaria (Run)**: Copy, publicación, community management

## 🔄 Importación de Datos

El sistema soporta dos tipos de importación:

### 📊 Importación desde ClickUp (.csv)

**Formato esperado:**

- `Username`: Nombre del empleado
- `Task Name`: Nombre de la tarea
- `Time Tracked`: Duración en milisegundos
- `Start Text`: Fecha de inicio (formato: DD/MM/YYYY, HH:MM:SS AM/PM)
- `Folder Name`: Cliente (preferido)
- `List Name`: Cliente (fallback)
- `Task ID`: ID de la tarea

**Proceso:**
1. Exporta el CSV desde ClickUp (Time Tracking → Export → CSV)
2. Sube el archivo en la página de importación
3. El sistema mapea automáticamente los clientes
4. Categoriza las tareas por keywords
5. Inserta los registros en `time_entries`

### 📅 Importación desde Google Calendar (.ics)

**Casos de uso:** Para importar datos históricos cuando el equipo no usó ClickUp (ej: enero 2026)

**Formato esperado:** Archivo .ics estándar de Google Calendar

**Proceso:**
1. Exporta el calendario desde Google Calendar (Configuración → Importar y exportar)
2. Descomprime el .zip y selecciona el calendario del empleado
3. Sube el archivo .ics en la página de importación
4. Especifica el nombre del empleado
5. Selecciona el mes y año a importar (filtra solo ese periodo)
6. **Clasificación interactiva**: Se abre una pantalla para clasificar todas las tareas por cliente
   - Las tareas se agrupan automáticamente por nombre
   - Puedes asignar un cliente a todo el grupo de una vez
   - Selección múltiple para asignación masiva
   - Barra de progreso para ver cuántas faltan por clasificar
7. Una vez clasificadas todas, se guardan en la base de datos

**Ventajas:**
- ✅ Solo necesitas el calendario exportado
- ✅ Filtra automáticamente por mes/año
- ✅ Clasificación visual e intuitiva antes de guardar
- ✅ **Nunca habrá tareas sin cliente** (clasificación obligatoria)
- ✅ Cada empleado clasifica sus propias tareas
- ✅ Agrupación inteligente para clasificar más rápido

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Lint del código
npm run type-check   # Verificación de tipos
```

### Añadir Nuevas Keywords

Ejecuta en Supabase SQL Editor:

```sql
INSERT INTO keywords (category_id, word) 
SELECT id, 'nueva-keyword' 
FROM categories 
WHERE name = 'Nombre de Categoría';
```

### Crear un Cliente

```sql
INSERT INTO clients (name, default_fee) 
VALUES ('Nuevo Cliente', 2500.00);
```

### Configurar Fee Mensual

```sql
INSERT INTO client_monthly_goals (client_id, month, year, fee, expected_hours)
SELECT id, 2, 2026, 3500.00, 100
FROM clients WHERE name = 'Nombre Cliente';
```

## 📈 KPIs Implementados

### KPIs Básicos
- Total de Ingresos (suma de fees)
- Total de Horas
- Coste Total (horas × coste/hora)
- Margen de Beneficio

### KPIs Avanzados (categorización.md)
- **Tasa de Fricción**: % de tiempo en correcciones
- **Coste de Gestión**: % de tiempo en reuniones/informes
- **Eficiencia de Rodaje**: Piezas producidas por hora
- **Peso Operativo**: % de tiempo en operativa diaria
- **Desviación de Planificación**: Diferencia entre horas estimadas y reales

## 🎨 Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/UI
- **State**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Tables**: TanStack Table
- **CSV**: PapaParse
- **Dates**: date-fns

## 🔐 Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Variables de entorno para credenciales
- Validación de datos en servidor
- Sin datos sensibles en cliente

## 🚧 Próximos Desarrollos

- [ ] Dashboard completo con charts
- [ ] Página de gestión de clientes
- [ ] Interfaz de importación CSV
- [ ] Vista de tendencias temporales
- [ ] Edición inline de fees mensuales
- [ ] Exportación de reportes a PDF
- [ ] Filtros avanzados por categoría/empleado
- [ ] Multi-tenancy (organizaciones)

## 📝 Licencia

Privado - Desarrollo para Guinda Marketing

## 👨‍💻 Desarrollado por

Antigravity AI - Asistente de desarrollo de Google DeepMind

---

**¿Necesitas ayuda?** Revisa el archivo `implementation_plan.md` para más detalles técnicos.
