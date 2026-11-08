// CRUD de usuarios administrativos. Según la matriz de permisos del
// proyecto, esto es EXCLUSIVO del Super Administrador — un Administrador
// normal nunca puede gestionar otros usuarios (eso se controla en
// usuarioRoutes.js con requireRole('super_admin'), sin incluir 'admin').

const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

// GET /api/usuarios → lista todos los usuarios administrativos
async function listarUsuarios(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.estado, u.fecha_creacion, r.nombre AS rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       ORDER BY u.fecha_creacion DESC`
    );
    return ok(res, rows, 'Usuarios obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

// POST /api/usuarios → crear un nuevo Administrador o Super Administrador
async function crearUsuario(req, res, next) {
  try {
    const { nombre, correo, contrasena, id_rol } = req.body;

    const [correoExistente] = await pool.query(
      'SELECT id_usuario FROM usuario WHERE correo = ?',
      [correo]
    );
    if (correoExistente.length > 0) {
      return fail(res, 'Ya existe un usuario con ese correo', 409);
    }

    const [rolExiste] = await pool.query('SELECT id_rol FROM rol WHERE id_rol = ?', [id_rol]);
    if (rolExiste.length === 0) {
      return fail(res, 'El rol indicado no existe', 400);
    }

    // Igual que en el seed: la contraseña SIEMPRE se guarda con hash,
    // nunca en texto plano, ni siquiera viniendo del panel administrativo.
    const hash = await bcrypt.hash(contrasena, 10);

    const [resultado] = await pool.query(
      'INSERT INTO usuario (nombre, correo, contrasena, id_rol, estado) VALUES (?, ?, ?, ?, 1)',
      [nombre, correo, hash, id_rol]
    );

    return ok(res, { id_usuario: resultado.insertId }, 'Usuario creado correctamente', 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/usuarios/:id → editar nombre, correo, rol y estado
// (no cambia la contraseña aquí; eso sería un endpoint aparte si se necesita)
async function actualizarUsuario(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, correo, id_rol, estado } = req.body;

    const [existe] = await pool.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id]);
    if (existe.length === 0) {
      return fail(res, 'Usuario no encontrado', 404);
    }

    const [rolExiste] = await pool.query('SELECT id_rol FROM rol WHERE id_rol = ?', [id_rol]);
    if (rolExiste.length === 0) {
      return fail(res, 'El rol indicado no existe', 400);
    }

    await pool.query(
      'UPDATE usuario SET nombre = ?, correo = ?, id_rol = ?, estado = ? WHERE id_usuario = ?',
      [nombre, correo, id_rol, estado ? 1 : 0, id]
    );

    return ok(res, { id_usuario: Number(id) }, 'Usuario actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/usuarios/:id → desactivar usuario (soft delete)
async function eliminarUsuario(req, res, next) {
  try {
    const { id } = req.params;

    // Protección extra: un Super Admin no puede desactivarse a sí mismo
    // (evitamos que alguien se quede sin acceso al sistema por accidente).
    // req.user viene del JWT, gracias al middleware verificarToken.
    if (Number(id) === req.user.id_usuario) {
      return fail(res, 'No puedes desactivar tu propia cuenta', 400);
    }

    const [existe] = await pool.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id]);
    if (existe.length === 0) {
      return fail(res, 'Usuario no encontrado', 404);
    }

    await pool.query('UPDATE usuario SET estado = 0 WHERE id_usuario = ?', [id]);

    return ok(res, null, 'Usuario desactivado correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario };
