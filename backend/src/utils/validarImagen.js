// El "pendiente de seguridad" que dejamos anotado en el módulo de
// imágenes: en vez de confiar en lo que el navegador DICE que es un
// archivo (mimetype, que se puede falsificar), leemos los primeros
// bytes REALES del archivo y los comparamos contra las firmas binarias
// conocidas de cada formato de imagen. Esto es lo que en seguridad se
// llama "validación por contenido", más confiable que validar por
// nombre o mimetype.

const fs = require('fs');

const FIRMAS = {
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // "RIFF" (los archivos WEBP empiezan así)
};

function esImagenValida(rutaArchivo) {
  const buffer = fs.readFileSync(rutaArchivo);

  return Object.values(FIRMAS).some((firma) =>
    firma.every((byte, index) => buffer[index] === byte)
  );
}

module.exports = { esImagenValida };
