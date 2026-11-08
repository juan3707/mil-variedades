// El stock vive en su propia tabla (relación 1 a 1 con producto), así
// que tiene su propio controlador chiquito en vez de mezclarse con
// productoController.js.

const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

// PUT /api/productos/:id/stock   body: { cantidad }
async function actualizarStock(req, res, next) {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (cantidad === undefined || cantidad === null || Number.isNaN(Number(cantidad)) || Number(cantidad) < 0) {
      return fail(res, 'La cantidad debe ser un número igual o mayor a 0', 400);
    }

    const [productoExiste] = await pool.query(
      'SELECT id_producto FROM producto WHERE id_producto = ? AND estado = 1',
      [id]
    );
    if (productoExiste.length === 0) {
      return fail(res, 'Producto no encontrado', 404);
    }

    const [stockExistente] = await pool.query(
      'SELECT id_stock FROM stock WHERE id_producto = ?',
      [id]
    );

    if (stockExistente.length === 0) {
      // Caso raro (producto sin fila de stock aún): la creamos
      await pool.query(
        'INSERT INTO stock (id_producto, cantidad, estado) VALUES (?, ?, 1)',
        [id, cantidad]
      );
    } else {
      await pool.query(
        'UPDATE stock SET cantidad = ? WHERE id_producto = ?',
        [cantidad, id]
      );
    }

    return ok(res, { id_producto: Number(id), cantidad: Number(cantidad) }, 'Stock actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { actualizarStock };
