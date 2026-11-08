const pool = require('../config/db');
const { ok, fail } = require('../utils/response');
const { obtenerCache, guardarCache, limpiarCache } = require('../utils/cache');

// Tope máximo de productos por página: aunque alguien pida limit=1000,
// nunca se le entrega más de esto. Evita que una sola petición fuerce
// una respuesta gigante.
const LIMITE_MAXIMO = 50;
const LIMITE_DEFECTO = 20;

// Lista blanca de valores permitidos para "orden" → columna SQL real.
// El valor que llega por query string NUNCA se interpola directo en el
// SQL: solo se usa para elegir una de estas claves ya escritas a mano.
const ORDEN_PERMITIDO = {
  'precio-asc': 'p.precio ASC',
  'precio-desc': 'p.precio DESC',
  'nombre-az': 'p.nombre ASC',
  relevancia: 'p.fecha_creacion DESC',
};

// GET /api/productos → catálogo (paginado y filtrable).
// Acepta por query string, todos opcionales:
//   page      → página (por defecto 1)
//   limit     → productos por página (por defecto 20, tope máximo 50)
//   categoria → id_categoria exacto
//   orden     → 'precio-asc' | 'precio-desc' | 'nombre-az' | 'relevancia'
//   busqueda  → texto a buscar en el nombre del producto
async function listarProductos(req, res, next) {
  try {
    // Saneamos page/limit: cualquier valor inválido, negativo o no numérico
    // cae al valor por defecto, y limit nunca supera LIMITE_MAXIMO.
    let pagina = parseInt(req.query.page, 10);
    if (!Number.isInteger(pagina) || pagina < 1) pagina = 1;

    let limite = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limite) || limite < 1) limite = LIMITE_DEFECTO;
    if (limite > LIMITE_MAXIMO) limite = LIMITE_MAXIMO;

    const offset = (pagina - 1) * limite;

    // Filtro opcional por categoría (id numérico).
    const idCategoria = parseInt(req.query.categoria, 10);
    const filtrarPorCategoria = Number.isInteger(idCategoria) && idCategoria > 0;

    // Búsqueda opcional por nombre (LIKE parametrizado, nunca concatenado).
    const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';

    // Orden: si el valor recibido no está en la lista blanca, se usa
    // 'relevancia' por defecto.
    const claveOrden = ORDEN_PERMITIDO[req.query.orden] ? req.query.orden : 'relevancia';
    const ordenSql = ORDEN_PERMITIDO[claveOrden];

    const condiciones = ['p.estado = 1'];
    const parametrosFiltro = [];
    if (filtrarPorCategoria) {
      condiciones.push('p.id_categoria = ?');
      parametrosFiltro.push(idCategoria);
    }
    if (busqueda) {
      condiciones.push('p.nombre LIKE ?');
      parametrosFiltro.push(`%${busqueda}%`);
    }
    const whereSql = condiciones.join(' AND ');

    // Cada combinación de filtros + página se cachea por separado, así no
    // se mezclan resultados de búsquedas/categorías/páginas distintas.
    const cacheKey =
      `productos:lista:pagina${pagina}:limite${limite}` +
      `:cat${filtrarPorCategoria ? idCategoria : 'todas'}` +
      `:orden${claveOrden}:busq${busqueda.toLowerCase()}`;

    const cacheado = obtenerCache(cacheKey);
    if (cacheado) {
      return res.status(200).json({
        success: true,
        data: cacheado.productos,
        paginacion: {
          pagina: cacheado.pagina,
          total_paginas: cacheado.total_paginas,
          total_productos: cacheado.total_productos,
        },
        message: 'Catálogo obtenido correctamente',
      });
    }

    // Misma consulta de siempre (subconsulta correlacionada para la
    // imagen de portada, sin problema N+1), con el WHERE dinámico armado
    // arriba y LIMIT/OFFSET parametrizados al final.
    const [rows] = await pool.query(
      `SELECT p.id_producto, p.nombre, p.descripcion, p.precio,
              p.id_categoria, c.nombre AS categoria,
              (SELECT ip.url_imagen
               FROM imagen_producto ip
               WHERE ip.id_producto = p.id_producto AND ip.estado = 1
               ORDER BY ip.orden ASC
               LIMIT 1) AS imagen_portada
       FROM producto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       WHERE ${whereSql}
       ORDER BY ${ordenSql}
       LIMIT ? OFFSET ?`,
      [...parametrosFiltro, limite, offset]
    );

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM producto p WHERE ${whereSql}`,
      parametrosFiltro
    );
    const totalProductos = totalRows[0].total;
    const totalPaginas = totalProductos === 0 ? 1 : Math.ceil(totalProductos / limite);

    const resultado = {
      productos: rows,
      pagina,
      total_paginas: totalPaginas,
      total_productos: totalProductos,
    };

    guardarCache(cacheKey, resultado, 60); // válido por 60 segundos

    // data sigue siendo el arreglo plano de productos, exactamente como
    // el frontend ya lo espera hoy — la paginación va aparte, en
    // "paginacion", sin cambiar la forma de "data".
    return res.status(200).json({
      success: true,
      data: rows,
      paginacion: {
        pagina,
        total_paginas: totalPaginas,
        total_productos: totalProductos,
      },
      message: 'Catálogo obtenido correctamente',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/productos/:id → detalle de un producto, CON todas sus imágenes.
// Aquí sí son 2 consultas (producto + sus imágenes), pero eso está bien:
// N+1 sería "1 por cada producto de una LISTA", no "2 consultas para 1 solo
// producto individual" — eso es simplemente traer datos relacionados.
async function obtenerProducto(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria
       FROM producto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto = ? AND p.estado = 1`,
      [id]
    );

    if (rows.length === 0) {
      return fail(res, 'Producto no encontrado', 404);
    }

    const producto = rows[0];

    const [imagenes] = await pool.query(
      `SELECT id_imagen, url_imagen, orden
       FROM imagen_producto
       WHERE id_producto = ? AND estado = 1
       ORDER BY orden ASC`,
      [id]
    );
    producto.imagenes = imagenes;

    return ok(res, producto);
  } catch (err) {
    next(err);
  }
}

