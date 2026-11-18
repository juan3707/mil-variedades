// Punto de entrada del backend.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Seguridad transversal (Agente 4) ---

// Helmet aplica un conjunto de headers de seguridad HTTP "de fábrica".
// Se deshabilita la directiva crossOriginResourcePolicy por defecto de Helmet
// para que no bloquee las imágenes servidas desde un origen diferente (Live Server).
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Content Security Policy explícita: en vez de dejar la de Helmet por
// defecto (que es muy restrictiva y rompería Bootstrap/Google Fonts),
// la definimos a mano según lo que el frontend de Mil Variedades
// realmente necesita cargar.
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://accounts.google.com'],
      styleSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://fonts.googleapis.com',
        'https://accounts.google.com',
        "'unsafe-inline'",
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      frameSrc: ["'self'", 'https://www.google.com', 'https://accounts.google.com'],
      connectSrc: ["'self'", 'https://accounts.google.com'],
    },
  })
);

// CORS multi-puerto y compatible con Vercel
const origenesPermitidos = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        (origin === "null" && process.env.NODE_ENV !== "production") ||
        origenesPermitidos.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(new Error("No permitido por CORS"));
    },
    credentials: true,
  })
);

app.use(generalLimiter);

// Middleware estático con cabeceras explícitas de recursos cruzados
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Servir archivos estáticos del frontend en despliegue unificado o local
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use('/assets', express.static(path.join(frontendPath, 'assets')));
app.use('/pages', express.static(path.join(frontendPath, 'pages')));
app.use(express.static(path.join(frontendPath, 'pages')));

app.use('/api', routes);

app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'index.html'));
});

app.use(errorHandler);

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Servidor local en puerto ${PORT}`));
}
module.exports = app;