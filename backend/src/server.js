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

app.use(cors());
app.use(helmet());
app.use(generalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tus rutas y middlewares restantes van aquí debajo...
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

// CORS: en desarrollo, Live Server puede abrir en distintos puertos
// (5500, 5501, 5001...) cada vez, así que aceptamos cualquier origen
// local (127.0.0.1 o localhost) automáticamente — sin tener que estar
// ajustando el .env cada vez que cambia el puerto. En producción
// (NODE_ENV=production) esto se vuelve estricto: solo se acepta el
// dominio exacto configurado en CORS_ORIGIN, nunca cualquier origen.
const origenesPermitidos = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      // Sin origin (Postman), puertos locales (Live Server) O doble clic ('null'): permitido
      if (!origin || origin === 'null' || origenesPermitidos.test(origin)) {
        return callback(null, true);
      }
    }
    // En producción: solo el origen exacto definido en CORS_ORIGIN
    if (origin === process.env.CORS_ORIGIN) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));

app.use(express.json());

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