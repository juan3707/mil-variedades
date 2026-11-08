const cache = new Map();

function obtenerCache(clave) {
  const entrada = cache.get(clave);
  if (!entrada) return null;

  if (Date.now() > entrada.expira) {
    cache.delete(clave);
    return null;
  }

  return entrada.valor;
}

function guardarCache(clave, valor, ttlSegundos = 60) {
  cache.set(clave, { valor, expira: Date.now() + ttlSegundos * 1000 });
}

// Con paginación, el catálogo ya no vive bajo UNA sola clave
// ("productos:lista"), sino bajo varias ("productos:lista:pagina1:limite20",
// "productos:lista:pagina2:limite20", etc.) — una por cada combinación de
// page/limit consultada. Si limpiarCache('productos:lista') solo borrara
// la clave exacta, esas variantes paginadas quedarían con datos viejos
// hasta que expire su TTL (60s) después de crear/editar/eliminar un
// producto. Por eso, además de la clave exacta, también se borra
// cualquier clave que empiece con "clave:" (sus variantes). Esto no
// afecta a las demás claves del proyecto (categorias:lista, config:lista),
// que siguen limpiándose igual que antes porque no tienen variantes.
function limpiarCache(clave) {
  if (!clave) {
    cache.clear();
    return;
  }

  cache.delete(clave);
  const prefijo = `${clave}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefijo)) {
      cache.delete(key);
    }
  }
}

module.exports = { obtenerCache, guardarCache, limpiarCache };
