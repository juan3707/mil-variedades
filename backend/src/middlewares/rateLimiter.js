// Rate limiting: pone un tope a cuántas peticiones puede hacer la misma
// IP en una ventana de tiempo. Sin esto, alguien podría intentar adivinar
// contraseñas miles de veces por segundo (fuerza bruta) o saturar tu API.

const rateLimit = require('express-rate-limit');

// Límite general: aplica a TODA la API
const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MIN || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: { success: false, message: 'Demasiadas peticiones, intenta de nuevo más tarde' },
});

// Límite estricto SOLO para login: máximo 5 intentos cada 15 minutos.
// Así frenamos específicamente los ataques de fuerza bruta contra contraseñas.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión, espera unos minutos' },
});

module.exports = { generalLimiter, loginLimiter };
