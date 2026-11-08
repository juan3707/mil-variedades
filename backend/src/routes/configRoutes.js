const express = require('express');
const router = express.Router();
const { listarConfig, actualizarConfig } = require('../controllers/configController');
const { verificarToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', listarConfig); // pública
router.put('/:nombre', verificarToken, requireRole('super_admin'), actualizarConfig);

module.exports = router;
