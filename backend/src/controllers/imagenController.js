const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { ok, fail } = require('../utils/response');
const { esImagenValida, detectarMimeImagen } = require('../utils/validarImagen');
const { limpiarCache } = require('../utils/cache');

// Migración automática idempotente compatible con MySQL 8.0 (Aiven).
// Verifica en INFORMATION_SCHEMA.COLUMNS si existen las columnas `datos` y `mime_type`
// en `imagen_producto` y las agrega una sola vez si faltan.
let promesaMigracionImagen = null;

async function asegurarColumnasImagen() {
  if (promesaMigracionImagen) {
    return promesaMigracionImagen;
  }

  promesaMigracionImagen = (async () => {
    try {
      const [columnas] = await pool.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'imagen_producto'
           AND COLUMN_NAME IN ('datos', 'mime_type')`
      );

      const existentes = new Set(
        columnas.map((col) => String(col.COLUMN_NAME || '').toLowerCase())
      );

      if (!existentes.has('datos')) {
        try {
          await pool.query(
            'ALTER TABLE imagen_producto ADD COLUMN datos MEDIUMBLOB NULL'
          );
        } catch (errAlter) {
          if (errAlter.code !== 'ER_DUP_FIELDNAME' && errAlter.errno !== 1060) {
            throw errAlter;
          }
        }
      }

      if (!existentes.has('mime_type')) {
        try {
          await pool.query(
            'ALTER TABLE imagen_producto ADD COLUMN mime_type VARCHAR(50) NULL'
          );
        } catch (errAlter) {
          if (errAlter.code !== 'ER_DUP_FIELDNAME' && errAlter.errno !== 1060) {
            throw errAlter;
          }
        }
      }
    } catch (error) {
      promesaMigracionImagen = null;
      throw error;
    }
  })();

  return promesaMigracionImagen;
}

// POST /api/productos/:id/imagenes → subir una imagen para un producto
async function subirImagen(req, res, next) {
  try {
    await asegurarColumnasImagen();

    const { id } = req.params;

    const [producto] = await pool.query(
      'SELECT id_producto FROM producto WHERE id_producto = ? AND estado = 1',
      [id]
    );
    if (producto.length === 0) {
      return fail(res, 'Producto no encontrado', 404);
    }

    const archivo =
      req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);

    if (!archivo || !Buffer.isBuffer(archivo.buffer) || archivo.buffer.length === 0) {
      return fail(res, 'No se recibió ningún archivo de imagen', 400);
    }

    if (!esImagenValida(archivo.buffer)) {
      return fail(
        res,
        'El archivo no es una imagen válida. Usa formato JPG, PNG, WEBP o GIF.',
        400
      );
    }

    const mimeType = detectarMimeImagen(archivo.buffer) || archivo.mimetype || 'image/jpeg';

    const [imagenesExistentes] = await pool.query(
      'SELECT COUNT(*) AS total FROM imagen_producto WHERE id_producto = ? AND estado = 1',
      [id]
    );
    const siguienteOrden = imagenesExistentes[0].total;

    const [resultado] = await pool.query(
      `INSERT INTO imagen_producto (id_producto, url_imagen, datos, mime_type, orden, estado)
       VALUES (?, '', ?, ?, ?, 1)`,
      [id, archivo.buffer, mimeType, siguienteOrden]
    );

    const idImagen = resultado.insertId;
    const urlImagen = `/api/imagenes/${idImagen}`;

    await pool.query(
      'UPDATE imagen_producto SET url_imagen = ? WHERE id_imagen = ?',
      [urlImagen, idImagen]
    );

    limpiarCache('productos:lista');

    return ok(
      res,
      {
        id_imagen: idImagen,
        id_producto: Number(id),
        url_imagen: urlImagen,
        orden: siguienteOrden,
      },
      'Imagen subida correctamente',
      201
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/imagenes/:id → sirve el binario de la imagen almacenada en Aiven
async function servirImagen(req, res, next) {
  try {
    await asegurarColumnasImagen();

    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT datos, mime_type, url_imagen FROM imagen_producto WHERE id_imagen = ? AND estado = 1',
      [id]
    );

    if (rows.length === 0 || !rows[0].datos) {
      return fail(res, 'Imagen no encontrada', 404);
    }

    res.setHeader('Content-Type', rows[0].mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(rows[0].datos);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/imagenes/:id → elimina el registro lógico y limpia el blob
async function eliminarImagen(req, res, next) {
  try {
    await asegurarColumnasImagen();

    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT url_imagen FROM imagen_producto WHERE id_imagen = ? AND estado = 1',
      [id]
    );
    if (rows.length === 0) {
      return fail(res, 'Imagen no encontrada', 404);
    }

    await pool.query(
      'UPDATE imagen_producto SET estado = 0, datos = NULL WHERE id_imagen = ?',
      [id]
    );

    limpiarCache('productos:lista');

    const urlAntigua = String(rows[0].url_imagen || '');
    if (urlAntigua.startsWith('/uploads/') && !process.env.VERCEL) {
      try {
        const rutaArchivo = path.join(__dirname, '..', '..', urlAntigua);
        fs.unlink(rutaArchivo, () => {});
      } catch (_err) {
        // Ignorar errores de sistema de archivos (ENOENT / EROFS)
      }
    }

    return ok(res, null, 'Imagen eliminada correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { subirImagen, servirImagen, eliminarImagen, asegurarColumnasImagen };
