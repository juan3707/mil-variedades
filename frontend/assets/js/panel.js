// ============================================================
// MIL VARIEDADES — panel.js
// Panel administrativo (Administrador / Super Administrador).
// Nunca se muestra sin sesión activa: lo primero que hace este archivo
// es verificar el token guardado y redirigir a login.html si no hay.
// Regla del proyecto: nunca innerHTML con datos del backend (evita XSS).
// ============================================================

let categoriasCargadas = [];
let productosCargados = [];
let paginaProductos = 1;
let paginacionProductos = { pagina: 1, total_paginas: 1, total_productos: 0 };
const LIMITE_PRODUCTOS_PANEL = 20;

const formateadorPrecio = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", () => {
  if (!haySesionActiva()) {
    window.location.href = "login.html";
    return;
  }

  mostrarUsuarioActual();
  activarTabs();
  activarCierreSesion();
  activarModalProducto();
  activarModalCategoria();

  cargarCategorias();
  cargarProductos();
});

// Cualquier error de una llamada protegida pasa por aquí. Si el mensaje
// indica un problema de sesión (token vencido/ausente o sin permisos), se
// cierra sesión y se manda a login.html en vez de dejar al usuario viendo
// una pantalla rota. Para cualquier otro error, se devuelve el mensaje
// para mostrarlo tal cual viene del backend.
function manejarErrorSesion(error) {
  const mensaje = error && error.message ? error.message : "Ocurrió un error inesperado";
  const pistasDeSesion = ["token", "autorizado", "permisos"];
  if (pistasDeSesion.some((pista) => mensaje.toLowerCase().includes(pista))) {
    cerrarSesion();
    return null;
  }
  return mensaje;
}

function normalizarTextoUTF8(texto) {
  if (!texto) return "";
  return String(texto)
    .replace(/├▒|Ã±|\uFFFD/g, "ñ")
    .replace(/├Ñ|Ã‘/g, "Ñ")
    .replace(/├¡|Ã¡/g, "á")
    .replace(/├©|Ã©/g, "é")
    .replace(/├í|Ã­/g, "í")
    .replace(/├³|Ã³/g, "ó")
    .replace(/├º|Ãº/g, "ú");
}

function mostrarUsuarioActual() {
  const usuario = obtenerUsuarioActual();
  const nombreEl = document.getElementById("panel-usuario-nombre");
  const rolEl = document.getElementById("panel-usuario-rol");
  if (!usuario) return;
  const esSuperAdmin = usuario.rol === "super_admin";
  nombreEl.textContent = esSuperAdmin
    ? "Paola Sosa"
    : normalizarTextoUTF8(usuario.nombre || usuario.correo || "Paola Sosa");
  rolEl.textContent = esSuperAdmin ? "Super Administradora" : "Administrador";
}

function activarCierreSesion() {
  document.getElementById("btn-cerrar-sesion").addEventListener("click", () => cerrarSesion());
}

// ---------- Tabs (Productos / Categorías) ----------
function activarTabs() {
  const tabProductos = document.getElementById("tab-productos");
  const tabCategorias = document.getElementById("tab-categorias");
  const seccionProductos = document.getElementById("seccion-productos");
  const seccionCategorias = document.getElementById("seccion-categorias");

  tabProductos.addEventListener("click", () => {
    tabProductos.classList.add("activo");
    tabCategorias.classList.remove("activo");
    seccionProductos.style.display = "block";
    seccionCategorias.style.display = "none";
  });

  tabCategorias.addEventListener("click", () => {
    tabCategorias.classList.add("activo");
    tabProductos.classList.remove("activo");
    seccionCategorias.style.display = "block";
    seccionProductos.style.display = "none";
  });
}

// ============================================================
// CATEGORÍAS
// ============================================================

async function cargarCategorias() {
  try {
    categoriasCargadas = await api.obtenerCategorias();
    renderizarSelectCategorias();
    renderizarTablaCategorias();
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) mostrarErrorTabla("tabla-categorias-body", 3, mensaje);
  }
}

