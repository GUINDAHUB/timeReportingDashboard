# 🚀 EMPIEZA AQUÍ - Guía Rápida (5 minutos)

> **¿Primera vez?** Sigue esta guía paso a paso para activar la seguridad.

---

## ⏱️ Solo 3 Pasos - 5 Minutos Total

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  PASO 1: Crear Usuario      → 2 minutos        │
│  PASO 2: Probar Localmente  → 2 minutos        │
│  PASO 3: Desplegar          → 1 minuto         │
│                                                 │
│  ✅ Total: 5 minutos                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📝 PASO 1: Crear Usuario en Supabase (2 min)

### 1.1 Accede a Supabase

```
🌐 https://app.supabase.com
```

### 1.2 Navega a tu proyecto

```
Proyecto: cureyzvozlueuetlthmb
└── Authentication
    └── Users
        └── "Add user" button
```

### 1.3 Completa el formulario

```
┌─────────────────────────────────────┐
│  Create new user                    │
│                                     │
│  Email:                             │
│  ┌─────────────────────────────┐   │
│  │ admin@guinda.com            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Password:                          │
│  ┌─────────────────────────────┐   │
│  │ ••••••••••••                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ☑️ Auto Confirm User ← ¡ACTIVAR!  │
│                                     │
│  [ Create user ]                    │
│                                     │
└─────────────────────────────────────┘
```

⚠️ **MUY IMPORTANTE**: Activa "Auto Confirm User" o no podrás hacer login.

### 1.4 Confirmar

Deberías ver:

```
✅ User created successfully
```

---

## 🧪 PASO 2: Probar Localmente (2 min)

### 2.1 Iniciar servidor

```bash
cd /Users/javiermonteromartinez/Documents/GUINDA/APPS/timeReportingDashboard
npm run dev
```

Deberías ver:

```
✓ Ready in 2s
○ Local:        http://localhost:3000
```

### 2.2 Abrir navegador

```
🌐 http://localhost:3000
```

**¿Qué debería pasar?**

```
┌─────────────────────────────────┐
│  ↪️  Redirección automática     │
│                                 │
│  http://localhost:3000          │
│           ↓                     │
│  http://localhost:3000/login    │
│                                 │
└─────────────────────────────────┘
```

### 2.3 Hacer Login

```
┌─────────────────────────────────┐
│  🔒 Guinda Time Tracking        │
│                                 │
│  Email:                         │
│  [admin@guinda.com        ]     │
│                                 │
│  Contraseña:                    │
│  [•••••••••••••••••••••••]     │
│                                 │
│  [ Iniciar Sesión ]             │
│                                 │
└─────────────────────────────────┘
```

**Resultado esperado:**

```
✅ Toast: "Sesión iniciada correctamente"
↪️  Redirección a: http://localhost:3000/
```

### 2.4 Probar Logout

```
Navbar → Botón "Salir" (rojo) → Click
```

**Resultado esperado:**

```
✅ Toast: "Sesión cerrada correctamente"
↪️  Redirección a: http://localhost:3000/login
```

### 2.5 Probar Rate Limiting

Haz **6 intentos** de login con contraseña incorrecta:

```
Intento 1: ❌ Credenciales inválidas
Intento 2: ❌ Credenciales inválidas
Intento 3: ❌ Credenciales inválidas
Intento 4: ❌ Credenciales inválidas
Intento 5: ❌ Credenciales inválidas
Intento 6: 🚫 Demasiados intentos fallidos. Espera 15 minutos.
```

**Si ves el error 429 en el intento 6 → ✅ Rate limiting funciona!**

Para resetear: `Ctrl+C` en terminal y `npm run dev` de nuevo.

---

## 🚀 PASO 3: Desplegar en Vercel (1 min)

### 3.1 Configurar Variables de Entorno

**En Vercel Dashboard:**

```
Tu Proyecto → Settings → Environment Variables
```

**Añade estas variables:**

```env
NEXT_PUBLIC_SUPABASE_URL
https://cureyzvozlueuetlthmb.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cmV5enZvemx1ZXVldGx0aG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTAzNTMsImV4cCI6MjA4NTY4NjM1M30.1g90N9FueNdnJZnfulszKIW9TyxBn52gcGrctN7sG1I

NEXT_PUBLIC_DEFAULT_COST_PER_HOUR
30

NEXT_PUBLIC_CURRENCY
EUR
```

