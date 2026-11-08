const pool = require('../config/db');
const { ok, fail } = require('../utils/response');
const { obtenerCache, guardarCache, limpiarCache } = require('../utils/cache');

async function listarConfig(req, res, next) {
  try {
    const cacheKey = 'config:lista';
    const cacheado = obtenerCache(cacheKey);
    if (cacheado) {
      return ok(res, cacheado, 'Configuración obtenida correctamente');
    }

    const [rows] = await pool.query(
      'SELECT nombre, valor, descripcion FROM configuracion_sistema ORDER BY nombre ASC'
    );

    guardarCache(cacheKey, rows, 300); // 5 minutos: cambia muy poco
    return ok(res, rows, 'Configuración obtenida correctamente');
  } catch (err) {
    next(err);
  }
}

async function actualizarConfig(req, res, next) {
  try {
    const { nombre } = req.params;
    const { valor } = req.body;

    if (!valor || String(valor).trim() === '') {
      return fail(res, 'El valor no puede estar vacío', 400);
    }

    const [existe] = await pool.query(
      'SELECT id_configuracion FROM configuracion_sistema WHERE nombre = ?',
      [nombre]
    );
    if (existe.length === 0) {
      return fail(res, 'Esa clave de configuración no existe', 404);
    }

    await pool.query(
      'UPDATE configuracion_sistema SET valor = ? WHERE nombre = ?',
      [valor, nombre]
    );

    limpiarCache('config:lista');

    return ok(res, { nombre, valor }, 'Configuración actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { listarConfig, actualizarConfig };