function renderizarSelectCategorias() {
  const select = document.getElementById("producto-categoria");
  select.innerHTML = "";
  categoriasCargadas.forEach((categoria) => {
    const opcion = document.createElement("option");
    opcion.value = categoria.id_categoria;
    opcion.textContent = categoria.nombre;
    select.appendChild(opcion);
  });
}

function renderizarTablaCategorias() {
  const cuerpo = document.getElementById("tabla-categorias-body");
  cuerpo.innerHTML = "";

  document.getElementById("contador-categorias").textContent =
    `${categoriasCargadas.length} categoría${categoriasCargadas.length === 1 ? "" : "s"}`;
  const resumenCat = document.getElementById("resumen-pie-categorias");
  if (resumenCat) {
    resumenCat.textContent = `Mostrando ${categoriasCargadas.length} de ${categoriasCargadas.length} registros`;
  }

  if (categoriasCargadas.length === 0) {
    mostrarErrorTabla("tabla-categorias-body", 3, "Todavía no hay categorías.");
    return;
  }

  categoriasCargadas.forEach((categoria) => {
    const fila = document.createElement("tr");

    const tdNombre = document.createElement("td");
    const nombreStrong = document.createElement("strong");
    nombreStrong.className = "panel-cat-nombre";
    nombreStrong.textContent = categoria.nombre;
    tdNombre.appendChild(nombreStrong);
    fila.appendChild(tdNombre);

    const tdDescripcion = document.createElement("td");
    const descSpan = document.createElement("span");
    descSpan.className = "panel-cat-desc";
    descSpan.textContent = categoria.descripcion || "—";
    tdDescripcion.appendChild(descSpan);
    fila.appendChild(tdDescripcion);

    const tdAcciones = document.createElement("td");
    const accionesWrap = document.createElement("div");
    accionesWrap.className = "panel-tabla-acciones";
    accionesWrap.appendChild(crearBotonAccion("fa-pen", "Editar", () => abrirModalCategoria("editar", categoria)));
    accionesWrap.appendChild(
      crearBotonAccion("fa-trash", "Eliminar", () => eliminarCategoriaConfirmar(categoria), true)
    );
    tdAcciones.appendChild(accionesWrap);
    fila.appendChild(tdAcciones);

    cuerpo.appendChild(fila);
  });
}

function abrirModalCategoria(modo, categoria) {
  document.getElementById("categoria-id").value = modo === "editar" ? categoria.id_categoria : "";
  document.getElementById("categoria-nombre").value = modo === "editar" ? categoria.nombre : "";
  document.getElementById("categoria-descripcion").value = modo === "editar" ? categoria.descripcion || "" : "";
  document.getElementById("modal-categoria-titulo").textContent = modo === "editar" ? "Editar categoría" : "Nueva categoría";
  ocultarErrorForm("categoria-error");

  document.getElementById("modal-categoria-overlay").classList.add("abierto");
  document.getElementById("modal-categoria").classList.add("abierto");
}

function cerrarModalCategoria() {
  document.getElementById("modal-categoria-overlay").classList.remove("abierto");
  document.getElementById("modal-categoria").classList.remove("abierto");
}

function activarModalCategoria() {
  document.getElementById("btn-nueva-categoria").addEventListener("click", () => abrirModalCategoria("crear"));
  document.getElementById("modal-categoria-overlay").addEventListener("click", cerrarModalCategoria);
  document.getElementById("modal-categoria-cerrar").addEventListener("click", cerrarModalCategoria);
  document.getElementById("btn-cancelar-categoria").addEventListener("click", cerrarModalCategoria);

  document.getElementById("form-categoria").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    ocultarErrorForm("categoria-error");

    const id = document.getElementById("categoria-id").value;
    const datos = {
      nombre: document.getElementById("categoria-nombre").value.trim(),
      descripcion: document.getElementById("categoria-descripcion").value.trim() || null,
    };

    const boton = document.getElementById("btn-guardar-categoria");
    boton.disabled = true;
    try {
      if (id) {
        await api.actualizarCategoria(id, datos);
      } else {
        await api.crearCategoria(datos);
      }
      cerrarModalCategoria();
      await cargarCategorias();
    } catch (error) {
      const mensaje = manejarErrorSesion(error);
      if (mensaje) mostrarErrorForm("categoria-error", mensaje);
    } finally {
      boton.disabled = false;
    }
  });
}

