// Login: valida correo + contraseña contra la base de datos y, si son
// correctos, devuelve un JWT (un "carnet digital" firmado) que el
// Administrador va a usar en las siguientes peticiones para demostrar
// quién es, sin tener que mandar la contraseña cada vez.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

// POST /api/auth/login  body: { correo, contrasena }
async function login(req, res, next) {
  try {
    const { correo, contrasena } = req.body;

    // Validación básica (el Agente 3 la va a hacer más estricta con
    // express-validator, esto es solo el mínimo para no romper la query)
    if (!correo || !contrasena) {
      return fail(res, 'Correo y contraseña son obligatorios', 400);
    }

    // Buscamos al usuario por correo, junto con el nombre de su rol
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.contrasena, u.estado, r.nombre AS rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.correo = ?`,
      [correo]
    );

    // Mensaje genérico a propósito: no decimos "correo no existe" o
    // "contraseña incorrecta" por separado, así no le damos pistas a
    // alguien que esté intentando adivinar credenciales.
    if (rows.length === 0) {
      return fail(res, 'Correo o contraseña incorrectos', 401);
    }

    const usuario = rows[0];

    if (usuario.estado === 0) {
      return fail(res, 'Este usuario está inactivo', 403);
    }

    // Comparamos la contraseña en texto plano contra el hash guardado.
    // bcrypt.compare hace el hash internamente y compara, nunca se
    // "desencripta" el hash guardado.
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!contrasenaValida) {
      return fail(res, 'Correo o contraseña incorrectos', 401);
    }

    // Credenciales correctas: generamos el JWT con lo mínimo necesario
    // (nunca metemos la contraseña ni el hash dentro del token)
    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return ok(res, {
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    }, 'Sesión iniciada correctamente');

  } catch (err) {
    next(err);
  }
}

module.exports = { login };

// Ejemplo si tu consulta de MySQL devuelve un arreglo llamado 'results':
const usuario = results[0]; 

const token = jwt.sign(
  { id: usuario.id, rol: usuario.rol },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);