const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { ok, fail } = require('../utils/response');
const { esImagenValida } = require('../utils/validarImagen');

// POST /api/productos/:id/imagenes → subir una imagen para un producto
async function subirImagen(req, res, next) {
  try {
    const { id } = req.params;

    const [producto] = await pool.query(
      'SELECT id_producto FROM producto WHERE id_producto = ? AND estado = 1',
      [id]
    );
    if (producto.length === 0) {
      return fail(res, 'Producto no encontrado', 404);
    }

    if (!req.files || req.files.length === 0) {
      return fail(res, 'No se recibió ningún archivo de imagen', 400);
    }
    const archivo = req.files[0];

    // Validación REAL por contenido binario (Agente 4): si el archivo
    // no tiene la firma de una imagen de verdad, lo rechazamos y lo
    // borramos del disco, sin importar qué nombre o mimetype traiga.
    if (!esImagenValida(archivo.path)) {
      fs.unlink(archivo.path, () => {}); // limpiamos el archivo inválido
      return fail(res, 'El archivo no es una imagen válida', 400);
    }

    const urlImagen = `/uploads/productos/${archivo.filename}`;

    const [imagenesExistentes] = await pool.query(
      'SELECT COUNT(*) AS total FROM imagen_producto WHERE id_producto = ? AND estado = 1',
      [id]
    );
    const siguienteOrden = imagenesExistentes[0].total;

    const [resultado] = await pool.query(
      'INSERT INTO imagen_producto (id_producto, url_imagen, orden, estado) VALUES (?, ?, ?, 1)',
      [id, urlImagen, siguienteOrden]
    );

    return ok(
      res,
      { id_imagen: resultado.insertId, url_imagen: urlImagen },
      'Imagen subida correctamente',
      201
    );
  } catch (err) {
    next(err);
  }
}

// DELETE /api/imagenes/:id → elimina el registro Y el archivo físico
async function eliminarImagen(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT url_imagen FROM imagen_producto WHERE id_imagen = ? AND estado = 1',
      [id]
    );
    if (rows.length === 0) {
      return fail(res, 'Imagen no encontrada', 404);
    }

    await pool.query('UPDATE imagen_producto SET estado = 0 WHERE id_imagen = ?', [id]);

    const rutaArchivo = path.join(__dirname, '..', '..', rows[0].url_imagen);
    fs.unlink(rutaArchivo, (err) => {
      if (err) console.error('No se pudo borrar el archivo físico:', err.message);
    });

    return ok(res, null, 'Imagen eliminada correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { subirImagen, eliminarImagen };
