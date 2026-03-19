-- =====================================================
-- Sistema de Control de Inventarios - Planta Biodiesel ERA S.A.
-- Script 004: Trigger para auto-crear perfil en signup
-- =====================================================

-- Función que se ejecuta al crear un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'general')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger que se dispara al insertar un nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