// POST /api/productos → crear un producto nuevo. PROTEGIDA.
async function crearProducto(req, res, next) {
  try {
    const { nombre, descripcion, precio, id_categoria } = req.body;

    const [categorias] = await pool.query(
      'SELECT id_categoria FROM categoria WHERE id_categoria = ? AND estado = 1',
      [id_categoria]
    );
    if (categorias.length === 0) {
      return fail(res, 'La categoría indicada no existe', 400);
    }

    const [resultado] = await pool.query(
      `INSERT INTO producto (nombre, descripcion, precio, id_categoria, estado)
       VALUES (?, ?, ?, ?, 1)`,
      [nombre, descripcion || null, precio, id_categoria]
    );

    await pool.query(
      'INSERT INTO stock (id_producto, cantidad, estado) VALUES (?, 0, 1)',
      [resultado.insertId]
    );

    // limpiarCache ahora borra "productos:lista" Y todas sus variantes
    // paginadas (productos:lista:pagina1:limite20, etc.) — sin cambiar
    // esta línea, gracias al ajuste hecho en utils/cache.js.
    limpiarCache('productos:lista');

    return ok(res, { id_producto: resultado.insertId }, 'Producto creado correctamente', 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/productos/:id → editar un producto existente. PROTEGIDA.
async function actualizarProducto(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, id_categoria } = req.body;

    const [existe] = await pool.query(
      'SELECT id_producto FROM producto WHERE id_producto = ? AND estado = 1',
      [id]
    );
    if (existe.length === 0) {
      return fail(res, 'Producto no encontrado', 404);
    }

    const [categorias] = await pool.query(
      'SELECT id_categoria FROM categoria WHERE id_categoria = ? AND estado = 1',
      [id_categoria]
    );
    if (categorias.length === 0) {
      return fail(res, 'La categoría indicada no existe', 400);
    }

    await pool.query(
      `UPDATE producto
       SET nombre = ?, descripcion = ?, precio = ?, id_categoria = ?
       WHERE id_producto = ?`,
      [nombre, descripcion || null, precio, id_categoria, id]
    );

    limpiarCache('productos:lista');

    return ok(res, { id_producto: Number(id) }, 'Producto actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/productos/:id → SOFT DELETE. PROTEGIDA.
async function eliminarProducto(req, res, next) {
  try {
    const { id } = req.params;

    const [existe] = await pool.query(
      'SELECT id_producto FROM producto WHERE id_producto = ? AND estado = 1',
      [id]
    );
    if (existe.length === 0) {
      return fail(res, 'Producto no encontrado', 404);
    }

    await pool.query('UPDATE producto SET estado = 0 WHERE id_producto = ?', [id]);

    limpiarCache('productos:lista');

    return ok(res, null, 'Producto desactivado correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