async function eliminarCategoriaConfirmar(categoria) {
  const confirmado = window.confirm(
    `¿Eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`
  );
  if (!confirmado) return;

  try {
    await api.eliminarCategoria(categoria.id_categoria);
    await cargarCategorias();
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) window.alert(mensaje); // ej: "No se puede eliminar: hay N producto(s) usando esta categoría"
  }
}

// ============================================================
// PRODUCTOS
// ============================================================

async function cargarProductos() {
  const cuerpo = document.getElementById("tabla-productos-body");
  cuerpo.innerHTML = '<tr><td colspan="6" class="panel-tabla-vacia">Cargando…</td></tr>';
  document.getElementById("contador-productos").textContent = "Cargando productos…";

  try {
    const { productos, paginacion } = await api.obtenerProductos({
      page: paginaProductos,
      limit: LIMITE_PRODUCTOS_PANEL,
    });
    productosCargados = productos;
    paginacionProductos = paginacion || { pagina: 1, total_paginas: 1, total_productos: productos.length };

    document.getElementById("contador-productos").textContent =
      `${paginacionProductos.total_productos} producto${paginacionProductos.total_productos === 1 ? "" : "s"}`;
    const resumenProd = document.getElementById("resumen-pie-productos");
    if (resumenProd) {
      const inicio = productos.length > 0 ? (paginacionProductos.pagina - 1) * LIMITE_PRODUCTOS_PANEL + 1 : 0;
      const fin = inicio > 0 ? inicio + productos.length - 1 : 0;
      resumenProd.textContent = `Mostrando ${inicio} a ${fin} de ${paginacionProductos.total_productos} resultados`;
    }

    renderizarTablaProductos();
    renderizarPaginacionProductos();
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) mostrarErrorTabla("tabla-productos-body", 6, mensaje);
  }
}

function claseTonoCategoria(nombreCat) {
  const clave = (nombreCat || "").toLowerCase();
  if (clave.includes("papel") || clave.includes("oficina")) return " cat-tono-1";
  if (clave.includes("escolar") || clave.includes("util") || clave.includes("útil")) return " cat-tono-2";
  if (clave.includes("aseo") || clave.includes("limpieza")) return " cat-tono-3";
  return "";
}

