// ============================================================
// MIL VARIEDADES — catalogo.js
// Panel de filtros SIEMPRE desplegable (nunca fijo ocupando espacio),
// filtro por categoría, orden por precio/nombre, banner de categoría activa.
// Categoría, orden y búsqueda ahora se resuelven en el backend junto con
// la paginación (page/limit) — este archivo ya NO carga "todo el catálogo"
// de una sola vez, solo la página actual según los filtros activos.
// Regla del proyecto: nunca innerHTML con datos del backend (evita XSS).
// ============================================================

let numeroWhatsapp = "";
let mensajeWhatsappDefault = "";
let productosCargados = []; // SOLO la página actual, no todo el catálogo
let productoModalActual = null;
let categoriasCargadas = [];
let categoriaActivaId = "todos";
let terminoBusqueda = "";
let ordenActivo = "relevancia";
let paginaActual = 1;
let paginacionActual = { pagina: 1, total_paginas: 1, total_productos: 0 };

const LIMITE_PAGINA = 20; // coincide con el valor por defecto del backend

const formateadorPrecio = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const ICONOS_CATEGORIA = {
  papeleria: "fa-pencil", escolar: "fa-school", aseo: "fa-spray-can-sparkles",
  limpieza: "fa-spray-can-sparkles", oficina: "fa-briefcase", tecnologia: "fa-laptop", default: "fa-shapes",
};
const COLORES_CATEGORIA = ["#d62828", "#2b6cb0", "#f4b400", "#1da851"];

function iconoParaCategoria(nombre) {
  const clave = (nombre || "").toLowerCase();
  if (clave.includes("papel")) return ICONOS_CATEGORIA.papeleria;
  if (clave.includes("escolar")) return ICONOS_CATEGORIA.escolar;
  if (clave.includes("aseo") || clave.includes("limpieza")) return ICONOS_CATEGORIA.aseo;
  if (clave.includes("oficina")) return ICONOS_CATEGORIA.oficina;
  if (clave.includes("tecnolog")) return ICONOS_CATEGORIA.tecnologia;
  return ICONOS_CATEGORIA.default;
}

function colorParaCategoria(idCategoria) {
  const indice = categoriasCargadas.findIndex((c) => String(c.id_categoria) === String(idCategoria));
  if (indice === -1) return COLORES_CATEGORIA[0];
  return COLORES_CATEGORIA[indice % COLORES_CATEGORIA.length];
}

document.addEventListener("DOMContentLoaded", () => {
  const parametros = new URLSearchParams(window.location.search);
  const categoriaInicial = parametros.get("categoria");
  if (categoriaInicial) categoriaActivaId = categoriaInicial;

  // Soporta llegar desde index.html con un término de búsqueda ya elegido
  // (ej: catalogo.html?busqueda=cuaderno), dejando el input ya lleno.
  const busquedaInicial = parametros.get("busqueda");
  if (busquedaInicial) {
    terminoBusqueda = busquedaInicial.trim().toLowerCase();
    const input = document.getElementById("input-busqueda");
    if (input) input.value = busquedaInicial;
  }

  cargarConfiguracion();
  cargarCategorias();
  cargarProductos();
  activarSidebar();
  activarPanelFiltros();
  activarBusqueda();
  activarScrollTop();
  activarModalProducto();
  activarOrden();
});

async function cargarConfiguracion() {
  try {
    const config = await api.obtenerConfig();
    const numeroConfig = config.find((c) => c.nombre === "whatsapp_numero");
    const mensajeConfig = config.find((c) => c.nombre === "whatsapp_mensaje_default");
    numeroWhatsapp = numeroConfig ? numeroConfig.valor : "";
    mensajeWhatsappDefault = mensajeConfig ? mensajeConfig.valor : "Hola, estoy interesado en un producto de Mil Variedades";

    const enlace = construirEnlaceWhatsapp();
    ["btn-whatsapp-header", "whatsapp-flotante", "sidebar-whatsapp", "footer-whatsapp"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = enlace;
    });
    const footerNumero = document.getElementById("footer-numero");
    if (footerNumero) footerNumero.textContent = numeroWhatsapp ? `+${numeroWhatsapp}` : "";
  } catch (error) {
    console.error("No se pudo cargar la configuración:", error.message);
  }
}

