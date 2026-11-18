// Resolución dinámica del origen del backend según el entorno (Local vs Vercel):
const ES_LOCAL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:" ||
  !window.location.hostname;

const API_BASE_URL = ES_LOCAL ? "http://localhost:4000" : "";
const API_URL = `${API_BASE_URL}/api`;
window.API_BASE_URL = API_BASE_URL;

function resolverUrlRecurso(rutaRelativa) {
  if (!rutaRelativa) return "";
  if (/^https?:\/\//i.test(rutaRelativa) || rutaRelativa.startsWith("data:")) {
    return rutaRelativa;
  }
  const rutaNormalizada = rutaRelativa.startsWith("/") ? rutaRelativa : `/${rutaRelativa}`;
  return `${API_BASE_URL}${rutaNormalizada}`;
}

// ---------- Caché de sesión (TTL 5 min) + Memoria + Deduplicación ----------
const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheDetalleProducto = new Map();
const inFlightRequests = new Map();

function leerCacheSesion(clave) {
  try {
    const raw = sessionStorage.getItem(clave);
    if (!raw) return null;
    const registro = JSON.parse(raw);
    if (!registro || Date.now() - registro.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(clave);
      return null;
    }
    return registro.data;
  } catch (error) {
    return null;
  }
}

function guardarCacheSesion(clave, data) {
  try {
    sessionStorage.setItem(clave, JSON.stringify({ ts: Date.now(), data }));
  } catch (error) {
    // Si sessionStorage está lleno o bloqueado, continúa sin fallar
  }
}

function limpiarCacheCatalogo() {
  cacheDetalleProducto.clear();
  try {
    sessionStorage.removeItem("mv_cache_categorias");
    sessionStorage.removeItem("mv_cache_conteos_cat");
  } catch (error) {
    // Ignorar errores de almacenamiento
  }
}

/**
 * Wrapper de fetch: arma la URL completa, parsea el JSON, y lanza un
 * error legible si algo sale mal — así cada función que lo use no
 * tiene que repetir el mismo try/catch de bajo nivel.
 * Incluye deduplicación de peticiones GET en vuelo (inFlightRequests).
 */
async function apiFetch(ruta, opciones = {}) {
  const metodo = (opciones.method || "GET").toUpperCase();
  const claveVuelo = metodo === "GET" ? `data:${ruta}` : null;

  if (claveVuelo && inFlightRequests.has(claveVuelo)) {
    return inFlightRequests.get(claveVuelo);
  }

  const promesa = (async () => {
    const respuesta = await fetch(`${API_URL}${ruta}`, opciones);
    const datos = await respuesta.json();

    if (!respuesta.ok || datos.success === false) {
      throw new Error(datos.message || "Error al conectar con el servidor");
    }

    return datos.data;
  })();

  if (claveVuelo) {
    inFlightRequests.set(claveVuelo, promesa);
    promesa.finally(() => inFlightRequests.delete(claveVuelo));
  }

  return promesa;
}

// Igual que apiFetch, pero devuelve la respuesta COMPLETA en vez de solo
// "data" — lo necesitamos en /productos porque ahí el backend también
// manda un bloque "paginacion" al lado de "data".
async function apiFetchCompleto(ruta, opciones = {}) {
  const metodo = (opciones.method || "GET").toUpperCase();
  const claveVuelo = metodo === "GET" ? `full:${ruta}` : null;

  if (claveVuelo && inFlightRequests.has(claveVuelo)) {
    return inFlightRequests.get(claveVuelo);
  }

  const promesa = (async () => {
    const respuesta = await fetch(`${API_URL}${ruta}`, opciones);
    const datos = await respuesta.json();

    if (!respuesta.ok || datos.success === false) {
      throw new Error(datos.message || "Error al conectar con el servidor");
    }

    return datos;
  })();

  if (claveVuelo) {
    inFlightRequests.set(claveVuelo, promesa);
    promesa.finally(() => inFlightRequests.delete(claveVuelo));
  }

  return promesa;
}

// Arma un query string a partir de un objeto, ignorando valores
// undefined/null/vacíos (así no mandamos "?categoria=" sin valor).
function construirQueryString(parametros = {}) {
  const query = new URLSearchParams();
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") {
      query.set(clave, valor);
    }
  });
  const texto = query.toString();
  return texto ? `?${texto}` : "";
}

