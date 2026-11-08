// Este archivo responde dos preguntas distintas en cada petición protegida:
// 1) ¿Quién eres? (verificarToken → lee el JWT)
// 2) ¿Puedes hacer esto? (requireRole → compara tu rol contra lo permitido)
//
// Esto es lo que en el proyecto llamamos "control de acceso por fila":
// cada acción administrativa pasa por aquí ANTES de tocar la base de datos.

const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

// Verifica que la petición traiga un JWT válido en el header:
// Authorization: Bearer <token>
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 'No autorizado: falta el token de acceso', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // queda disponible como { id_usuario, rol } en el resto de la petición
    next();
  } catch (err) {
    return fail(res, 'Token inválido o expirado', 401);
  }
}

// Genera un middleware que solo deja pasar a los roles indicados.
// Uso: requireRole('admin', 'super_admin')
// IMPORTANTE: siempre se usa DESPUÉS de verificarToken, porque necesita
// leer req.user que ese middleware anterior dejó listo.
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return fail(res, 'No tienes permisos para realizar esta acción', 403);
    }
    next();
  };
}

module.exports = { verificarToken, requireRole };