function construirEnlaceWhatsapp(mensajePersonalizado) {
  const mensaje = mensajePersonalizado || mensajeWhatsappDefault;
  return `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensaje)}`;
}

// Categorías: se cargan UNA sola vez (no cambian con la paginación de
// productos). Separado de cargarProductos() a propósito.
async function cargarCategorias() {
  const listaFiltro = document.getElementById("filtro-categoria-lista");
  const sidebarLista = document.getElementById("sidebar-cat-lista");

  try {
    categoriasCargadas = await api.obtenerCategorias();

    sidebarLista.innerHTML = "";

    categoriasCargadas.forEach((categoria) => {
      const label = document.createElement("label");
      label.className = "filtro-categoria-item";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "filtro-categoria";
      input.value = categoria.id_categoria;
      if (String(categoriaActivaId) === String(categoria.id_categoria)) input.checked = true;
      input.addEventListener("change", () => aplicarFiltroCategoria(categoria.id_categoria));
      label.appendChild(input);
      const texto = document.createElement("span");
      texto.textContent = categoria.nombre;
      label.appendChild(texto);
      listaFiltro.appendChild(label);

      const enlace = document.createElement("a");
      enlace.href = `catalogo.html?categoria=${categoria.id_categoria}`;
      const icono = document.createElement("i");
      icono.className = `fa-solid ${iconoParaCategoria(categoria.nombre)}`;
      enlace.appendChild(icono);
      const spanTexto = document.createElement("span");
      spanTexto.textContent = categoria.nombre;
      enlace.appendChild(spanTexto);
      sidebarLista.appendChild(enlace);
    });

    if (categoriaActivaId !== "todos") {
      const radioTodos = document.querySelector('input[name="filtro-categoria"][value="todos"]');
      if (radioTodos) radioTodos.checked = false;
    }

    actualizarBannerCategoria();
  } catch (error) {
    console.error("No se pudieron cargar las categorías:", error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const radioTodos = document.querySelector('input[name="filtro-categoria"][value="todos"]');
  if (radioTodos) radioTodos.addEventListener("change", () => aplicarFiltroCategoria("todos"));

  document.getElementById("btn-limpiar-filtros").addEventListener("click", () => {
    document.getElementById("select-orden").value = "relevancia";
    ordenActivo = "relevancia";
    terminoBusqueda = "";
    const inputBusqueda = document.getElementById("input-busqueda");
    if (inputBusqueda) inputBusqueda.value = "";
    const radioTodos2 = document.querySelector('input[name="filtro-categoria"][value="todos"]');
    if (radioTodos2) radioTodos2.checked = true;
    aplicarFiltroCategoria("todos"); // ya reinicia la página y vuelve a cargar
  });
});

// Cualquier cambio de filtro vuelve siempre a la página 1 — no tendría
// sentido quedarse en "página 4" de un filtro nuevo que puede tener
// muchas menos páginas.
function aplicarFiltroCategoria(idCategoria) {
  categoriaActivaId = idCategoria;
  paginaActual = 1;
  actualizarBannerCategoria();
  cargarProductos();
  cerrarPanelFiltros();
}

function actualizarBannerCategoria() {
  const banner = document.getElementById("categoria-banner");
  if (categoriaActivaId === "todos") {
    banner.style.display = "none";
    return;
  }
  const categoria = categoriasCargadas.find((c) => String(c.id_categoria) === String(categoriaActivaId));
  if (!categoria) {
    banner.style.display = "none";
    return;
  }
  document.getElementById("categoria-banner-nombre").textContent = categoria.nombre;
  document.getElementById("categoria-banner-descripcion").textContent =
    categoria.descripcion || `Todos los productos de ${categoria.nombre}`;
  document.getElementById("categoria-banner-icono").innerHTML = "";
  const icono = document.createElement("i");
  icono.className = `fa-solid ${iconoParaCategoria(categoria.nombre)}`;
  document.getElementById("categoria-banner-icono").appendChild(icono);
  banner.style.display = "flex";
}

function activarOrden() {
  document.getElementById("select-orden").addEventListener("change", (evento) => {
    ordenActivo = evento.target.value;
    paginaActual = 1;
    cargarProductos();
  });
}

// ---------- Carga de productos (paginada, con filtros) ----------
// Reemplaza al viejo "cargar todo una vez y filtrar en el navegador":
// cada vez que cambia página, categoría, orden o búsqueda, se vuelve a
// pedir al backend solo lo que corresponde mostrar.
async function cargarProductos() {
  const contenedor = document.getElementById("lista-productos");
  contenedor.innerHTML = '<div class="estado-carga"><div class="spinner" aria-hidden="true"></div><p>Cargando catálogo…</p></div>';
  document.getElementById("contador-resultados").textContent = "Cargando productos…";

  try {
    const { productos, paginacion } = await api.obtenerProductos({
      page: paginaActual,
      limit: LIMITE_PAGINA,
      categoria: categoriaActivaId !== "todos" ? categoriaActivaId : undefined,
      orden: ordenActivo,
      busqueda: terminoBusqueda || undefined,
    });

    productosCargados = productos;
    paginacionActual = paginacion || { pagina: 1, total_paginas: 1, total_productos: productos.length };

    const total = paginacionActual.total_productos;
    document.getElementById("contador-resultados").textContent =
      `${total} producto${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}`;

    renderizarProductos(productosCargados);
    renderizarPaginacion();
  } catch (error) {
    mostrarError("No pudimos cargar el catálogo. Verifica que el servidor esté encendido.");
    console.error(error.message);
  }
}

function renderizarProductos(productos) {
  const contenedor = document.getElementById("lista-productos");
  contenedor.innerHTML = "";

  if (productos.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "estado-vacio";
    vacio.textContent = "No encontramos productos con ese criterio.";
    contenedor.appendChild(vacio);
    return;
  }
  productos.forEach((producto) => contenedor.appendChild(crearTarjetaProducto(producto)));
}

// ---------- Controles de paginación (números de página + flechas) ----------
function renderizarPaginacion() {
  const contenedor = document.getElementById("paginacion");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const { pagina, total_paginas: totalPaginas } = paginacionActual;
  if (totalPaginas <= 1) return; // con una sola página no hacen falta controles

  const btnAnterior = document.createElement("button");
  btnAnterior.type = "button";
  btnAnterior.className = "paginacion-flecha";
  btnAnterior.setAttribute("aria-label", "Página anterior");
  btnAnterior.disabled = pagina <= 1;
  const iconoAnterior = document.createElement("i");
  iconoAnterior.className = "fa-solid fa-chevron-left";
  btnAnterior.appendChild(iconoAnterior);
  btnAnterior.addEventListener("click", () => irAPagina(pagina - 1));
  contenedor.appendChild(btnAnterior);

  calcularPaginasVisibles(pagina, totalPaginas).forEach((entrada) => {
    if (entrada === "...") {
      const puntos = document.createElement("span");
      puntos.className = "paginacion-puntos";
      puntos.textContent = "…";
      contenedor.appendChild(puntos);
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "paginacion-numero" + (entrada === pagina ? " activo" : "");
    btn.textContent = entrada;
    btn.setAttribute("aria-label", `Ir a la página ${entrada}`);
    if (entrada === pagina) btn.setAttribute("aria-current", "page");
    btn.addEventListener("click", () => irAPagina(entrada));
    contenedor.appendChild(btn);
  });

  const btnSiguiente = document.createElement("button");
  btnSiguiente.type = "button";
  btnSiguiente.className = "paginacion-flecha";
  btnSiguiente.setAttribute("aria-label", "Página siguiente");
  btnSiguiente.disabled = pagina >= totalPaginas;
  const iconoSiguiente = document.createElement("i");
  iconoSiguiente.className = "fa-solid fa-chevron-right";
  btnSiguiente.appendChild(iconoSiguiente);
  btnSiguiente.addEventListener("click", () => irAPagina(pagina + 1));
  contenedor.appendChild(btnSiguiente);
}

// Arma la lista de números a mostrar, con "..." cuando hay demasiadas
// páginas para listarlas todas (siempre muestra primera, última, y una
// ventana alrededor de la página actual).
function calcularPaginasVisibles(actual, total) {
  const ventana = 1;
  const paginas = [];
  for (let n = 1; n <= total; n += 1) {
    const esBorde = n === 1 || n === total;
    const esCercana = n >= actual - ventana && n <= actual + ventana;
    if (esBorde || esCercana) {
      paginas.push(n);
    } else if (paginas[paginas.length - 1] !== "...") {
      paginas.push("...");
    }
  }
  return paginas;
}

function irAPagina(numero) {
  if (numero < 1 || numero > paginacionActual.total_paginas || numero === paginacionActual.pagina) return;
  paginaActual = numero;
  cargarProductos();
  const resultados = document.getElementById("lista-productos");
  if (resultados) resultados.scrollIntoView({ behavior: "smooth", block: "start" });
}

function crearTarjetaProducto(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "producto-card";
  tarjeta.addEventListener("click", () => abrirModalProducto(producto.id_producto));

  const imgWrap = document.createElement("div");
  imgWrap.className = "producto-img";
  if (producto.imagen_portada) {
    const img = document.createElement("img");
    img.src = `http://localhost:4000${producto.imagen_portada}`;
    img.alt = producto.nombre;
    img.loading = "lazy";
    imgWrap.appendChild(img);
  } else {
    const colorCategoria = colorParaCategoria(producto.id_categoria);
    const circulo = document.createElement("div");
    circulo.className = "producto-img-circulo";
    circulo.style.background = `${colorCategoria}22`;
    circulo.style.color = colorCategoria;
    const icono = document.createElement("i");
    icono.className = `fa-solid ${iconoParaCategoria(producto.categoria || "")}`;
    circulo.appendChild(icono);
    imgWrap.appendChild(circulo);
  }
  tarjeta.appendChild(imgWrap);

  const info = document.createElement("div");
  info.className = "producto-info";

  const categoriaEl = document.createElement("span");
  categoriaEl.className = "producto-categoria";
  categoriaEl.textContent = producto.categoria;
  info.appendChild(categoriaEl);

  const nombreEl = document.createElement("h3");
  nombreEl.className = "producto-nombre";
  nombreEl.textContent = producto.nombre;
  info.appendChild(nombreEl);

  const precioEl = document.createElement("span");
  precioEl.className = "producto-precio";
  precioEl.textContent = formateadorPrecio.format(Number(producto.precio));
  info.appendChild(precioEl);

  const botones = document.createElement("div");
  botones.className = "producto-botones";
  const btnWsp = document.createElement("a");
  btnWsp.className = "btn-comprar-wsp";
  btnWsp.href = construirEnlaceWhatsapp(`Hola, quiero más información sobre: ${producto.nombre}`);
  btnWsp.target = "_blank";
  btnWsp.rel = "noopener";
  btnWsp.textContent = "Preguntar por WhatsApp";
  btnWsp.addEventListener("click", (evento) => evento.stopPropagation());
  botones.appendChild(btnWsp);

  // Botón "Agregar al pedido" (definido en carrito.js, cargado después de
  // este archivo). El chequeo evita que la página se rompa si carrito.js
  // no llegó a cargar por algún motivo.
  if (typeof crearBotonAgregarCarrito === "function") {
    botones.appendChild(crearBotonAgregarCarrito(producto));
  }

  info.appendChild(botones);

  tarjeta.appendChild(info);
  return tarjeta;
}

function mostrarError(mensaje) {
  const contenedor = document.getElementById("lista-productos");
  contenedor.innerHTML = "";
  const el = document.createElement("p");
  el.className = "estado-error";
  el.textContent = mensaje;
  contenedor.appendChild(el);
  const paginacion = document.getElementById("paginacion");
  if (paginacion) paginacion.innerHTML = "";
}

// ---------- Búsqueda ----------
// El catálogo completo ya NO vive en el navegador, así que tanto los
// resultados como las sugerencias en vivo se piden al backend, con un
// pequeño debounce para no disparar una petición por cada tecla.
function activarBusqueda() {
  const input = document.getElementById("input-busqueda");
  const buscadorWrap = input.closest(".buscador");
  const sugerenciasWrap = document.getElementById("buscador-sugerencias");
  let yaHizoScroll = false;
  let temporizadorSugerencias = null;
  let temporizadorResultados = null;

  input.addEventListener("input", () => {
    const valor = input.value.trim();

    clearTimeout(temporizadorSugerencias);
    temporizadorSugerencias = setTimeout(() => actualizarSugerencias(valor), 200);

    clearTimeout(temporizadorResultados);
    temporizadorResultados = setTimeout(() => {
      terminoBusqueda = valor.toLowerCase();
      paginaActual = 1;
      cargarProductos();
    }, 400);

    if (valor && !yaHizoScroll) {
      yaHizoScroll = true;
      const resultados = document.getElementById("lista-productos");
      if (resultados) resultados.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (!valor) {
      yaHizoScroll = false;
    }
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) sugerenciasWrap.classList.add("abierto");
  });

  input.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      cerrarSugerencias();
      input.blur();
    }
  });

  document.addEventListener("click", (evento) => {
    if (buscadorWrap && !buscadorWrap.contains(evento.target)) cerrarSugerencias();
  });

  async function actualizarSugerencias(termino) {
    if (!sugerenciasWrap) return;
    if (!termino) {
      cerrarSugerencias();
      return;
    }

    try {
      const { productos, paginacion } = await api.obtenerProductos({ busqueda: termino, limit: 6, page: 1 });
      sugerenciasWrap.innerHTML = "";

      if (productos.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "buscador-sin-resultados";
        vacio.textContent = "No encontramos productos con ese nombre.";
        sugerenciasWrap.appendChild(vacio);
        sugerenciasWrap.classList.add("abierto");
        return;
      }

      productos.forEach((producto) => sugerenciasWrap.appendChild(crearSugerenciaBusqueda(producto)));

      const totalReal = paginacion ? paginacion.total_productos : productos.length;
      if (totalReal > productos.length) {
        const verTodos = document.createElement("button");
        verTodos.type = "button";
        verTodos.className = "buscador-ver-todos";
        verTodos.textContent = `Ver los ${totalReal} resultados`;
        verTodos.addEventListener("click", () => {
          cerrarSugerencias();
          const resultados = document.getElementById("lista-productos");
          if (resultados) resultados.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        sugerenciasWrap.appendChild(verTodos);
      }

      sugerenciasWrap.classList.add("abierto");
    } catch (error) {
      cerrarSugerencias();
    }
  }

  function crearSugerenciaBusqueda(producto) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "buscador-sugerencia";

    const icono = document.createElement("i");
    icono.className = "fa-solid fa-magnifying-glass";
    item.appendChild(icono);

    const info = document.createElement("div");
    info.className = "buscador-sugerencia-info";
    const nombre = document.createElement("strong");
    nombre.textContent = producto.nombre;
    info.appendChild(nombre);
    const precio = document.createElement("span");
    precio.textContent = formateadorPrecio.format(Number(producto.precio));
    info.appendChild(precio);
    item.appendChild(info);

    item.addEventListener("click", () => {
      cerrarSugerencias();
      abrirModalProducto(producto.id_producto);
    });

    return item;
  }

  function cerrarSugerencias() {
    if (sugerenciasWrap) sugerenciasWrap.classList.remove("abierto");
  }
}

