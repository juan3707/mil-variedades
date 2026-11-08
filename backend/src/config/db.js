// Conexión a MySQL. Usa un "pool" (grupo de conexiones reutilizables) en vez
// de abrir/cerrar una conexión nueva por cada consulta — es más rápido y es
// la práctica estándar en Node + Express.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  ssl: { 
    rejectUnauthorized: false 
  }
});


// Sin este listener, un error de conexión perdida en una conexión INACTIVA
// del pool (ej. el servidor MySQL la cerró por inactividad, un reinicio de
// MySQL, o el hosting cortándola) se convierte en una excepción no
// controlada que tumba todo el proceso de Node — eso es lo que obligaba a
// hacer taskkill + npm run dev cada vez. Con este listener, el error solo
// se loguea, y mysql2 se encarga de forma nativa de descartar esa conexión
// y crear una nueva la próxima vez que se necesite — no hace falta
// reconectar manualmente ni ninguna librería adicional.
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de MySQL:', err.message);
});

// Ping automático para mantener la conexión viva
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('Fallo en el latido de la BD:', error.message);
  }
}, 60000); // Se ejecuta cada 60 segundos

module.exports = pool;