### 3.2 Push y Deploy

```bash
git add .
git commit -m "feat: Sistema de autenticación implementado"
git push
```

Vercel desplegará automáticamente.

### 3.3 Verificar en Producción

```
🌐 https://tu-dominio.vercel.app
```

**Checklist:**

- [ ] Redirige a `/login`
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Acceso sin sesión → redirige a login

---

## ✅ Verificación Final

### Checklist Completo

```
Desarrollo Local:
├─ [x] Usuario creado en Supabase
├─ [x] "Auto Confirm User" activado
├─ [x] npm run dev funciona
├─ [x] Redirige a /login sin sesión
├─ [x] Login exitoso
├─ [x] Logout funciona
├─ [x] Rate limiting funciona (6 intentos)
└─ [x] Todo funciona localmente

Producción:
├─ [x] Variables configuradas en Vercel
├─ [x] Deploy exitoso
├─ [x] Login funciona en producción
├─ [x] Logout funciona en producción
└─ [x] Verificar headers (ver abajo)
```

### Verificar Headers HTTP

```bash
curl -I https://tu-dominio.vercel.app
```

**Busca estos headers:**

```http
HTTP/2 200
x-robots-tag: noindex, nofollow, noarchive, nosnippet
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
```

---

## 🎉 ¡Completado!

Si todos los checkboxes están marcados:

```
╔═══════════════════════════════════════╗
║                                       ║
║   ✅ SISTEMA DE SEGURIDAD ACTIVO     ║
║                                       ║
║   🔒 Login obligatorio                ║
║   🛡️  Protección anti-fuerza bruta    ║
║   🚫 No indexable por buscadores      ║
║   🔐 Headers de seguridad             ║
║                                       ║
║   ✨ ¡Lista para usar en producción! ║
║                                       ║
╚═══════════════════════════════════════╝
```

---

## 📚 ¿Necesitas Más Info?

- **Guía rápida**: `INSTRUCCIONES_LOGIN.md`
- **Documentación completa**: `SEGURIDAD.md`
- **Resumen ejecutivo**: `README_SEGURIDAD.md`
- **Lista de cambios**: `CHANGELOG_SEGURIDAD.md`

---

## 🆘 Problemas Comunes

### ❌ "Credenciales inválidas"

**Solución:**
1. Verifica que el email sea exacto
2. Asegúrate de que activaste "Auto Confirm User"
3. Prueba resetear la contraseña desde Supabase Dashboard

### ❌ No redirige a login

**Solución:**
1. Limpia caché: `Ctrl+Shift+Del`
2. Prueba en ventana incógnito
3. Reinicia el servidor: `Ctrl+C` → `npm run dev`

### ❌ "Demasiados intentos" (sin fallar 5 veces)

**Solución:**
1. Reinicia el servidor (rate limiting está en memoria)
2. O espera 15 minutos

### ❌ Build falla en Vercel

**Solución:**
1. Verifica que todas las variables de entorno estén configuradas
2. Chequea los logs en Vercel Dashboard
3. Prueba `npm run build` localmente

---

## 🎯 Objetivo Logrado

```
ANTES:
❌ Acceso público
❌ Sin autenticación
❌ Indexable en Google
❌ Sin protección

AHORA:
✅ Acceso restringido
✅ Login obligatorio
✅ No indexable
✅ Protegido contra ataques
✅ Cookies seguras
✅ Headers de seguridad
```

---

## 📊 Métricas de Seguridad

| Categoría | Estado |
|-----------|--------|
| Autenticación | 🟢 Activa |
| Rate Limiting | 🟢 Activo |
| No-Indexación | 🟢 Activa |
| Cookies Seguras | 🟢 HTTP-only |
| Headers | 🟢 Configurados |
| **NIVEL GLOBAL** | 🟢 **SEGURO** |

---

**¡Tu aplicación está completamente protegida y lista para producción!** 🚀🔒

---

**Creado**: 2026-02-16  
**Versión**: 1.0.0  
**Tiempo total**: ~5 minutos
