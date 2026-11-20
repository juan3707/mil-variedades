const express = require('express');
const router = express.Router();
const { servirImagen, eliminarImagen } = require('../controllers/imagenController');
const { verificarToken, requireRole } = require('../middlewares/authMiddleware');

// Público: los clientes de la tienda y el panel cargan las imágenes en <img>
router.get('/:id', servirImagen);

// Protegido: solo Administrador y Super Administrador pueden borrar imágenes
router.delete('/:id', verificarToken, requireRole('admin', 'super_admin'), eliminarImagen);

module.exports = router;
