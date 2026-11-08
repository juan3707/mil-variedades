// Aquí definimos QUÉ es un dato válido para cada endpoint, ANTES de que
// llegue a tocar la base de datos. Si algo no cumple, se rechaza con 400
// y un mensaje claro, sin ejecutar ninguna consulta SQL.

const { body, validationResult } = require('express-validator');
const { fail } = require('../utils/response');

function manejarErroresValidacion(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return fail(res, errores.array()[0].msg, 400);
  }
  next();
}

const validarLogin = [
  body('correo').isEmail().withMessage('El correo no tiene un formato válido'),
  body('contrasena').notEmpty().withMessage('La contraseña es obligatoria'),
  manejarErroresValidacion,
];

const validarProducto = [
  body('nombre')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('El nombre debe tener entre 3 y 150 caracteres'),
  body('precio')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('id_categoria')
    .isInt({ min: 1 })
    .withMessage('Debe indicar una categoría válida'),
  manejarErroresValidacion,
];

const validarCategoria = [
  body('nombre')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre de la categoría debe tener entre 3 y 100 caracteres'),
  body('descripcion')
    .optional({ nullable: true })
    .isLength({ max: 255 })
    .withMessage('La descripción no puede superar los 255 caracteres'),
  manejarErroresValidacion,
];

// Para CREAR un usuario administrativo (pide contraseña)
const validarUsuarioNuevo = [
  body('nombre').trim().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('correo').isEmail().withMessage('El correo no tiene un formato válido'),
  body('contrasena').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('id_rol').isInt({ min: 1 }).withMessage('Debe indicar un rol válido'),
  manejarErroresValidacion,
];

// Para EDITAR un usuario administrativo (no pide contraseña)
const validarUsuarioEditar = [
  body('nombre').trim().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('correo').isEmail().withMessage('El correo no tiene un formato válido'),
  body('id_rol').isInt({ min: 1 }).withMessage('Debe indicar un rol válido'),
  manejarErroresValidacion,
];

module.exports = {
  validarLogin,
  validarProducto,
  validarCategoria,
  validarUsuarioNuevo,
  validarUsuarioEditar,
};
