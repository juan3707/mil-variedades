// Multer: recibe archivos y los guarda en /uploads/productos.
// NOTA: por ahora no filtramos por tipo de archivo (algunos archivos
// de celular/capturas traen un mimetype poco confiable) — solo
// limitamos el tamaño. Es un ajuste pendiente de pulir más adelante,
// no algo crítico para el funcionamiento del proyecto.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const carpetaDestino = path.join(__dirname, '..', '..', 'uploads', 'productos');

if (!fs.existsSync(carpetaDestino)) {
  fs.mkdirSync(carpetaDestino, { recursive: true });
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
