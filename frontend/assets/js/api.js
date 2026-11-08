// Un solo lugar para saber dónde vive el backend. Cuando despleguemos
// en producción (Agente 8), esta es la ÚNICA línea que hay que cambiar.
const API_BASE_URL = "https://mil-variedades.onrender.com/api";

/**
 * Wrapper de fetch: arma la URL completa, parsea el JSON, y lanza un
 * error legible si algo sale mal — así cada función que lo use no
 * tiene que repetir el mismo try/catch de bajo nivel.
 */
async function apiFetch(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, opciones);
  const datos = await respuesta.json();

  if (!respuesta.ok || datos.success === false) {
    throw new Error(datos.message || "Error al conectar con el servidor");
  }

  return datos.data;
}

// Igual que apiFetch, pero devuelve la respuesta COMPLETA en vez de solo
// "data" — lo necesitamos en /productos porque ahí el backend también
// manda un bloque "paginacion" al lado de "data".
async function apiFetchCompleto(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, opciones);
  const datos = await respuesta.json();

  if (!respuesta.ok || datos.success === false) {
    throw new Error(datos.message || "Error al conectar con el servidor");
  }

  return datos;
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
  obtenerProducto: (id) => apiFetch(`/productos/${id}`),
  obtenerCategorias: () => apiFetch("/categorias"),
  obtenerConfig: () => apiFetch("/config"),
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
  // Todas agregan el token guardado vía encabezadosAutenticados(). Si el
  // token falta o venció, el backend responde 401/403 con su mensaje de
  // siempre — apiFetch lo lanza como error normal, y panel.js decide qué
  // hacer con eso (ver manejarErrorSesion).
  crearProducto: (datos) =>
    apiFetch("/productos", {
      method: "POST",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    }),
  actualizarProducto: (id, datos) =>
    apiFetch(`/productos/${id}`, {
      method: "PUT",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    }),
  eliminarProducto: (id) =>
    apiFetch(`/productos/${id}`, { method: "DELETE", headers: encabezadosAutenticados() }),
  actualizarStock: (id, cantidad) =>
    apiFetch(`/productos/${id}/stock`, {
      method: "PUT",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify({ cantidad }),
    }),
  // "archivo" es un File (el que sale de un <input type="file">). Nunca se
  // fija "Content-Type" a mano: el navegador arma el boundary correcto del
  // multipart/form-data solo si se lo dejamos.
  subirImagenProducto: (idProducto, archivo) => {
    const formulario = new FormData();
    formulario.append("imagen", archivo);
    return apiFetch(`/productos/${idProducto}/imagenes`, {
      method: "POST",
      headers: encabezadosAutenticados(),
      body: formulario,
    });
  },
  eliminarImagenProducto: (idImagen) =>
    apiFetch(`/imagenes/${idImagen}`, { method: "DELETE", headers: encabezadosAutenticados() }),
  crearCategoria: (datos) =>
    apiFetch("/categorias", {
      method: "POST",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    }),
  actualizarCategoria: (id, datos) =>
    apiFetch(`/categorias/${id}`, {
      method: "PUT",
      headers: encabezadosAutenticados({ "Content-Type": "application/json" }),
      body: JSON.stringify(datos),
    }),
  eliminarCategoria: (id) =>
    apiFetch(`/categorias/${id}`, { method: "DELETE", headers: encabezadosAutenticados() }),
};

// ---------- Sesión (Administrador / Super Administrador) ----------
// Base de sesión para el futuro panel administrativo (todavía no
// construido) — solo guarda/lee el token, no construye ninguna pantalla.
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

// Arma los headers para una petición protegida, agregando el token
// guardado como Bearer. Si no hay token, la petición sale igual (sin
// Authorization) y el backend la rechaza con 401 — no hay que duplicar
// esa validación aquí.
function encabezadosAutenticados(extra = {}) {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}