function renderizarTablaProductos() {
  const cuerpo = document.getElementById("tabla-productos-body");
  cuerpo.innerHTML = "";

  if (productosCargados.length === 0) {
    mostrarErrorTabla("tabla-productos-body", 6, "Todavía no hay productos.");
    return;
  }

  productosCargados.forEach((producto) => {
    const fila = document.createElement("tr");

    const tdNombre = document.createElement("td");
    const celdaProd = document.createElement("div");
    celdaProd.className = "panel-prod-celda";
    const nombreStrong = document.createElement("strong");
    nombreStrong.className = "panel-prod-nombre";
    nombreStrong.textContent = producto.nombre;
    celdaProd.appendChild(nombreStrong);
    if (producto.descripcion) {
      const descSpan = document.createElement("span");
      descSpan.className = "panel-prod-desc";
      descSpan.textContent = producto.descripcion;
      celdaProd.appendChild(descSpan);
    }
    tdNombre.appendChild(celdaProd);
    fila.appendChild(tdNombre);

    const tdCategoria = document.createElement("td");
    const badgeCat = document.createElement("span");
    badgeCat.className = "panel-badge-categoria" + claseTonoCategoria(producto.categoria);
    badgeCat.textContent = producto.categoria || "General";
    tdCategoria.appendChild(badgeCat);
    fila.appendChild(tdCategoria);

    const tdPrecio = document.createElement("td");
    const precioStrong = document.createElement("strong");
    precioStrong.className = "panel-prod-precio";
    precioStrong.textContent = formateadorPrecio.format(Number(producto.precio));
    tdPrecio.appendChild(precioStrong);
    fila.appendChild(tdPrecio);

    const tdStock = document.createElement("td");
    const stockSpan = document.createElement("span");
    if (producto.stock === undefined || producto.stock === null) {
      stockSpan.className = "panel-prod-stock";
      stockSpan.textContent = "—";
    } else if (Number(producto.stock) > 0) {
      stockSpan.className = "panel-badge-foto con-foto";
      stockSpan.textContent = `${producto.stock} uds`;
    } else {
      stockSpan.className = "panel-badge-foto stock-agotado";
      stockSpan.textContent = "0 (Agotado)";
    }
    tdStock.appendChild(stockSpan);
    fila.appendChild(tdStock);

    const tdFotos = document.createElement("td");
    const badgeFoto = document.createElement("span");
    if (producto.imagen_portada) {
      badgeFoto.className = "panel-badge-foto con-foto";
      const iconoFoto = document.createElement("i");
      iconoFoto.className = "fa-regular fa-image";
      badgeFoto.appendChild(iconoFoto);
      badgeFoto.appendChild(document.createTextNode(" Sí"));
    } else {
      badgeFoto.className = "panel-badge-foto sin-foto";
      badgeFoto.textContent = "Sin foto";
    }
    tdFotos.appendChild(badgeFoto);
    fila.appendChild(tdFotos);

    const tdAcciones = document.createElement("td");
    const accionesWrap = document.createElement("div");
    accionesWrap.className = "panel-tabla-acciones";
    accionesWrap.appendChild(
      crearBotonAccion("fa-pen", "Editar", () => abrirModalProductoEditar(producto.id_producto))
    );
    accionesWrap.appendChild(
      crearBotonAccion("fa-trash", "Eliminar", () => eliminarProductoConfirmar(producto), true)
    );
    tdAcciones.appendChild(accionesWrap);
    fila.appendChild(tdAcciones);

    cuerpo.appendChild(fila);
  });
}

function renderizarPaginacionProductos() {
  const contenedor = document.getElementById("paginacion-productos");
  contenedor.innerHTML = "";

  const pagina = paginacionProductos.pagina || 1;
  const totalPaginas = Math.max(1, paginacionProductos.total_paginas || 1);

  const btnAnterior = document.createElement("button");
  btnAnterior.type = "button";
  btnAnterior.className = "paginacion-flecha";
  btnAnterior.disabled = pagina <= 1;
  btnAnterior.textContent = "Anterior";
  btnAnterior.addEventListener("click", () => irAPaginaProductos(pagina - 1));
  contenedor.appendChild(btnAnterior);

  for (let n = 1; n <= totalPaginas; n += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "paginacion-numero" + (n === pagina ? " activo" : "");
    btn.textContent = n;
    btn.addEventListener("click", () => irAPaginaProductos(n));
    contenedor.appendChild(btn);
  }

  const btnSiguiente = document.createElement("button");
  btnSiguiente.type = "button";
  btnSiguiente.className = "paginacion-flecha";
  btnSiguiente.disabled = pagina >= totalPaginas;
  btnSiguiente.textContent = "Siguiente";
  btnSiguiente.addEventListener("click", () => irAPaginaProductos(pagina + 1));
  contenedor.appendChild(btnSiguiente);
}

function irAPaginaProductos(numero) {
  if (numero < 1 || numero > paginacionProductos.total_paginas || numero === paginacionProductos.pagina) return;
  paginaProductos = numero;
  cargarProductos();
}

