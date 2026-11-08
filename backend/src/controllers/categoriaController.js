const pool = require('../config/db');
const { ok, fail } = require('../utils/response');
const { obtenerCache, guardarCache, limpiarCache } = require('../utils/cache');

async function listarCategorias(req, res, next) {
  try {
    const cacheKey = 'categorias:lista';
    const cacheado = obtenerCache(cacheKey);
    if (cacheado) {
      return ok(res, cacheado, 'Categorías obtenidas correctamente');
    }

    const [rows] = await pool.query(
      `SELECT id_categoria, nombre, descripcion
       FROM categoria
       WHERE estado = 1
       ORDER BY nombre ASC`
    );

    guardarCache(cacheKey, rows, 300); // categorías cambian poco: 5 minutos
    return ok(res, rows, 'Categorías obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function crearCategoria(req, res, next) {
  try {
    const { nombre, descripcion } = req.body;

    const [existente] = await pool.query(
      'SELECT id_categoria FROM categoria WHERE nombre = ? AND estado = 1',
      [nombre]
    );
    if (existente.length > 0) {
      return fail(res, 'Ya existe una categoría con ese nombre', 409);
    }

    const [resultado] = await pool.query(
      'INSERT INTO categoria (nombre, descripcion, estado) VALUES (?, ?, 1)',
      [nombre, descripcion || null]
    );

    limpiarCache('categorias:lista');

    return ok(res, { id_categoria: resultado.insertId }, 'Categoría creada correctamente', 201);
  } catch (err) {
    next(err);
  }
}

async function actualizarCategoria(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const [existe] = await pool.query(
      'SELECT id_categoria FROM categoria WHERE id_categoria = ? AND estado = 1',
      [id]
    );
    if (existe.length === 0) {
      return fail(res, 'Categoría no encontrada', 404);
    }

    await pool.query(
      'UPDATE categoria SET nombre = ?, descripcion = ? WHERE id_categoria = ?',
      [nombre, descripcion || null, id]
    );

    limpiarCache('categorias:lista');

    return ok(res, { id_categoria: Number(id) }, 'Categoría actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

async function eliminarCategoria(req, res, next) {
  try {
    const { id } = req.params;

    const [existe] = await pool.query(
      'SELECT id_categoria FROM categoria WHERE id_categoria = ? AND estado = 1',
      [id]
    );
    if (existe.length === 0) {
      return fail(res, 'Categoría no encontrada', 404);
    }

    const [productosAsociados] = await pool.query(
      'SELECT id_producto FROM producto WHERE id_categoria = ? AND estado = 1',
      [id]
    );
    if (productosAsociados.length > 0) {
      return fail(
        res,
        `No se puede eliminar: hay ${productosAsociados.length} producto(s) usando esta categoría`,
        409
      );
    }

    await pool.query('UPDATE categoria SET estado = 0 WHERE id_categoria = ?', [id]);

    limpiarCache('categorias:lista');

    return ok(res, null, 'Categoría desactivada correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { listarCategorias, crearCategoria, actualizarCategoria, eliminarCategoria };
