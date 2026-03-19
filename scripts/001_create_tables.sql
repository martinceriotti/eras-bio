-- =====================================================
-- Sistema de Control de Inventarios - Planta Biodiesel ERA S.A.
-- Script 001: Creación de Tablas Principales
-- =====================================================

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'general' CHECK (role IN ('operador', 'general', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de tanques configurables
CREATE TABLE IF NOT EXISTS public.tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  capacity_liters DECIMAL(12,2),
  material_type TEXT NOT NULL CHECK (material_type IN (
    'aceite_crudo', 'aceite_neutro', 'biodiesel', 'glicerina', 
    'metanol', 'soda', 'acido_clorhidrico', 'acido_fosforico',
    'metilato', 'antioxidante', 'acido_citrico', 'gomas', 'glp', 'repro', 'otros'
  )),
  density DECIMAL(6,4) DEFAULT 0.92,
  unit TEXT NOT NULL DEFAULT 'liters' CHECK (unit IN ('liters', 'bags', 'percentage')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de lecturas de stock diarias
CREATE TABLE IF NOT EXISTS public.stock_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  value DECIMAL(12,2) NOT NULL, -- valor en la unidad del tanque
  value_kg DECIMAL(12,2), -- valor convertido a kg (calculado)
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tank_id, reading_date)
);

-- Tabla de lecturas de caudalímetro
CREATE TABLE IF NOT EXISTS public.flowmeter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_date DATE NOT NULL UNIQUE,
  accumulated_value DECIMAL(14,2) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de productos para pesadas
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('recepcion', 'despacho', 'ambos')),
  unit TEXT NOT NULL DEFAULT 'tn' CHECK (unit IN ('tn', 'bags', 'kg')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pesadas de balanza
CREATE TABLE IF NOT EXISTS public.weighings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recepcion', 'despacho')),
  product_id UUID NOT NULL REFERENCES public.products(id),
  company TEXT,
  remito_number TEXT,
  driver TEXT,
  license_plate TEXT,
  weight_gross DECIMAL(10,2),
  weight_tare DECIMAL(10,2),
  weight_net DECIMAL(10,2) NOT NULL, -- peso neto en toneladas
  observations TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cierre diario (validación)
CREATE TABLE IF NOT EXISTS public.daily_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  stocks_complete BOOLEAN DEFAULT FALSE,
  weighings_complete BOOLEAN DEFAULT FALSE,
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de densidades configurables (para admin)
CREATE TABLE IF NOT EXISTS public.densities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL UNIQUE,
  density_value DECIMAL(6,4) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_stock_readings_date ON public.stock_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_stock_readings_tank ON public.stock_readings(tank_id);
CREATE INDEX IF NOT EXISTS idx_weighings_date ON public.weighings(date);
CREATE INDEX IF NOT EXISTS idx_weighings_type ON public.weighings(type);
CREATE INDEX IF NOT EXISTS idx_flowmeter_date ON public.flowmeter_readings(reading_date);
