// Punto de entrada del backend.

const path = require('path');
const os = require('os');
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

// CORS multi-puerto y compatible con Hostinger, Vercel y mismo origen
const origenesPermitidos = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    const host = req.header("Host");
    const esMismoHost = Boolean(origin && host && origin.endsWith(`://${host}`));

    if (
      !origin ||
      esMismoHost ||
      (origin === "null" && process.env.NODE_ENV !== "production") ||
      origenesPermitidos.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".hostingersite.com")
    ) {
      return callback(null, { origin: true, credentials: true });
    }
    return callback(new Error("No permitido por CORS"));
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

if (process.env.VERCEL) {
  app.use('/uploads', express.static(path.join(os.tmpdir(), 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  }));
}

// Rutas de la API REST
app.use('/api', routes);

// Servir archivos estáticos y páginas del frontend en Hostinger / despliegue unificado
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
const pagesPath = path.join(frontendPath, 'pages');

app.use('/assets', express.static(path.join(frontendPath, 'assets')));
app.use('/pages', express.static(pagesPath));
app.use(express.static(pagesPath));

app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(path.join(pagesPath, 'index.html'));
});

app.get('/catalogo.html', (_req, res) => {
  res.sendFile(path.join(pagesPath, 'catalogo.html'));
});

app.get('/login.html', (_req, res) => {
  res.sendFile(path.join(pagesPath, 'login.html'));
});

app.get('/panel.html', (_req, res) => {
  res.sendFile(path.join(pagesPath, 'panel.html'));
});

app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
}
module.exports = app;