const api = {
  // opciones (todas opcionales): { page, limit, categoria, orden, busqueda }
  // Devuelve { productos, paginacion }. "paginacion" trae { pagina,
  // total_paginas, total_productos } tal como lo manda el backend.
  obtenerProductos: async (opciones = {}) => {
    const query = construirQueryString(opciones);
    const datos = await apiFetchCompleto(`/productos${query}`);
    return { productos: datos.data, paginacion: datos.paginacion || null };
  },
  obtenerProducto: async (id) => {
    const clave = String(id);
    const enMemoria = cacheDetalleProducto.get(clave);
    if (enMemoria && Date.now() - enMemoria.ts <= CACHE_TTL_MS) {
      return enMemoria.data;
    }
    const data = await apiFetch(`/productos/${id}`);
    cacheDetalleProducto.set(clave, { ts: Date.now(), data });
    return data;
  },
  obtenerCategorias: async () => {
    const cacheado = leerCacheSesion("mv_cache_categorias");
    if (cacheado) return cacheado;
    const data = await apiFetch("/categorias");
    guardarCacheSesion("mv_cache_categorias", data);
    return data;
  },
  obtenerConfig: async () => {
    const cacheado = leerCacheSesion("mv_cache_config");
    if (cacheado) return cacheado;
    const data = await apiFetch("/config");
    guardarCacheSesion("mv_cache_config", data);
    return data;
  },
  // Devuelve { token, usuario: { id_usuario, nombre, correo, rol } } —
  // mismo patrón apiFetch que el resto (lanza error con el mensaje del
  // backend si las credenciales son incorrectas).
  login: (correo, contrasena) =>
    apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, contrasena }),
    }),

  // ---------- Panel administrativo (rutas protegidas) ----------
  // Todas agregan el token guardado vía encabezadosAutenticados() e
  // invalidan la caché local al completarse para reflejar cambios al instante.
  crearProducto: async (datos) => {
    const res = await apiFetch("/productos", {
      method: "POST",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    });
    limpiarCacheCatalogo();
    return res;
  },
  actualizarProducto: async (id, datos) => {
    const res = await apiFetch(`/productos/${id}`, {
      method: "PUT",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    });
    limpiarCacheCatalogo();
    return res;
  },
  eliminarProducto: async (id) => {
    const res = await apiFetch(`/productos/${id}`, {
      method: "DELETE",
      headers: encabezadosAutenticados(),
    });
    limpiarCacheCatalogo();
    return res;
  },
  actualizarStock: async (id, cantidad) => {
    const res = await apiFetch(`/productos/${id}/stock`, {
      method: "PUT",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify({ cantidad }),
    });
    limpiarCacheCatalogo();
    return res;
  },
  // "archivo" es un File (el que sale de un <input type="file">). Nunca se
  // fija "Content-Type" a mano: el navegador arma el boundary correcto del
  // multipart/form-data solo si se lo dejamos.
  subirImagenProducto: async (idProducto, archivo) => {
    const formulario = new FormData();
    formulario.append("imagen", archivo);
    const res = await apiFetch(`/productos/${idProducto}/imagenes`, {
      method: "POST",
      headers: encabezadosAutenticados(),
      body: formulario,
    });
    limpiarCacheCatalogo();
    return res;
  },
  eliminarImagenProducto: async (idImagen) => {
    const res = await apiFetch(`/imagenes/${idImagen}`, {
      method: "DELETE",
      headers: encabezadosAutenticados(),
    });
    limpiarCacheCatalogo();
    return res;
  },
  crearCategoria: async (datos) => {
    const res = await apiFetch("/categorias", {
      method: "POST",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    });
    limpiarCacheCatalogo();
    return res;
  },
  actualizarCategoria: async (id, datos) => {
    const res = await apiFetch(`/categorias/${id}`, {
      method: "PUT",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    });
    limpiarCacheCatalogo();
    return res;
  },
  eliminarCategoria: async (id) => {
    const res = await apiFetch(`/categorias/${id}`, {
      method: "DELETE",
      headers: encabezadosAutenticados(),
    });
    limpiarCacheCatalogo();
    return res;
  },
};

// ---------- Sesión (Administrador / Super Administrador) ----------
const TOKEN_STORAGE_KEY = "mv_token";
const USUARIO_STORAGE_KEY = "mv_usuario";

function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USUARIO_STORAGE_KEY, JSON.stringify(usuario));
}

function haySesionActiva() {
  return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
}

function obtenerUsuarioActual() {
  try {
    const guardado = localStorage.getItem(USUARIO_STORAGE_KEY);
    return guardado ? JSON.parse(guardado) : null;
  } catch (error) {
    return null;
  }
}

function cerrarSesion() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USUARIO_STORAGE_KEY);
  window.location.href = "login.html";
}

function encabezadosAutenticados(extra = {}) {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}
