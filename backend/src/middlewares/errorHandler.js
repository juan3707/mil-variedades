function errorHandler(err, req, res, next) {
  console.error('Error no controlado:', err.message);

  if (err.message && err.message.includes('debe ser una imagen')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo supera el tamaño máximo permitido (5 MB)',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Ocurrió un error interno en el servidor',
  });
}

module.exports = errorHandler;
