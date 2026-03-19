-- =====================================================
-- Sistema de Control de Inventarios - Planta Biodiesel ERA S.A.
-- Script 003: Seed de Tanques según especificación
-- =====================================================

-- Aceites
INSERT INTO public.tanks (code, name, capacity_liters, material_type, density, unit, display_order) VALUES
('TKM01', 'Aceite Neutro 60m³', 60000, 'aceite_neutro', 0.92, 'liters', 1),
('TKM02', 'Aceite Neutro 40m³', 40000, 'aceite_neutro', 0.92, 'liters', 2),
('TKM03', 'Aceite Crudo 120m³', 120000, 'aceite_crudo', 0.92, 'liters', 3),
('TKM06', 'Aceite Crudo 40m³ H', 40000, 'aceite_crudo', 0.92, 'liters', 4),
('TKM08', 'REPRO', NULL, 'repro', 0.92, 'liters', 5),
('TMP09', 'TMP09 475m³', 475000, 'aceite_crudo', 0.92, 'liters', 6);

-- Gomas
INSERT INTO public.tanks (code, name, capacity_liters, material_type, density, unit, display_order) VALUES
('TKM05', 'Gomas 40m³', 40000, 'gomas', 0.92, 'liters', 7);

-- Químicos
INSERT INTO public.tanks (code, name, capacity_liters, material_type, density, unit, display_order) VALUES
('TK-SODA', 'Soda Cáustica', NULL, 'soda', 1.52, 'liters', 10),
('TK-METANOL', 'Metanol', NULL, 'metanol', 0.79, 'liters', 11),
('TK-HCL', 'Ácido Clorhídrico', NULL, 'acido_clorhidrico', 1.18, 'liters', 12),
('TK-METILATO', 'Metilato de Sodio', NULL, 'metilato', 0.95, 'liters', 13),
('TK-H3PO4', 'Ácido Fosfórico', NULL, 'acido_fosforico', 1.69, 'liters', 14),
('TP-ANTIOXI', 'Antioxidante Base TBHQ', NULL, 'antioxidante', 1.0, 'liters', 15),
('AC-CITRICO', 'Ácido Cítrico', NULL, 'acido_citrico', 1.0, 'bags', 16);

-- Glicerina
INSERT INTO public.tanks (code, name, capacity_liters, material_type, density, unit, display_order) VALUES
('TK-GLICE', 'Glicerina', NULL, 'glicerina', 1.26, 'liters', 20);

-- GLP (% de llenado)
INSERT INTO public.tanks (code, name, capacity_liters, material_type, density, unit, display_order) VALUES
('GLP-1', 'GLP Tanque 1', 7600, 'glp', 0.51, 'percentage', 30),
('GLP-2', 'GLP Tanque 2', 7600, 'glp', 0.51, 'percentage', 31),
('GLP-3', 'GLP Tanque 3', 7600, 'glp', 0.51, 'percentage', 32),
('GLP-4', 'GLP Tanque 4', 7600, 'glp', 0.51, 'percentage', 33);

-- Biodiesel
INSERT INTO public.tanks (code, name, capacity_liters, material_type, density, unit, display_order) VALUES
('TPT02', 'Biodiesel TPT02', NULL, 'biodiesel', 0.88, 'liters', 40),
('TPT03', 'Biodiesel TPT03', NULL, 'biodiesel', 0.88, 'liters', 41),
('TPT04', 'Biodiesel TPT04', NULL, 'biodiesel', 0.88, 'liters', 42),
('TPT05', 'Biodiesel TPT05', NULL, 'biodiesel', 0.88, 'liters', 43);

-- =====================================================
-- Seed de Productos para Balanza
-- =====================================================
INSERT INTO public.products (name, category, unit) VALUES
-- Recepciones
('Aceite Crudo', 'recepcion', 'tn'),
('Metanol', 'recepcion', 'tn'),
('Soda Cáustica', 'recepcion', 'tn'),
('Ácido Clorhídrico', 'recepcion', 'tn'),
('Ácido Fosfórico', 'recepcion', 'tn'),
('Metilato de Sodio', 'recepcion', 'tn'),
('Antioxidante', 'recepcion', 'tn'),
('Ácido Cítrico', 'recepcion', 'bags'),
('GLP', 'recepcion', 'tn'),

-- Despachos
('Biodiesel', 'despacho', 'tn'),
('Glicerina', 'despacho', 'tn'),
('Borras', 'despacho', 'tn'),
('Aceite Neutro', 'ambos', 'tn'),
('Ácidos Grasos', 'despacho', 'tn'),
('Gomas', 'despacho', 'tn');

-- =====================================================
-- Seed de Densidades por defecto
-- =====================================================
INSERT INTO public.densities (material_type, density_value, description) VALUES
('aceite_crudo', 0.92, 'Aceite crudo de soja'),
('aceite_neutro', 0.92, 'Aceite neutro refinado'),
('biodiesel', 0.88, 'Biodiesel B100'),
('glicerina', 1.26, 'Glicerina bruta'),
('metanol', 0.79, 'Metanol industrial'),
('soda', 1.52, 'Soda cáustica líquida'),
('acido_clorhidrico', 1.18, 'Ácido clorhídrico'),
('acido_fosforico', 1.69, 'Ácido fosfórico'),
('metilato', 0.95, 'Metilato de sodio'),
('antioxidante', 1.0, 'Antioxidante TBHQ'),
('glp', 0.51, 'Gas licuado de petróleo'),
('gomas', 0.92, 'Gomas de aceite');
