const express = require('express');
const router = express.Router();
const {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} = require('../controllers/productoController');
const { actualizarStock } = require('../controllers/stockController');
const { subirImagen } = require('../controllers/imagenController');
const { verificarToken, requireRole } = require('../middlewares/authMiddleware');
const { validarProducto } = require('../middlewares/validators');
const upload = require('../middlewares/upload');

// --- Públicas (Usuario visitante) ---
router.get('/', listarProductos);
router.get('/:id', obtenerProducto);

// --- Protegidas (Administrador o Super Administrador) ---
router.post('/', verificarToken, requireRole('admin', 'super_admin'), validarProducto, crearProducto);
router.put('/:id', verificarToken, requireRole('admin', 'super_admin'), validarProducto, actualizarProducto);
router.delete('/:id', verificarToken, requireRole('admin', 'super_admin'), eliminarProducto);
router.put('/:id/stock', verificarToken, requireRole('admin', 'super_admin'), actualizarStock);

// upload.any() → acepta el archivo venga como venga nombrado el campo,
// así evitamos errores por una coincidencia exacta de nombre en Postman
// o en el futuro formulario del frontend.
router.post(
  '/:id/imagenes',
  verificarToken,
  requireRole('admin', 'super_admin'),
  upload.any(),
  subirImagen
);

module.exports = router;
