-- ============================================================
-- Script 005: Tabla de empresas (clientes / proveedores)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Crear tabla companies
CREATE TABLE IF NOT EXISTS companies (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  cuit          text,
  email         text,
  phone         text,
  address       text,
  is_supplier   boolean     NOT NULL DEFAULT false,
  is_client     boolean     NOT NULL DEFAULT false,
  is_active     boolean     NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_companies_name      ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- 3. RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado
CREATE POLICY "Authenticated users can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Alta: operador y admin
CREATE POLICY "Operators and admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Edición / desactivación: cualquier usuario autenticado (admin filtra en la UI)
CREATE POLICY "Authenticated users can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (true);

-- 4. Agregar columna company_id a weighings (nullable, sin romper datos existentes)
ALTER TABLE weighings
  ADD COLUMN IF NOT EXISTS company_id uuid
    REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weighings_company_id ON weighings(company_id);

-- 5. (Opcional) Migrar datos existentes de company (texto) a companies
--    Descomentar y ajustar si querés migrar los registros históricos:
--
-- INSERT INTO companies (name, is_supplier, is_client)
-- SELECT DISTINCT company, true, true
-- FROM weighings
-- WHERE company IS NOT NULL AND company != ''
-- ON CONFLICT DO NOTHING;
--
-- UPDATE weighings w
-- SET company_id = c.id
-- FROM companies c
-- WHERE w.company = c.name AND w.company_id IS NULL;
