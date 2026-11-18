// Multer: recibe archivos y los guarda en /uploads/productos.
// NOTA: por ahora no filtramos por tipo de archivo (algunos archivos
// de celular/capturas traen un mimetype poco confiable) — solo
// limitamos el tamaño. Es un ajuste pendiente de pulir más adelante,
// no algo crítico para el funcionamiento del proyecto.

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// En Vercel el sistema de archivos del proyecto es de SOLO LECTURA: crear
// carpetas ahí lanza EROFS al cargar el módulo y tumba toda la API.
// Allí solo se puede escribir en el directorio temporal del sistema (/tmp).
const carpetaDestino = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads', 'productos')
  : path.join(__dirname, '..', '..', 'uploads', 'productos');

try {
  if (!fs.existsSync(carpetaDestino)) {
    fs.mkdirSync(carpetaDestino, { recursive: true });
  }
} catch (error) {
  console.error('No se pudo preparar la carpeta de subidas:', error.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, carpetaDestino);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || '.jpg';
    const nombreUnico = `producto-${req.params.id}-${Date.now()}${extension}`;
    cb(null, nombreUnico);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5 MB por imagen
});

module.exports = upload;
