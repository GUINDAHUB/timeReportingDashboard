# 🚀 Instrucciones Rápidas - Sistema de Login

## 📝 Pasos para Activar el Login

### 1. Crear Usuario en Supabase (¡IMPORTANTE!)

**Ve a Supabase Dashboard:**
1. Abre [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto (`cureyzvozlueuetlthmb`)
3. Ve a **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Completa:
   - **Email**: `admin@guinda.com` (o el que prefieras)
   - **Password**: una contraseña segura
   - **Auto Confirm User**: ✅ **ACTIVAR ESTO** (muy importante)
6. Click **"Create user"**

### 2. Probar Localmente

```bash
# Instalar dependencias si no lo has hecho
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### 3. Acceder a la Aplicación

1. Abre [http://localhost:3000](http://localhost:3000)
2. Deberías ser **redirigido automáticamente** a `/login`
3. Introduce el email y contraseña que creaste
4. Click en "Iniciar Sesión"

### 4. Verificar Seguridad

**Probar Rate Limiting:**
- Intenta hacer login 5 veces con contraseña incorrecta
- En el 6º intento deberías ver: "Demasiados intentos fallidos..."
- Espera 15 minutos o reinicia el servidor para resetear

**Verificar Redirección:**
- Cierra sesión (botón "Salir" en el navbar)
- Intenta acceder a cualquier página (ej: `/dashboard`)
- Deberías ser redirigido a `/login`

**Verificar Headers de No-Indexación:**
```bash
# Con el servidor corriendo
curl -I http://localhost:3000

# Deberías ver estos headers:
# X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

## 🔒 Lo que se ha Implementado

✅ **Middleware de Autenticación**
- Protege TODAS las rutas excepto `/login`
- Usa Supabase Auth con cookies HTTP-only
- Redirige automáticamente si no hay sesión

✅ **Protección contra Fuerza Bruta**
- Máximo 5 intentos fallidos por IP
- Bloqueo de 15 minutos
- Rate limiting en memoria (se resetea al reiniciar)

✅ **Anti-Indexación Completa**
- Meta tags en todas las páginas
- Headers HTTP en todas las respuestas
- robots.txt bloqueado
- Google y otros buscadores NO podrán indexar el sitio

✅ **Headers de Seguridad**
- X-Frame-Options (previene clickjacking)
- X-Content-Type-Options (previene MIME sniffing)
- Referrer-Policy
- X-Robots-Tag

## 🚀 Desplegar en Vercel

### Paso 1: Asegurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://cureyzvozlueuetlthmb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_DEFAULT_COST_PER_HOUR=30
NEXT_PUBLIC_CURRENCY=EUR
```

### Paso 2: Deploy

```bash
# Opción 1: Conectar GitHub/GitLab con Vercel (automático)
# - Push a tu repo
# - Vercel despliega automáticamente

# Opción 2: Deploy manual
vercel --prod
```

### Paso 3: Verificar en Producción

1. Accede a tu dominio (ej: `https://tu-app.vercel.app`)
2. Deberías ser redirigido a `/login`
3. Haz login con el usuario que creaste
4. Verifica que todo funciona

### Paso 4: Verificar No-Indexación

```bash
# Verificar robots.txt
curl https://tu-app.vercel.app/robots.txt

# Verificar headers
curl -I https://tu-app.vercel.app

# Intentar buscar en Google (después de unos días)
# NO debería aparecer en resultados
```

## ❓ Problemas Comunes

### "Credenciales inválidas"
- ✅ Verifica que el email sea correcto
- ✅ Verifica que marcaste "Auto Confirm User" en Supabase
- ✅ Intenta resetear la contraseña desde Supabase Dashboard

### "No se pudo crear la sesión"
- ✅ Verifica variables de entorno en `.env.local`
- ✅ Reinicia el servidor de desarrollo
- ✅ Verifica que Supabase esté funcionando

### "Demasiados intentos fallidos" (y no has intentado 5 veces)
- ✅ Reinicia el servidor (el rate limiting está en memoria)
- ✅ Espera 15 minutos
- ✅ Cambia de red/IP si es urgente

### No redirige a login
- ✅ Verifica que `middleware.ts` existe en la raíz
- ✅ Limpia caché del navegador (Ctrl+Shift+Del)
- ✅ Prueba en ventana incógnito

## 📞 Soporte

Ver documentación completa en `SEGURIDAD.md`

## 🎯 Checklist Pre-Producción

- [ ] Usuario admin creado en Supabase
- [ ] Login funciona localmente
- [ ] Logout funciona
- [ ] Rate limiting funciona (5 intentos fallidos)
- [ ] Headers de seguridad presentes
- [ ] robots.txt bloqueado
- [ ] Variables de entorno en Vercel configuradas
- [ ] Deploy exitoso en Vercel
- [ ] Login funciona en producción

---

**¡Listo!** Tu aplicación ahora está completamente protegida y no será indexada por buscadores. 🔒
