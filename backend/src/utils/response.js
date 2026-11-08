// Todas las respuestas de la API siguen el mismo formato, así el frontend
// siempre sabe qué esperar: { success, data, message } o { success: false, message }

function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function fail(res, message = 'Error', status = 400) {
  return res.status(status).json({ success: false, message });
}

module.exports = { ok, fail };