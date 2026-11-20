// Validación de imágenes por contenido binario real (magic bytes).
// Soporta recibir directamente un Buffer en memoria (multer.memoryStorage)
// o una ruta de archivo en disco por retrocompatibilidad.

const fs = require('fs');

const FIRMAS = [
  { tipo: 'jpg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { tipo: 'png', mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { tipo: 'gif', mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { tipo: 'webp', mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
];

function obtenerBuffer(entrada) {
  if (!entrada) return null;
  if (Buffer.isBuffer(entrada)) return entrada;
  if (typeof entrada === 'string') {
    try {
      return fs.readFileSync(entrada);
    } catch (_err) {
      return null;
    }
  }
  return null;
}

function detectarMimeImagen(entrada) {
  const buffer = obtenerBuffer(entrada);
  if (!buffer || buffer.length < 4) return null;

  const coincidencia = FIRMAS.find((firma) =>
    firma.bytes.every((byte, index) => buffer[index] === byte)
  );
  return coincidencia ? coincidencia.mime : null;
}

function esImagenValida(entrada) {
  return Boolean(detectarMimeImagen(entrada));
}

module.exports = { esImagenValida, detectarMimeImagen };
