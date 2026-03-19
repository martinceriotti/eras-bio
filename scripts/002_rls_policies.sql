-- =====================================================
-- Sistema de Control de Inventarios - Planta Biodiesel ERA S.A.
-- Script 002: Row Level Security Policies
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowmeter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weighings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.densities ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- TANKS (lectura para todos, escritura solo admin)
-- =====================================================
CREATE POLICY "tanks_select_authenticated" ON public.tanks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tanks_insert_admin" ON public.tanks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "tanks_update_admin" ON public.tanks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "tanks_delete_admin" ON public.tanks
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- STOCK_READINGS (operador y admin pueden escribir)
-- =====================================================
CREATE POLICY "stock_readings_select_authenticated" ON public.stock_readings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_readings_insert_operador_admin" ON public.stock_readings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
  );

CREATE POLICY "stock_readings_update_admin" ON public.stock_readings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "stock_readings_delete_admin" ON public.stock_readings
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- FLOWMETER_READINGS
-- =====================================================
CREATE POLICY "flowmeter_select_authenticated" ON public.flowmeter_readings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "flowmeter_insert_operador_admin" ON public.flowmeter_readings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
  );

CREATE POLICY "flowmeter_update_admin" ON public.flowmeter_readings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- PRODUCTS
-- =====================================================
CREATE POLICY "products_select_authenticated" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- WEIGHINGS
-- =====================================================
CREATE POLICY "weighings_select_authenticated" ON public.weighings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "weighings_insert_operador_admin" ON public.weighings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
  );

CREATE POLICY "weighings_update_admin" ON public.weighings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "weighings_delete_admin" ON public.weighings
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- DAILY_CLOSURES
-- =====================================================
CREATE POLICY "closures_select_authenticated" ON public.daily_closures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "closures_insert_operador_admin" ON public.daily_closures
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
  );

CREATE POLICY "closures_update_operador_admin" ON public.daily_closures
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operador', 'admin'))
  );

-- =====================================================
-- DENSITIES
-- =====================================================
CREATE POLICY "densities_select_authenticated" ON public.densities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "densities_insert_admin" ON public.densities
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "densities_update_admin" ON public.densities
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
