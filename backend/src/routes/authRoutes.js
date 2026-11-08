const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { loginLimiter } = require('../middlewares/rateLimiter');
const { validarLogin } = require('../middlewares/validators');

// Primero se frena por intentos (loginLimiter), luego se valida el
// formato de los datos (validarLogin), y solo si pasa las dos, se
// ejecuta login() de verdad.
router.post('/login', loginLimiter, validarLogin, login);

module.exports = router;
