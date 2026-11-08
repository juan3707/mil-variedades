const express = require('express');
const router = express.Router();
const {
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} = require('../controllers/categoriaController');
const { verificarToken, requireRole } = require('../middlewares/authMiddleware');
const { validarCategoria } = require('../middlewares/validators');

// --- Pública ---
router.get('/', listarCategorias);

// --- Protegidas (Administrador o Super Administrador) ---
router.post('/', verificarToken, requireRole('admin', 'super_admin'), validarCategoria, crearCategoria);
router.put('/:id', verificarToken, requireRole('admin', 'super_admin'), validarCategoria, actualizarCategoria);
router.delete('/:id', verificarToken, requireRole('admin', 'super_admin'), eliminarCategoria);

module.exports = router;
