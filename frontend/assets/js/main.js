// ============================================================
// MIL VARIEDADES — main.js (v3)
// Reglas del proyecto:
// - Nunca innerHTML con datos del backend: siempre textContent o
//   createElement (evita XSS).
// - Estadísticas mostradas: SIEMPRE reales, nunca inventadas.
// ============================================================

let numeroWhatsapp = "573218106700";
let mensajeWhatsappDefault = "Hola, estoy interesado en un producto de Mil Variedades";
let productosCargados = [];
let productoModalActual = null;
let categoriasCargadas = [];

const formateadorPrecio = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", () => {
  inicializarSesionClienteHeader();
  cargarConfiguracion();
  cargarCategoriasYProductos();
  activarSidebar();
  activarBusqueda();
  activarScrollTop();
  activarScrollReveal();
  activarModalProducto();
  activarSombraHeader();

  const btnTodos = document.querySelector('.filtro-btn[data-categoria="todos"]');
  if (btnTodos) btnTodos.addEventListener("click", () => filtrarPorCategoria("todos"));
});

// Header con sombra sutil apenas se hace scroll (da sensación de profundidad)
function activarSombraHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  let conSombra = false;
  window.addEventListener(
    "scroll",
    () => {
      const debeTenerSombra = window.scrollY > 10;
      if (debeTenerSombra !== conSombra) {
        conSombra = debeTenerSombra;
        header.classList.toggle("con-sombra", conSombra);
      }
    },
    { passive: true }
  );
}

// ---------- Configuración (WhatsApp) ----------
async function cargarConfiguracion() {
  numeroWhatsapp = "573218106700";
  const textoNumero = "321 810 6700";

  const footerNum = document.getElementById("footer-numero");
  if (footerNum) footerNum.textContent = textoNumero;
  const mapaNumero = document.getElementById("mapa-numero");
  if (mapaNumero) mapaNumero.textContent = textoNumero;

  actualizarEnlacesWhatsapp();

  try {
    const config = await api.obtenerConfig();
    const mensajeConfig = config.find((c) => c.nombre === "whatsapp_mensaje_default");
    if (mensajeConfig && mensajeConfig.valor) {
      mensajeWhatsappDefault = mensajeConfig.valor;
      actualizarEnlacesWhatsapp();
    }
  } catch (error) {
    console.error("No se pudo cargar la configuración:", error.message);
  }
}

function construirEnlaceWhatsapp(mensajePersonalizado) {
  const mensaje = mensajePersonalizado || mensajeWhatsappDefault;
  return `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensaje)}`;
}

function actualizarEnlacesWhatsapp() {
  const enlace = construirEnlaceWhatsapp();
  ["btn-whatsapp-header", "btn-whatsapp-banner", "whatsapp-flotante", "sidebar-whatsapp", "footer-whatsapp"]
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = enlace;
    });
  document.querySelectorAll("[data-whatsapp-link]").forEach((el) => {
    const msg = el.getAttribute("data-whatsapp-msg");
    el.href = msg ? construirEnlaceWhatsapp(msg) : enlace;
  });
}

// ---------- Categorías ----------
const ICONOS_CATEGORIA = {
  papeleria: "fa-pencil",
  escolar: "fa-school",
  aseo: "fa-spray-can-sparkles",
  limpieza: "fa-spray-can-sparkles",
  oficina: "fa-briefcase",
  tecnologia: "fa-laptop",
  ancheta: "fa-gift",
  regalo: "fa-gift",
  default: "fa-shapes",
};
const COLORES_CATEGORIA = ["#d62828", "#2b6cb0", "#f4b400", "#1da851"];

function iconoParaCategoria(nombre) {
  const clave = (nombre || "").toLowerCase();
  if (clave.includes("ancheta") || clave.includes("regalo")) return ICONOS_CATEGORIA.regalo;
  if (clave.includes("papel")) return ICONOS_CATEGORIA.papeleria;
  if (clave.includes("escolar")) return ICONOS_CATEGORIA.escolar;
  if (clave.includes("aseo") || clave.includes("limpieza")) return ICONOS_CATEGORIA.aseo;
  if (clave.includes("oficina")) return ICONOS_CATEGORIA.oficina;
  if (clave.includes("tecnolog")) return ICONOS_CATEGORIA.tecnologia;
  return ICONOS_CATEGORIA.default;
}

