// Punto de entrada del backend.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');

const app = express();

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
      imgSrc: ["'self'", 'data:'], // imágenes propias + las que sirve este mismo backend
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], // Bootstrap 5 JS por CDN
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"], // el frontend solo puede llamar a esta misma API
    },
  })
);

// NOTA IMPORTANTE: en desarrollo, el frontend corre en Live Server
// (otro puerto/origen), así que esta CSP hoy solo protege las
// respuestas de ESTA API. Cuando en el Agente 8 despleguemos con Nginx
// sirviendo frontend y backend bajo el mismo dominio, esta misma CSP
// pasará a proteger también las páginas HTML reales.

// CORS universal y flexible para producción y desarrollo
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(generalLimiter);

// Middleware estático con cabeceras explícitas de recursos cruzados
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
})); 

app.use('/api', routes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Prueba: http://localhost:${PORT}/api/health`);
});