const express = require('express');
const router = express.Router();
const { eliminarImagen } = require('../controllers/imagenController');
const { verificarToken, requireRole } = require('../middlewares/authMiddleware');

router.delete('/:id', verificarToken, requireRole('admin', 'super_admin'), eliminarImagen);

module.exports = router;