// Asigna un color consistente a cada categoría según su posición en la
// lista ya cargada — así el mismo id_categoria siempre pinta del mismo color.
function colorParaCategoria(idCategoria) {
  const indice = categoriasCargadas.findIndex((c) => String(c.id_categoria) === String(idCategoria));
  if (indice === -1) return COLORES_CATEGORIA[0];
  return COLORES_CATEGORIA[indice % COLORES_CATEGORIA.length];
}

async function cargarCategoriasYProductos() {
  const contenedorCat = document.getElementById("lista-categorias");
  const sidebarLista = document.getElementById("sidebar-cat-lista");
  const filtros = document.getElementById("filtros-productos");
  const contenedorProd = document.getElementById("lista-productos");

  try {
    const [categorias, resultadoProductos] = await Promise.all([
      api.obtenerCategorias(),
      // "Destacados" es una vista previa del catálogo (no todo el catálogo,
      // eso vive en catalogo.html con paginación real). limit=20 coincide
      // con el valor por defecto del backend.
      api.obtenerProductos({ limit: 20 }),
    ]);

    categoriasCargadas = categorias;
    productosCargados = resultadoProductos.productos;

    // El total real de productos viene de "paginacion.total_productos"
    // (el conteo verdadero del backend), NUNCA de productosCargados.length
    // — eso ahora es solo el tamaño de la vista previa, no del catálogo.
    const totalProductosReal = resultadoProductos.paginacion
      ? resultadoProductos.paginacion.total_productos
      : productosCargados.length;

    document.getElementById("stat-categorias").textContent = categoriasCargadas.length;
    document.getElementById("stat-productos").textContent = `${totalProductosReal}+`;

    contenedorCat.innerHTML = "";
    sidebarLista.innerHTML = "";

    if (categoriasCargadas.length === 0) {
      const vacio = document.createElement("p");
      vacio.className = "estado-vacio";
      vacio.textContent = "Todavía no hay categorías para mostrar.";
      contenedorCat.appendChild(vacio);
    } else {
      // Conteo REAL de productos por categoría con caché en sessionStorage
      // (TTL 5 min) para no disparar N peticiones en cada recarga.
      let conteosPorCategoria =
        typeof leerCacheSesion === "function" ? leerCacheSesion("mv_cache_conteos_cat") : null;

      if (!Array.isArray(conteosPorCategoria) || conteosPorCategoria.length !== categoriasCargadas.length) {
        conteosPorCategoria = await Promise.all(
          categoriasCargadas.map((categoria) =>
            api
              .obtenerProductos({ categoria: categoria.id_categoria, limit: 1 })
              .then((resultado) => (resultado.paginacion ? resultado.paginacion.total_productos : 0))
              .catch(() => 0)
          )
        );
        if (typeof guardarCacheSesion === "function") {
          guardarCacheSesion("mv_cache_conteos_cat", conteosPorCategoria);
        }
      }

      categoriasCargadas.forEach((categoria, indice) => {
        contenedorCat.appendChild(crearTarjetaCategoria(categoria, indice, conteosPorCategoria[indice]));
        sidebarLista.appendChild(crearEnlaceSidebar(categoria));
        filtros.appendChild(crearBotonFiltro(categoria));
      });
    }

    renderizarProductos(productosCargados);
    activarScrollReveal(); // vuelve a observar los elementos recién creados
  } catch (error) {
    mostrarError(contenedorCat, "No pudimos cargar las categorías.");
    mostrarError(contenedorProd, "No pudimos cargar el catálogo. Verifica que el servidor esté encendido.");
    console.error("Error cargando categorías/productos:", error.message);
  }
}