// ---------- Panel de filtros: SIEMPRE desplegable, en cualquier tamaño ----------
function activarPanelFiltros() {
  const panel = document.getElementById("panel-filtros");
  const overlay = document.getElementById("filtros-overlay");
  document.getElementById("btn-abrir-filtros").addEventListener("click", () => {
    panel.classList.add("abierto");
    overlay.classList.add("abierto");
  });
  document.getElementById("btn-cerrar-filtros").addEventListener("click", cerrarPanelFiltros);
  overlay.addEventListener("click", cerrarPanelFiltros);
}
function cerrarPanelFiltros() {
  document.getElementById("panel-filtros").classList.remove("abierto");
  document.getElementById("filtros-overlay").classList.remove("abierto");
}

// ---------- Modal de detalle de producto ----------
async function abrirModalProducto(idProducto) {
  const overlay = document.getElementById("modal-overlay");
  const modal = document.getElementById("modal-producto");
  overlay.classList.add("abierto");
  modal.classList.add("abierto");
  document.body.style.overflow = "hidden";

  // La cantidad del selector siempre arranca en 1 en cada producto nuevo
  if (typeof resetCantidadModal === "function") resetCantidadModal();

  try {
    const producto = await api.obtenerProducto(idProducto);
    productoModalActual = producto;
    document.getElementById("modal-categoria").textContent = producto.categoria;
    document.getElementById("modal-titulo").textContent = producto.nombre;
    document.getElementById("modal-descripcion").textContent =
      producto.descripcion || "Este producto todavía no tiene descripción detallada.";
    document.getElementById("modal-precio").textContent = formateadorPrecio.format(Number(producto.precio));

    const btnWsp = document.getElementById("modal-whatsapp");
    btnWsp.href = construirEnlaceWhatsapp(`Hola, quiero más información sobre: ${producto.nombre}`);

    const imagenWrap = document.getElementById("modal-imagen");
    imagenWrap.innerHTML = "";
    const primeraImagen = producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes[0] : null;
    if (primeraImagen) {
      const img = document.createElement("img");
      img.src = `http://localhost:4000${primeraImagen.url_imagen}`;
      img.alt = producto.nombre;
      imagenWrap.appendChild(img);
    } else {
      const icono = document.createElement("i");
      icono.className = "fa-solid fa-image";
      imagenWrap.appendChild(icono);
    }
  } catch (error) {
    document.getElementById("modal-titulo").textContent = "No se pudo cargar este producto";
    document.getElementById("modal-descripcion").textContent = "Intenta de nuevo en un momento.";
    console.error(error.message);
  }
}

