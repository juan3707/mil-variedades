// Script de un solo uso: genera el hash bcrypt de una contraseña
// para pegarlo manualmente en seed.sql.
//
// CÓMO USARLO (después de haber corrido "npm install" en /backend):
//   1. Copia este archivo a la carpeta backend/ (para que encuentre bcrypt)
//   2. En PowerShell, dentro de backend/:  node ../db/generar-hash.js "TuClaveTemporal123!"
//   3. Copia el texto que imprime y reemplaza <HASH_AQUI> en seed.sql

const bcrypt = require('bcrypt');

const passwordTexto = process.argv[2];

if (!passwordTexto) {
    console.log('Uso: node generar-hash.js "tu-contraseña"');
    process.exit(1);
}

bcrypt.hash(passwordTexto, 10).then((hash) => {
    console.log('\nContraseña en texto plano:', passwordTexto);
    console.log('Hash para pegar en seed.sql:', hash, '\n');
});
