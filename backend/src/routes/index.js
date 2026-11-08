const express = require('express');
const router = express.Router();
const productoRoutes = require('./productoRoutes');
const categoriaRoutes = require('./categoriaRoutes');
const authRoutes = require('./authRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const configRoutes = require('./configRoutes');
const imagenRoutes = require('./imagenRoutes');

router.use('/productos', productoRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/config', configRoutes);
router.use('/imagenes', imagenRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API de Mil Variedades funcionando correctamente' });
});

module.exports = router;