function crearTarjetaCategoria(categoria, indice, totalProductos) {
  const tarjeta = document.createElement("a");
  tarjeta.className = "categoria-card";
  tarjeta.href = "#destacados";
  tarjeta.setAttribute("data-reveal", "");
  const colorCat = COLORES_CATEGORIA[indice % COLORES_CATEGORIA.length];
  tarjeta.style.setProperty("--tab-color", colorCat);
  tarjeta.addEventListener("click", () => filtrarPorCategoria(categoria.id_categoria));

  const pestana = document.createElement("span");
  pestana.className = "categoria-pestana";
  pestana.style.background = colorCat;
  pestana.textContent = categoria.nombre;
  tarjeta.appendChild(pestana);

  const iconoWrap = document.createElement("div");
  iconoWrap.className = "icono-wrap";
  const icono = document.createElement("i");
  icono.className = `fa-solid ${iconoParaCategoria(categoria.nombre)}`;
  iconoWrap.appendChild(icono);
  tarjeta.appendChild(iconoWrap);

  const nombre = document.createElement("h3");
  nombre.textContent = categoria.nombre;
  tarjeta.appendChild(nombre);

  const descripcion = document.createElement("p");
  descripcion.textContent = categoria.descripcion || "";
  tarjeta.appendChild(descripcion);

  const contador = document.createElement("span");
  contador.className = "categoria-contador";
  contador.textContent = `Ver ${totalProductos} producto${totalProductos === 1 ? "" : "s"}`;

  const footer = document.createElement("div");
  footer.className = "categoria-footer";
  footer.appendChild(contador);
  const flecha = document.createElement("i");
  flecha.className = "fa-solid fa-arrow-right";
  footer.appendChild(flecha);
  tarjeta.appendChild(footer);

  return tarjeta;
}

function crearEnlaceSidebar(categoria) {
  const enlace = document.createElement("a");
  enlace.href = "#destacados";
  const icono = document.createElement("i");
  icono.className = `fa-solid ${iconoParaCategoria(categoria.nombre)}`;
  enlace.appendChild(icono);
  const texto = document.createElement("span");
  texto.textContent = categoria.nombre;
  enlace.appendChild(texto);
  enlace.addEventListener("click", () => {
    filtrarPorCategoria(categoria.id_categoria);
    cerrarSidebar();
  });
  return enlace;
}

function crearBotonFiltro(categoria) {
  const boton = document.createElement("button");
  boton.className = "filtro-btn";
  boton.dataset.categoria = categoria.id_categoria;
  boton.textContent = categoria.nombre;
  boton.addEventListener("click", () => filtrarPorCategoria(categoria.id_categoria));
  return boton;
}

function filtrarPorCategoria(idCategoria) {
  document.querySelectorAll(".filtro-btn").forEach((btn) => {
    btn.classList.toggle("activo", String(btn.dataset.categoria) === String(idCategoria));
  });

  const filtrados =
    idCategoria === "todos"
      ? productosCargados
      : productosCargados.filter((p) => String(p.id_categoria) === String(idCategoria));

  renderizarProductos(filtrados);
}

// ---------- Productos ----------

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

function imagenLocalProducto(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("norma") || n.includes("cuaderno")) return "../assets/img/productos/norma.jpg";
  if (n.includes("lapicero") || n.includes("faber")) return "../assets/img/productos/lapicero_negro_faber.jpg";
  if (n.includes("resaltador") || n.includes("stabilo")) return "../assets/img/productos/stabilo_resaltadorx4.jpg";
  if (n.includes("detergente") || n.includes("fab")) return "../assets/img/productos/FAB_liquido.jpg";
  return "";
}