// ---------- Modal crear/editar producto ----------
function activarModalProducto() {
  document.getElementById("btn-nuevo-producto").addEventListener("click", abrirModalProductoCrear);
  document.getElementById("modal-producto-overlay").addEventListener("click", cerrarModalProducto);
  document.getElementById("modal-producto-cerrar").addEventListener("click", cerrarModalProducto);
  document.getElementById("btn-cancelar-producto").addEventListener("click", cerrarModalProducto);
  document.getElementById("btn-subir-imagen").addEventListener("click", subirImagenDelModal);
  document.getElementById("form-producto").addEventListener("submit", guardarProducto);
}

function abrirModalProductoCrear() {
  document.getElementById("producto-id").value = "";
  document.getElementById("producto-nombre").value = "";
  document.getElementById("producto-descripcion").value = "";
  document.getElementById("producto-precio").value = "";
  document.getElementById("producto-stock").value = "";
  if (categoriasCargadas.length > 0) {
    document.getElementById("producto-categoria").value = categoriasCargadas[0].id_categoria;
  }
  document.getElementById("modal-producto-titulo").textContent = "Nuevo producto";
  document.getElementById("campo-stock").style.display = "none";
  document.getElementById("campo-imagenes").style.display = "none";
  document.getElementById("panel-imagenes-lista").innerHTML = "";
  ocultarErrorForm("producto-error");

  document.getElementById("modal-producto-overlay").classList.add("abierto");
  document.getElementById("modal-producto").classList.add("abierto");
}

async function abrirModalProductoEditar(idProducto) {
  document.getElementById("modal-producto-titulo").textContent = "Editar producto";
  document.getElementById("campo-stock").style.display = "block";
  document.getElementById("campo-imagenes").style.display = "block";
  ocultarErrorForm("producto-error");

  document.getElementById("modal-producto-overlay").classList.add("abierto");
  document.getElementById("modal-producto").classList.add("abierto");

  await cargarProductoEnModal(idProducto);
}

// Vuelve a pedir el producto al backend y llena el formulario — se usa
// tanto al abrir "Editar" como justo después de crear uno nuevo (para
// poder seguir agregando fotos/stock sin cerrar y reabrir el modal).
async function cargarProductoEnModal(idProducto) {
  try {
    const producto = await api.obtenerProducto(idProducto);
    document.getElementById("producto-id").value = producto.id_producto;
    document.getElementById("producto-nombre").value = producto.nombre;
    document.getElementById("producto-descripcion").value = producto.descripcion || "";
    document.getElementById("producto-precio").value = producto.precio;
    document.getElementById("producto-categoria").value = producto.id_categoria;
    document.getElementById("producto-stock").value = producto.stock !== undefined ? producto.stock : 0;
    renderizarImagenesModal(producto.imagenes || []);
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) mostrarErrorForm("producto-error", mensaje);
  }
}

function cerrarModalProducto() {
  document.getElementById("modal-producto-overlay").classList.remove("abierto");
  document.getElementById("modal-producto").classList.remove("abierto");
}

function renderizarImagenesModal(imagenes) {
  const lista = document.getElementById("panel-imagenes-lista");
  lista.innerHTML = "";

  if (imagenes.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "panel-imagenes-vacio";
    vacio.textContent = "Este producto todavía no tiene fotos.";
    lista.appendChild(vacio);
    return;
  }

  imagenes.forEach((imagen) => {
    const item = document.createElement("div");
    item.className = "panel-imagen-item";

    const img = document.createElement("img");
    img.src = resolverUrlRecurso(imagen.url_imagen);
    img.alt = "";
    item.appendChild(img);

    const btnQuitar = document.createElement("button");
    btnQuitar.type = "button";
    btnQuitar.className = "panel-imagen-quitar";
    btnQuitar.setAttribute("aria-label", "Eliminar esta foto");
    btnQuitar.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    btnQuitar.addEventListener("click", () => eliminarImagenDelModal(imagen.id_imagen));
    item.appendChild(btnQuitar);

    lista.appendChild(item);
  });
}

