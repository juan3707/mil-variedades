-- ============================================================
-- SCHEMA DE BASE DE DATOS - SICMV (Mil Variedades)
-- Traducción directa del MER definido en el análisis del proyecto.
-- Ejecutar UNA sola vez sobre una base de datos vacía.
-- ============================================================

USE mil_variedades;

-- ------------------------------------------------------------
-- TABLA: rol
-- Define los roles del sistema (Super Administrador, Administrador).
-- El "Usuario" visitante NO se guarda aquí porque no inicia sesión.
-- ------------------------------------------------------------
CREATE TABLE rol (
    id_rol      INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL
);

-- ------------------------------------------------------------
-- TABLA: usuario
-- Solo Administradores y Super Administradores tienen fila aquí.
-- La contraseña NUNCA se guarda en texto plano: siempre hash (bcrypt).
-- ------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    correo       VARCHAR(100) NOT NULL UNIQUE,
    contrasena   VARCHAR(255) NOT NULL, -- aquí va el HASH, no el texto real
    id_rol       INT NOT NULL,
    estado       TINYINT(1) NOT NULL DEFAULT 1, -- 1 = activo, 0 = bloqueado
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT -- no se puede borrar un rol si tiene usuarios
);

-- ------------------------------------------------------------
-- TABLA: categoria
-- "estado" permite desactivar una categoría sin borrarla
-- (soft delete: nunca se pierde el historial).
-- ------------------------------------------------------------
CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  VARCHAR(255) NULL,
    estado       TINYINT(1) NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------
-- TABLA: producto
-- Núcleo del catálogo. DECIMAL(10,2) para precio: nunca usar FLOAT
-- con dinero, porque FLOAT redondea mal (ej: 19.99 puede guardar 19.988...).
-- ------------------------------------------------------------
CREATE TABLE producto (
    id_producto    INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    TEXT NULL,
    precio         DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    id_categoria   INT NOT NULL,
    estado         TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_producto_categoria
        FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
        ON UPDATE CASCADE
        ON DELETE RESTRICT -- no se puede borrar una categoría con productos
);

-- Índice para acelerar los filtros por categoría en el catálogo (RF-008)
CREATE INDEX idx_producto_categoria ON producto(id_categoria);

-- Índice para acelerar la búsqueda por nombre (RF-007)
CREATE INDEX idx_producto_nombre ON producto(nombre);

-- ------------------------------------------------------------
-- TABLA: imagen_producto
-- Un producto puede tener varias imágenes; "orden" define cuál se
-- muestra primero (la portada), "estado" permite ocultar una imagen
-- puntual sin borrar el archivo.
-- ------------------------------------------------------------
CREATE TABLE imagen_producto (
    id_imagen   INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    url_imagen  VARCHAR(255) NOT NULL, -- ej: /uploads/productos/cuaderno-123.jpg
    orden       INT NOT NULL DEFAULT 0,
    estado      TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT fk_imagen_producto
        FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
        ON UPDATE CASCADE
        ON DELETE CASCADE -- si el producto se borra físicamente, sus imágenes también
);

CREATE INDEX idx_imagen_producto ON imagen_producto(id_producto);

-- ------------------------------------------------------------
-- TABLA: stock
-- Relación 1 a 1 con producto: por eso id_producto es UNIQUE aquí.
-- ------------------------------------------------------------
CREATE TABLE stock (
    id_stock          INT AUTO_INCREMENT PRIMARY KEY,
    id_producto        INT NOT NULL UNIQUE, -- UNIQUE = garantiza 1 a 1
    cantidad           INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    estado             TINYINT(1) NOT NULL DEFAULT 1,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_producto
        FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: configuracion_sistema
-- Pares clave-valor para parámetros generales
-- (ej: número de WhatsApp, mensaje predefinido, nombre del negocio).
-- Solo el Super Administrador la edita (se controla en el backend).
-- ------------------------------------------------------------
CREATE TABLE configuracion_sistema (
    id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL UNIQUE,
    valor            VARCHAR(255) NOT NULL,
    descripcion      VARCHAR(255) NULL
);
