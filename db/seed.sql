-- ============================================================
-- SEED - Datos iniciales para desarrollo/pruebas
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

USE mil_variedades;

-- --- Roles ---
INSERT INTO rol (nombre, descripcion) VALUES
('super_admin', 'Control total del sistema'),
('admin', 'Gestión diaria del catálogo');

-- --- Usuario Super Administrador de prueba ---
-- IMPORTANTE: reemplaza <HASH_AQUI> por el resultado real de
-- db/generar-hash.js antes de ejecutar este archivo.
-- NUNCA dejes una contraseña de verdad en este archivo.
INSERT INTO usuario (nombre, correo, contrasena, id_rol, estado) VALUES
   ('Juan Castañeda', 'admin@milvariedades.com', '$2b$10$oG/oJR.jFnaKGis26s3uweMnpKrnqxwb7.DsEqaK3ioKlJTH.dXhO', 1, 1);

-- --- Categorías de ejemplo ---
INSERT INTO categoria (nombre, descripcion, estado) VALUES
('Papelería', 'Cuadernos, lapiceros, hojas y útiles de oficina', 1),
('Útiles Escolares', 'Morrales, cartucheras y material escolar', 1),
('Aseo y Limpieza', 'Productos de limpieza para el hogar', 1);

-- --- Productos de ejemplo ---
INSERT INTO producto (nombre, descripcion, precio, id_categoria, estado) VALUES
('Cuaderno Rayado Norma 100 Hojas', 'Cuaderno cosido, hojas rayadas', 8900.00, 1, 1),
('Lapicero Negro Faber Castell', 'Punta fina, tinta negra', 1500.00, 1, 1),
('Resaltador x4 Stabilo', 'Colores surtidos, punta biselada', 6500.00, 1, 1),
('Detergente Líquido Fab 1 Litro', 'Para ropa, aroma fresco', 7900.00, 3, 1);

-- --- Stock inicial (uno por producto, coincide con los ids de arriba) ---
INSERT INTO stock (id_producto, cantidad, estado) VALUES
(1, 25, 1),
(2, 60, 1),
(3, 40, 1),
(4, 15, 1);

-- --- Configuración general del sistema ---
INSERT INTO configuracion_sistema (nombre, valor, descripcion) VALUES
('whatsapp_numero', '573001234567', 'Número de WhatsApp del negocio'),
('whatsapp_mensaje_default', 'Hola, estoy interesado en un producto de Mil Variedades', 'Mensaje predefinido del botón de contacto'),
('nombre_negocio', 'Mil Variedades', 'Nombre comercial mostrado en el sitio');