async function subirImagenDelModal() {
  const idProducto = document.getElementById("producto-id").value;
  const inputArchivo = document.getElementById("producto-imagen-archivo");
  if (!idProducto) return; // no debería pasar: el bloque de fotos solo se ve en modo editar
  if (!inputArchivo.files || inputArchivo.files.length === 0) {
    mostrarErrorForm("producto-error", "Elige un archivo de imagen primero.");
    return;
  }

  const boton = document.getElementById("btn-subir-imagen");
  boton.disabled = true;
  try {
    await api.subirImagenProducto(idProducto, inputArchivo.files[0]);
    inputArchivo.value = "";
    await cargarProductoEnModal(idProducto); // refresca la lista de fotos
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) mostrarErrorForm("producto-error", mensaje);
  } finally {
    boton.disabled = false;
  }
}

async function eliminarImagenDelModal(idImagen) {
  const idProducto = document.getElementById("producto-id").value;
  try {
    await api.eliminarImagenProducto(idImagen);
    await cargarProductoEnModal(idProducto);
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) mostrarErrorForm("producto-error", mensaje);
  }
}

async function guardarProducto(evento) {
  evento.preventDefault();
  ocultarErrorForm("producto-error");

  const id = document.getElementById("producto-id").value;
  const datos = {
    nombre: document.getElementById("producto-nombre").value.trim(),
    descripcion: document.getElementById("producto-descripcion").value.trim() || null,
    precio: Number(document.getElementById("producto-precio").value),
    id_categoria: Number(document.getElementById("producto-categoria").value),
  };

  const boton = document.getElementById("btn-guardar-producto");
  boton.disabled = true;

  try {
    if (id) {
      await api.actualizarProducto(id, datos);
      const stockNuevo = document.getElementById("producto-stock").value;
      if (stockNuevo !== "") {
        await api.actualizarStock(id, Number(stockNuevo));
      }
      cerrarModalProducto();
      await cargarProductos();
    } else {
      const creado = await api.crearProducto(datos);
      // En vez de cerrar, se pasa el modal a modo "editar" del producto
      // recién creado, para que se puedan agregar fotos y stock de una
      // vez sin tener que volver a abrirlo.
      document.getElementById("modal-producto-titulo").textContent = "Editar producto";
      document.getElementById("campo-stock").style.display = "block";
      document.getElementById("campo-imagenes").style.display = "block";
      await cargarProductoEnModal(creado.id_producto);
      await cargarProductos();
    }
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) mostrarErrorForm("producto-error", mensaje);
  } finally {
    boton.disabled = false;
  }
}

async function eliminarProductoConfirmar(producto) {
  const confirmado = window.confirm(
    `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`
  );
  if (!confirmado) return;

  try {
    await api.eliminarProducto(producto.id_producto);
    await cargarProductos();
  } catch (error) {
    const mensaje = manejarErrorSesion(error);
    if (mensaje) window.alert(mensaje);
  }
}

// ============================================================
// Helpers compartidos (tabla, botones, mensajes de error de formulario)
// ============================================================

function crearBotonAccion(icono, etiqueta, accion, destructivo) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "panel-btn-accion" + (destructivo ? " destructivo" : "");
  boton.setAttribute("aria-label", etiqueta);
  boton.innerHTML = `<i class="fa-solid ${icono}"></i>`;
  boton.addEventListener("click", accion);
  return boton;
}

function mostrarErrorTabla(idTbody, columnas, mensaje) {
  const cuerpo = document.getElementById(idTbody);
  cuerpo.innerHTML = "";
  const fila = document.createElement("tr");
  const celda = document.createElement("td");
  celda.colSpan = columnas;
  celda.className = "panel-tabla-vacia";
  celda.textContent = mensaje;
  fila.appendChild(celda);
  cuerpo.appendChild(fila);
}

function mostrarErrorForm(idElemento, mensaje) {
  const el = document.getElementById(idElemento);
  el.textContent = mensaje;
  el.style.display = "block";
}

function ocultarErrorForm(idElemento) {
  const el = document.getElementById(idElemento);
  el.style.display = "none";
  el.textContent = "";
}