function cerrarModalProducto() {
  document.getElementById("modal-overlay").classList.remove("abierto");
  document.getElementById("modal-producto").classList.remove("abierto");
  document.body.style.overflow = "";
}

function activarModalProducto() {
  document.getElementById("modal-overlay").addEventListener("click", cerrarModalProducto);
  document.getElementById("modal-cerrar").addEventListener("click", cerrarModalProducto);
  document.getElementById("modal-compartir").addEventListener("click", compartirProductoActual);
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") cerrarModalProducto();
  });
}

async function compartirProductoActual() {
  if (!productoModalActual) return;
  const texto = `Mira este producto en Mil Variedades: ${productoModalActual.nombre} — ${formateadorPrecio.format(Number(productoModalActual.precio))}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Mil Variedades", text: texto });
    } catch (error) {
      // el usuario canceló, no pasa nada
    }
  } else {
    try {
      await navigator.clipboard.writeText(texto);
      const boton = document.getElementById("modal-compartir");
      const textoOriginal = boton.innerHTML;
      boton.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
      setTimeout(() => { boton.innerHTML = textoOriginal; }, 1800);
    } catch (error) {
      console.error("No se pudo copiar:", error.message);
    }
  }
}

// ---------- Sidebar de categorías (drawer, botón hamburguesa) ----------
function activarSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  function abrir() { sidebar.classList.add("abierto"); overlay.classList.add("abierto"); }
  function cerrar() { sidebar.classList.remove("abierto"); overlay.classList.remove("abierto"); }
  document.getElementById("btn-abrir-sidebar").addEventListener("click", abrir);
  document.getElementById("btn-abrir-sidebar-2").addEventListener("click", abrir);
  document.getElementById("btn-cerrar-sidebar").addEventListener("click", cerrar);
  overlay.addEventListener("click", cerrar);
}

function activarScrollTop() {
  const boton = document.getElementById("btn-scroll-top");
  window.addEventListener("scroll", () => boton.classList.toggle("visible", window.scrollY > 500));
  boton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
