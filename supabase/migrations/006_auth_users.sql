-- Migración 006: Configuración de usuarios para autenticación
-- Esta migración NO crea usuarios (eso se hace manualmente desde Supabase Dashboard)
-- Solo documenta el proceso y asegura que la configuración de auth está correcta

-- ============================================================================
-- IMPORTANTE: CÓMO CREAR USUARIOS
-- ============================================================================
-- Los usuarios deben crearse desde Supabase Dashboard:
--
-- 1. Ve a: Authentication > Users en Supabase Dashboard
-- 2. Click en "Add user" > "Create new user"
-- 3. Ingresa:
--    - Email: el email del usuario (ej: admin@guinda.com)
--    - Password: una contraseña segura (mínimo 8 caracteres)
--    - Auto Confirm User: activar esta opción
-- 4. Click en "Create user"
--
-- ALTERNATIVA: Desde SQL (requiere service_role key):
-- 
-- Para crear un usuario desde SQL, necesitas ejecutar esto con permisos de service_role:
-- 
-- INSERT INTO auth.users (
--     instance_id,
--     id,
--     aud,
--     role,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     recovery_sent_at,
--     last_sign_in_at,
--     raw_app_meta_data,
--     raw_user_meta_data,
--     created_at,
--     updated_at,
--     confirmation_token,
--     email_change,
--     email_change_token_new,
--     recovery_token
-- ) VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     gen_random_uuid(),
--     'authenticated',
--     'authenticated',
--     'admin@guinda.com',
--     crypt('TU_PASSWORD_AQUI', gen_salt('bf')), -- Cambia TU_PASSWORD_AQUI
--     NOW(),
--     NOW(),
--     NOW(),
--     '{"provider":"email","providers":["email"]}',
--     '{}',
--     NOW(),
--     NOW(),
--     '',
--     '',
--     '',
--     ''
-- );
--
-- ============================================================================

-- Verificar que la tabla de usuarios existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'auth' 
        AND tablename = 'users'
    ) THEN
        RAISE EXCEPTION 'La tabla auth.users no existe. Asegúrate de que Supabase Auth está habilitado.';
    END IF;
END $$;

-- Crear índice en email si no existe (optimización)
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);

-- Comentario para documentación
COMMENT ON TABLE auth.users IS 'Tabla de usuarios de Supabase Auth. Crear usuarios desde Dashboard o con permisos de service_role.';
