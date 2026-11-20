// Multer en memoria (memoryStorage): compatible 100% con Vercel Serverless
// (cero escrituras en disco de solo lectura). El buffer se valida por firma
// binaria y se almacena en MySQL (Aiven) para servirse en GET /api/imagenes/:id.

const multer = require('multer');

const MIMES_PERMITIDOS = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // máximo 4 MB (compatible con Vercel Serverless)
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || MIMES_PERMITIDOS.has(file.mimetype.toLowerCase())) {
      return cb(null, true);
    }
    const err = new Error('Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.');
    err.status = 400;
    return cb(err);
  },
});

module.exports = upload;
