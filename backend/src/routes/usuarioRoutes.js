const express = require('express');
const router = express.Router();
const {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} = require('../controllers/usuarioController');
const { verificarToken, requireRole } = require('../middlewares/authMiddleware');
const { validarUsuarioNuevo, validarUsuarioEditar } = require('../middlewares/validators');

// TODAS estas rutas son exclusivas de Super Admin — nótese que aquí
// requireRole SOLO recibe 'super_admin', a diferencia de productos/categorías
// donde también dejábamos pasar a 'admin'.
router.get('/', verificarToken, requireRole('super_admin'), listarUsuarios);
router.post('/', verificarToken, requireRole('super_admin'), validarUsuarioNuevo, crearUsuario);
router.put('/:id', verificarToken, requireRole('super_admin'), validarUsuarioEditar, actualizarUsuario);
router.delete('/:id', verificarToken, requireRole('super_admin'), eliminarUsuario);

module.exports = router;