function crearTarjetaProducto(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "producto-card";
  tarjeta.addEventListener("click", () => abrirModalProducto(producto.id_producto));

  const imgWrap = document.createElement("div");
  imgWrap.className = "producto-img";
  const urlImg = producto.imagen_portada
    ? resolverUrlRecurso(producto.imagen_portada)
    : imagenLocalProducto(producto.nombre);

  if (urlImg) {
    const img = document.createElement("img");
    img.src = urlImg;
    img.alt = producto.nombre;
    img.loading = "lazy";
    img.decoding = "async";
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

  // Sticker de categoría (calcomanía roja/color de categoría)
  const sticker = document.createElement("span");
  sticker.className = "producto-sticker";
  sticker.style.background = colorParaCategoria(producto.id_categoria);
  sticker.textContent = producto.categoria || "Variedades";
  imgWrap.appendChild(sticker);

  // Píldora de disponibilidad "En Bodega La Ceja"
  const bodega = document.createElement("span");
  bodega.className = "producto-bodega";
  const punto = document.createElement("i");
  punto.className = "fa-solid fa-circle";
  bodega.appendChild(punto);
  bodega.appendChild(document.createTextNode(" En Bodega La Ceja"));
  imgWrap.appendChild(bodega);

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

  // 1) Botón rojo "Agregar al pedido" (definido en carrito.js, cargado después
  // de este archivo). El chequeo evita que la página se rompa si carrito.js
  // no llegó a cargar por algún motivo.
  if (typeof crearBotonAgregarCarrito === "function") {
    botones.appendChild(crearBotonAgregarCarrito(producto));
  }

  // 2) Botón cuadrado verde de WhatsApp (solo ícono)
  const btnWsp = document.createElement("a");
  btnWsp.className = "btn-comprar-wsp";
  btnWsp.href = construirEnlaceWhatsapp(`Hola, quiero más información sobre: ${producto.nombre}`);
  btnWsp.target = "_blank";
  btnWsp.rel = "noopener";
  btnWsp.setAttribute("aria-label", `Preguntar por WhatsApp sobre ${producto.nombre}`);
  btnWsp.title = "Preguntar por WhatsApp";
  const iconoWsp = document.createElement("i");
  iconoWsp.className = "fa-brands fa-whatsapp";
  btnWsp.appendChild(iconoWsp);
  btnWsp.addEventListener("click", (evento) => evento.stopPropagation()); // no abrir el modal al usar este botón
  botones.appendChild(btnWsp);

  info.appendChild(botones);

  tarjeta.appendChild(info);
  return tarjeta;
}

function mostrarError(contenedor, mensaje) {
  contenedor.innerHTML = "";
  const el = document.createElement("p");
  el.className = "estado-error";
  el.textContent = mensaje;
  contenedor.appendChild(el);
}

// ---------- Búsqueda ----------
// Al escribir: filtra los productos destacados, muestra un dropdown de
// sugerencias en vivo debajo del input, y la primera vez que hay texto
// baja automáticamente la página hacia los resultados.
// El grid de "Destacados" es una vista previa (hoy carga hasta 20
// productos), así que al escribir se sigue filtrando localmente para dar
// respuesta inmediata sobre lo ya visible — pero las SUGERENCIAS del
// dropdown se piden al backend, porque ahí sí necesitamos buscar en el
// catálogo completo, no solo en la vista previa cargada en esta página.
function activarBusqueda() {
  const input = document.getElementById("input-busqueda");
  const buscadorWrap = input.closest(".buscador");
  const sugerenciasWrap = document.getElementById("buscador-sugerencias");
  let yaHizoScroll = false;
  let temporizadorSugerencias = null;
  const cacheSugerencias = new Map();

  input.addEventListener("input", () => {
    const termino = input.value.trim().toLowerCase();
    const filtrados = termino
      ? productosCargados.filter((p) => p.nombre.toLowerCase().includes(termino))
      : productosCargados;

    renderizarProductos(filtrados);

    clearTimeout(temporizadorSugerencias);
    temporizadorSugerencias = setTimeout(() => actualizarSugerencias(termino), 320);

    if (termino && !yaHizoScroll) {
      yaHizoScroll = true;
      const resultados = document.getElementById("lista-productos");
      if (resultados) resultados.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (!termino) {
      yaHizoScroll = false;
    }
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2) sugerenciasWrap.classList.add("abierto");
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
    if (!termino || termino.length < 2) {
      cerrarSugerencias();
      return;
    }

    try {
      let respuesta = cacheSugerencias.get(termino);
      if (!respuesta) {
        respuesta = await api.obtenerProductos({ busqueda: termino, limit: 6, page: 1 });
        if (cacheSugerencias.size >= 10) {
          const primeraClave = cacheSugerencias.keys().next().value;
          cacheSugerencias.delete(primeraClave);
        }
        cacheSugerencias.set(termino, respuesta);
      }
      const { productos, paginacion } = respuesta;
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

      // "Ver todos" lleva al catálogo completo con la búsqueda aplicada:
      // el grid de esta página es solo una vista previa y puede no tener
      // todos los resultados reales cargados.
      const totalReal = paginacion ? paginacion.total_productos : productos.length;
      if (totalReal > productos.length) {
        const verTodos = document.createElement("a");
        verTodos.className = "buscador-ver-todos";
        verTodos.href = `catalogo.html?busqueda=${encodeURIComponent(termino)}`;
        verTodos.textContent = `Ver los ${totalReal} resultados`;
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

// ---------- Modal de detalle de producto ----------
// Al hacer clic en cualquier tarjeta, pedimos el detalle COMPLETO de ese
// producto (GET /api/productos/:id) — no reutilizamos solo los datos que
// ya teníamos en la lista, porque el detalle puede traer más información
// (todas las imágenes, descripción completa) que la vista de catálogo no trae.
async function abrirModalProducto(idProducto) {
  const overlay = document.getElementById("modal-overlay");
  const modal = document.getElementById("modal-producto");

  overlay.classList.add("abierto");
  modal.classList.add("abierto");
  document.body.style.overflow = "hidden"; // evita scroll de fondo mientras el modal está abierto
  const scrollEl = modal.querySelector(".modal-cuerpo-scroll");
  if (scrollEl) scrollEl.scrollTop = 0;

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
    const imagenes = producto.imagenes || [];

    if (imagenes.length === 0) {
      const icono = document.createElement("i");
      icono.className = "fa-solid fa-image";
      imagenWrap.appendChild(icono);
    } else {
      const imgPrincipal = document.createElement("img");
      imgPrincipal.src = resolverUrlRecurso(imagenes[0].url_imagen);
      imgPrincipal.alt = producto.nombre;
      imagenWrap.appendChild(imgPrincipal);

      // Si hay más de una foto, agregamos puntos para navegar entre ellas
      if (imagenes.length > 1) {
        const dots = document.createElement("div");
        dots.className = "modal-galeria-dots";
        imagenes.forEach((imagen, indice) => {
          const punto = document.createElement("button");
          punto.type = "button";
          punto.className = indice === 0 ? "activo" : "";
          punto.setAttribute("aria-label", `Ver foto ${indice + 1}`);
          punto.addEventListener("click", () => {
            imgPrincipal.src = resolverUrlRecurso(imagen.url_imagen);
            dots.querySelectorAll("button").forEach((b) => b.classList.remove("activo"));
            punto.classList.add("activo");
          });
          dots.appendChild(punto);
        });
        imagenWrap.appendChild(dots);
      }
    }
  } catch (error) {
    document.getElementById("modal-titulo").textContent = "No se pudo cargar este producto";
    document.getElementById("modal-descripcion").textContent = "Intenta de nuevo en un momento.";
    console.error("Error cargando detalle de producto:", error.message);
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

// Usa el "compartir" nativo del celular si existe (Android/iOS); en
// computador, como no existe ese menú nativo, copiamos el texto al
// portapapeles y avisamos — así igual funciona en cualquier dispositivo.
async function compartirProductoActual() {
  if (!productoModalActual) return;
  const texto = `Mira este producto en Mil Variedades: ${productoModalActual.nombre} — ${formateadorPrecio.format(Number(productoModalActual.precio))}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Mil Variedades", text: texto });
    } catch (error) {
      // el usuario canceló el share nativo, no hacemos nada
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

// ---------- Sidebar ----------
function cerrarSidebar() {
  document.getElementById("sidebar").classList.remove("abierto");
  document.getElementById("sidebar-overlay").classList.remove("abierto");
}
function activarSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  function abrir() {
    sidebar.classList.add("abierto");
    overlay.classList.add("abierto");
  }
  document.getElementById("btn-abrir-sidebar").addEventListener("click", abrir);
  document.getElementById("btn-abrir-sidebar-2").addEventListener("click", abrir);
  document.getElementById("btn-cerrar-sidebar").addEventListener("click", cerrarSidebar);
  overlay.addEventListener("click", cerrarSidebar);
  // Los enlaces generales (Inicio/Nosotros/Contacto) también cierran el menú al usarse
  document.querySelectorAll(".sidebar-nav-general a").forEach((enlace) => {
    enlace.addEventListener("click", cerrarSidebar);
  });
}

// ---------- Volver arriba ----------
function activarScrollTop() {
  const boton = document.getElementById("btn-scroll-top");
  if (!boton) return;
  let visible = false;
  window.addEventListener(
    "scroll",
    () => {
      const debeSerVisible = window.scrollY > 500;
      if (debeSerVisible !== visible) {
        visible = debeSerVisible;
        boton.classList.toggle("visible", visible);
      }
    },
    { passive: true }
  );
  boton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ---------- FAQ acordeón ----------
function activarFAQ() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const boton = item.querySelector(".faq-pregunta");
    boton.setAttribute("aria-expanded", "false");
    boton.addEventListener("click", () => {
      const yaAbierto = item.classList.contains("abierto");
      document.querySelectorAll(".faq-item").forEach((otro) => {
        otro.classList.remove("abierto");
        otro.querySelector(".faq-pregunta").setAttribute("aria-expanded", "false");
      });
      if (!yaAbierto) {
        item.classList.add("abierto");
        boton.setAttribute("aria-expanded", "true");
      }
    });
  });
}

// ---------- Scroll reveal (aparición suave al hacer scroll) ----------
// Respeta prefers-reduced-motion: si el usuario lo activó, mostramos
// todo de inmediato sin animar nada.
function activarScrollReveal() {
  const elementos = document.querySelectorAll("[data-reveal]:not(.reveal-visible)");
  const prefiereReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefiereReducido) {
    elementos.forEach((el) => el.classList.add("reveal-visible"));
    return;
  }

  // Efecto cascada: dentro de una misma cuadrícula (mismo padre), cada
  // tarjeta aparece un poquito después que la anterior, en vez de todas
  // de golpe — así se siente "vivo" en vez de un simple fade genérico.
  const contadorPorPadre = new Map();
  elementos.forEach((el) => {
    const padre = el.parentElement;
    const posicion = contadorPorPadre.get(padre) || 0;
    contadorPorPadre.set(padre, posicion + 1);
    const retraso = Math.min(posicion, 5) * 35;
    el.style.transitionDelay = `${retraso}ms`;
  });

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          const target = entrada.target;
          target.classList.add("reveal-visible");
          observador.unobserve(target);
          setTimeout(() => {
            target.style.transitionDelay = "";
          }, 300);
        }
      });
    },
    { threshold: 0.15 }
  );

  elementos.forEach((el) => observador.observe(el));
}

// ---------- Sesión de cliente en el Header (mv_cliente_activo) ----------
function obtenerClienteActivoTienda() {
  try {
    const raw = localStorage.getItem("mv_cliente_activo");
    if (!raw) return null;
    const datos = JSON.parse(raw);
    if (!datos || typeof datos !== "object" || !datos.correo) return null;
    return datos;
  } catch (_err) {
    return null;
  }
}

function inicializarSesionClienteHeader() {
  const btn = document.querySelector(".btn-login-header");
  if (!btn) return;

  const cliente = obtenerClienteActivoTienda();
  btn.textContent = "";

  if (!cliente) {
    btn.classList.remove("cliente-logueado");
    btn.href = "login.html";
    btn.setAttribute("aria-label", "Iniciar sesión");
    btn.removeAttribute("title");
    btn.onclick = null;

    const icono = document.createElement("i");
    icono.className = "fa-solid fa-user";
    btn.appendChild(icono);

    const span = document.createElement("span");
    span.textContent = "Iniciar sesión";
    btn.appendChild(span);
    return;
  }

  const primerNombre =
    cliente.nombre ||
    (cliente.nombreCompleto ? String(cliente.nombreCompleto).split(" ")[0] : "Cliente");

  btn.classList.add("cliente-logueado");
  btn.href = "#";
  btn.setAttribute("aria-label", `Cuenta de ${primerNombre}`);
  btn.setAttribute("title", `${cliente.nombreCompleto || primerNombre} (${cliente.correo})`);

  if (cliente.foto) {
    const img = document.createElement("img");
    img.className = "cliente-avatar-img";
    img.src = cliente.foto;
    img.alt = primerNombre;
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      const fallback = document.createElement("i");
      fallback.className = "fa-solid fa-user-check";
      img.replaceWith(fallback);
    });
    btn.appendChild(img);
  } else {
    const icono = document.createElement("i");
    icono.className = "fa-solid fa-user-check";
    btn.appendChild(icono);
  }

  const spanNombre = document.createElement("span");
  spanNombre.className = "cliente-nombre-header";
  spanNombre.textContent = primerNombre;
  btn.appendChild(spanNombre);

  btn.onclick = (evento) => {
    evento.preventDefault();
    abrirModalPerfilClienteActivo(cliente);
  };
}

function abrirModalPerfilClienteActivo(cliente) {
  let overlay = document.getElementById("google-auth-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "google-auth-overlay";
    overlay.className = "google-auth-overlay";
    overlay.addEventListener("click", cerrarModalPerfilClienteActivo);
    document.body.appendChild(overlay);
  }

  let modal = document.getElementById("google-auth-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "google-auth-modal";
    modal.className = "google-auth-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
  }

  modal.textContent = "";

  const btnCerrar = document.createElement("button");
  btnCerrar.type = "button";
  btnCerrar.className = "google-auth-cerrar";
  btnCerrar.setAttribute("aria-label", "Cerrar");
  btnCerrar.textContent = "×";
  btnCerrar.addEventListener("click", cerrarModalPerfilClienteActivo);
  modal.appendChild(btnCerrar);

  const cuerpo = document.createElement("div");
  cuerpo.className = "google-auth-cuerpo";

  const badge = document.createElement("span");
  badge.className = "google-auth-badge";
  badge.textContent = "Cuenta de Cliente";
  cuerpo.appendChild(badge);

  if (cliente.foto) {
    const foto = document.createElement("img");
    foto.className = "google-perfil-foto";
    foto.src = cliente.foto;
    foto.alt = cliente.nombreCompleto || "Cliente";
    foto.referrerPolicy = "no-referrer";
    foto.addEventListener("error", () => {
      foto.style.display = "none";
    });
    cuerpo.appendChild(foto);
  }

  const saludo = document.createElement("h3");
  saludo.textContent = `¡Hola, ${cliente.nombreCompleto || cliente.nombre}!`;
  cuerpo.appendChild(saludo);

  const correo = document.createElement("p");
  correo.className = "google-perfil-correo";
  correo.textContent = cliente.telefono
    ? `${cliente.correo} · ${cliente.telefono}`
    : cliente.correo;
  cuerpo.appendChild(correo);

  const nota = document.createElement("p");
  nota.className = "google-perfil-nota";
  nota.textContent =
    "Tus datos se incluirán automáticamente al enviar tu pedido por WhatsApp.";
  cuerpo.appendChild(nota);

  const btnSalir = document.createElement("button");
  btnSalir.type = "button";
  btnSalir.className = "btn-cerrar-sesion-google";
  btnSalir.textContent = "Cerrar sesión";
  btnSalir.addEventListener("click", () => {
    try {
      localStorage.removeItem("mv_cliente_activo");
    } catch (_err) {
      // Ignorar
    }
    cerrarModalPerfilClienteActivo();
    inicializarSesionClienteHeader();
    if (typeof renderizarCarrito === "function") {
      renderizarCarrito();
    }
  });
  cuerpo.appendChild(btnSalir);

  modal.appendChild(cuerpo);
  overlay.classList.add("abierto");
  modal.classList.add("abierto");
}

function cerrarModalPerfilClienteActivo() {
  const overlay = document.getElementById("google-auth-overlay");
  const modal = document.getElementById("google-auth-modal");
  if (overlay) overlay.classList.remove("abierto");
  if (modal) modal.classList.remove("abierto");
}
