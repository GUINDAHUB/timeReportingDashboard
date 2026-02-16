# 🔒 Configuración de Seguridad

Este documento explica la configuración de seguridad implementada en la aplicación.

## 📋 Características de Seguridad

### 1. Autenticación Obligatoria
- ✅ Todas las rutas requieren autenticación excepto `/login`
- ✅ Sesiones gestionadas por Supabase Auth
- ✅ Cookies HTTP-only y secure en producción

### 2. Protección contra Fuerza Bruta
- ✅ Máximo 5 intentos de login fallidos por IP
- ✅ Bloqueo automático de 15 minutos después de 5 fallos
- ✅ Rate limiting implementado en memoria (middleware)
- ✅ Limpieza automática de registros antiguos

### 3. No Indexación por Buscadores
- ✅ Meta tags `noindex, nofollow` en todas las páginas
- ✅ Headers `X-Robots-Tag` en todas las respuestas
- ✅ Configuración en `next.config.js` y `layout.tsx`

### 4. Headers de Seguridad
- `X-Robots-Tag`: noindex, nofollow, noarchive, nosnippet
- `X-Frame-Options`: DENY (previene clickjacking)
- `X-Content-Type-Options`: nosniff (previene MIME sniffing)
- `Referrer-Policy`: strict-origin-when-cross-origin

## 🔑 Crear Usuarios

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Accede a tu proyecto en [https://app.supabase.com](https://app.supabase.com)
2. Ve a **Authentication** > **Users**
3. Click en **"Add user"** > **"Create new user"**
4. Completa:
   - **Email**: el email del usuario (ej: `admin@guinda.com`)
   - **Password**: contraseña segura (mínimo 8 caracteres)
   - **Auto Confirm User**: ✅ Activar
5. Click en **"Create user"**

### Opción 2: Desde SQL Editor (Avanzado)

Si necesitas crear usuarios desde SQL:

```sql
-- Ejecutar en Supabase SQL Editor
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'tu-email@ejemplo.com', -- CAMBIAR
    crypt('TuPasswordSeguro123', gen_salt('bf')), -- CAMBIAR
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);
```

⚠️ **Importante**: Cambia `tu-email@ejemplo.com` y `TuPasswordSeguro123` por valores reales.

## 🚀 Despliegue en Vercel

### Variables de Entorno Requeridas

Configura estas variables en Vercel Dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_DEFAULT_COST_PER_HOUR=30
NEXT_PUBLIC_CURRENCY=EUR
```

### Pasos para Desplegar

1. **Push a tu repositorio**:
```bash
git add .
git commit -m "Añadida autenticación y seguridad"
git push
```

2. **Conecta con Vercel**:
   - Ve a [vercel.com](https://vercel.com)
   - Import tu repositorio
   - Añade las variables de entorno

3. **Verifica la seguridad**:
   - ✅ Intenta acceder sin login → deberías ser redirigido a `/login`
   - ✅ Intenta 6 logins fallidos → deberías recibir error 429
   - ✅ Busca tu sitio en Google → no debería aparecer
   - ✅ Verifica headers con: `curl -I https://tu-dominio.vercel.app`

## 🛡️ Buenas Prácticas

### Contraseñas Seguras
- Mínimo 12 caracteres
- Combinar mayúsculas, minúsculas, números y símbolos
- No usar palabras del diccionario
- Ejemplo: `G#7mK!p2Qx9@vN4z`

### Gestión de Accesos
- ✅ Crea usuarios únicos para cada persona del equipo
- ✅ Nunca compartas contraseñas
- ✅ Revoca accesos cuando alguien deja el equipo
- ✅ Cambia contraseñas periódicamente

### Monitoreo
- Revisa logs de Supabase Auth periódicamente
- Verifica intentos de login fallidos
- Monitorea el uso de la aplicación

## 🔧 Mantenimiento

### Cambiar Contraseña de un Usuario

Desde Supabase Dashboard:
1. **Authentication** > **Users**
2. Click en el usuario
3. **Reset Password**
4. Envía link de reset o establece nueva contraseña

### Eliminar un Usuario

```sql
-- Desde Supabase SQL Editor
DELETE FROM auth.users WHERE email = 'usuario@ejemplo.com';
```

### Ver Intentos de Login Fallidos

Los intentos fallidos se registran en memoria del servidor. Para monitoreo más avanzado, considera:
- Integrar con servicios como Sentry o LogRocket
- Configurar alertas en Vercel Analytics
- Implementar logging en base de datos

## 📞 Soporte

Si tienes problemas con la autenticación:
1. Verifica que las variables de entorno están correctas
2. Confirma que el usuario está creado y confirmado en Supabase
3. Revisa la consola del navegador (F12) para errores
4. Verifica los logs de Vercel

## 🔄 Arquitectura de Autenticación

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  Middleware     │─────▶│  Supabase    │
│  (Rate Limit)   │◀─────│  Auth        │
└─────────┬───────┘      └──────────────┘
          │
          ▼
┌─────────────────┐
│  Protected      │
│  Pages/APIs     │
└─────────────────┘
```

**Flujo de autenticación**:
1. Usuario intenta acceder a cualquier página
2. Middleware verifica si hay sesión válida
3. Si no hay sesión → redirige a `/login`
4. Usuario hace login → Supabase Auth valida
5. Se crean cookies de sesión seguras
6. Middleware permite acceso a la aplicación

## 🎯 Checklist de Seguridad

Antes de producción, verifica:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Al menos un usuario admin creado en Supabase
- [ ] Login funciona correctamente
- [ ] Logout funciona correctamente
- [ ] Rate limiting funciona (prueba 6 intentos fallidos)
- [ ] Redirección a login funciona sin sesión
- [ ] Headers de no-indexación presentes
- [ ] Cookies son HTTP-only y secure
- [ ] No hay errores en consola del navegador
- [ ] No hay warnings de TypeScript

---

**Última actualización**: 2026-02-16
**Versión**: 1.0.0
