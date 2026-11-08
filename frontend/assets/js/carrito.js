// ============================================================
// MIL VARIEDADES — carrito.js
// Armador de pedido para WhatsApp — NO es un carrito de pago real,
// solo arma un mensaje con el pedido y lo abre en WhatsApp.
// Compartido entre index.html y catalogo.html. Se carga DESPUÉS de
// main.js / catalogo.js porque usa funciones y variables que ya
// existen ahí: formateadorPrecio, construirEnlaceWhatsapp,
// productoModalActual.
// Regla del proyecto: nunca innerHTML con datos del backend (evita XSS).
// ============================================================

const CARRITO_STORAGE_KEY = "mv_carrito";

let carrito = [];
let cantidadModal = 1;

document.addEventListener("DOMContentLoaded", () => {
  cargarCarritoDesdeStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
  activarCarrito();
  activarModalCarrito();
});

// ---------- Persistencia local ----------
// Se guarda en localStorage para que el pedido no se pierda al pasar de
// index.html a catalogo.html o al recargar la página.
function cargarCarritoDesdeStorage() {
  try {
    const guardado = localStorage.getItem(CARRITO_STORAGE_KEY);
    carrito = guardado ? JSON.parse(guardado) : [];
  } catch (error) {
    carrito = [];
  }
}

function guardarCarritoEnStorage() {
  try {
    localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(carrito));
  } catch (error) {
    console.error("No se pudo guardar el pedido:", error.message);
  }
}

// ---------- Estado del pedido ----------
function agregarAlCarrito(producto, cantidad) {
  const cantidadFinal = cantidad && cantidad > 0 ? cantidad : 1;
  const existente = carrito.find((item) => String(item.id_producto) === String(producto.id_producto));

  if (existente) {
    existente.cantidad += cantidadFinal;
  } else {
    carrito.push({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      cantidad: cantidadFinal,
    });
  }

  guardarCarritoEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
}

function quitarDelCarrito(idProducto) {
  carrito = carrito.filter((item) => String(item.id_producto) !== String(idProducto));
  guardarCarritoEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
}

function cambiarCantidadCarrito(idProducto, delta) {
  const item = carrito.find((i) => String(i.id_producto) === String(idProducto));
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    quitarDelCarrito(idProducto);
    return;
  }

  guardarCarritoEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
}

function vaciarCarrito() {
  carrito = [];
  guardarCarritoEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
}

function totalCarrito() {
  return carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
}

function totalUnidadesCarrito() {
  return carrito.reduce((total, item) => total + item.cantidad, 0);
}

// ---------- Contador en el header ----------
function actualizarContadorCarrito() {
  const contador = document.getElementById("carrito-contador");
  if (!contador) return;
  const total = totalUnidadesCarrito();
  contador.textContent = total;
  contador.style.display = total > 0 ? "flex" : "none";
}

// ---------- Render del panel lateral ----------
function renderizarCarrito() {
  const lista = document.getElementById("carrito-lista");
  const footer = document.getElementById("carrito-footer");
  if (!lista) return;

  lista.innerHTML = "";

  if (carrito.length === 0) {
    const vacio = document.createElement("div");
    vacio.className = "carrito-vacio";
    const icono = document.createElement("i");
    icono.className = "fa-solid fa-cart-shopping";
    vacio.appendChild(icono);
    const texto = document.createElement("p");
    texto.textContent = "Todavía no has agregado productos a tu pedido.";
    vacio.appendChild(texto);
    lista.appendChild(vacio);
    if (footer) footer.style.display = "none";
    return;
  }

  if (footer) footer.style.display = "block";

  carrito.forEach((item) => lista.appendChild(crearItemCarrito(item)));

  const totalEl = document.getElementById("carrito-total");
  if (totalEl) totalEl.textContent = formateadorPrecio.format(totalCarrito());

  const btnFinalizar = document.getElementById("btn-finalizar-pedido");
  if (btnFinalizar) btnFinalizar.href = construirEnlacePedidoWhatsapp();
}

function crearItemCarrito(item) {
  const fila = document.createElement("div");
  fila.className = "carrito-item";

  const info = document.createElement("div");
  info.className = "carrito-item-info";
  const nombre = document.createElement("strong");
  nombre.textContent = item.nombre;
  info.appendChild(nombre);
  const subtotal = document.createElement("span");
  subtotal.textContent = formateadorPrecio.format(item.precio * item.cantidad);
  info.appendChild(subtotal);
  fila.appendChild(info);

  const controles = document.createElement("div");
  controles.className = "carrito-item-controles";

  const btnMenos = document.createElement("button");
  btnMenos.type = "button";
  btnMenos.textContent = "−";
  btnMenos.setAttribute("aria-label", `Quitar una unidad de ${item.nombre}`);
  btnMenos.addEventListener("click", () => cambiarCantidadCarrito(item.id_producto, -1));
  controles.appendChild(btnMenos);

  const cantidad = document.createElement("span");
  cantidad.className = "carrito-item-cantidad";
  cantidad.textContent = item.cantidad;
  controles.appendChild(cantidad);

  const btnMas = document.createElement("button");
  btnMas.type = "button";
  btnMas.textContent = "+";
  btnMas.setAttribute("aria-label", `Agregar una unidad de ${item.nombre}`);
  btnMas.addEventListener("click", () => cambiarCantidadCarrito(item.id_producto, 1));
  controles.appendChild(btnMas);

  fila.appendChild(controles);

  const btnQuitar = document.createElement("button");
  btnQuitar.type = "button";
  btnQuitar.className = "carrito-item-quitar";
  btnQuitar.setAttribute("aria-label", `Quitar ${item.nombre} del pedido`);
  const iconoQuitar = document.createElement("i");
  iconoQuitar.className = "fa-solid fa-trash";
  btnQuitar.appendChild(iconoQuitar);
  btnQuitar.addEventListener("click", () => quitarDelCarrito(item.id_producto));
  fila.appendChild(btnQuitar);

  return fila;
}

// ---------- Mensaje de WhatsApp con el pedido completo ----------
// Usa construirEnlaceWhatsapp() de main.js/catalogo.js, que ya arma la URL
// wa.me con el número configurado en el backend.
function construirEnlacePedidoWhatsapp() {
  const lineas = carrito.map(
    (item) => `• ${item.nombre} x${item.cantidad} — ${formateadorPrecio.format(item.precio * item.cantidad)}`
  );
  const mensaje =
    "Hola, quiero hacer el siguiente pedido:\n\n" +
    lineas.join("\n") +
    `\n\nTotal: ${formateadorPrecio.format(totalCarrito())}`;
  return construirEnlaceWhatsapp(mensaje);
}

// ---------- Abrir / cerrar el panel ----------
function abrirCarrito() {
  document.getElementById("carrito-overlay").classList.add("abierto");
  document.getElementById("carrito-panel").classList.add("abierto");
  document.body.style.overflow = "hidden";
}

function cerrarCarrito() {
  document.getElementById("carrito-overlay").classList.remove("abierto");
  document.getElementById("carrito-panel").classList.remove("abierto");
  document.body.style.overflow = "";
}

function activarCarrito() {
  const btnCarrito = document.getElementById("btn-carrito");
  const overlay = document.getElementById("carrito-overlay");
  const btnCerrar = document.getElementById("carrito-cerrar");
  const btnVaciar = document.getElementById("btn-vaciar-carrito");

  if (btnCarrito) btnCarrito.addEventListener("click", abrirCarrito);
  if (overlay) overlay.addEventListener("click", cerrarCarrito);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarCarrito);
  if (btnVaciar) {
    btnVaciar.addEventListener("click", () => {
      if (carrito.length > 0) vaciarCarrito();
    });
  }

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") cerrarCarrito();
  });
}

// ---------- Botón "Agregar al pedido" en cada tarjeta de producto ----------
// Llamado desde crearTarjetaProducto() en main.js y catalogo.js.
function crearBotonAgregarCarrito(producto) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-agregar-carrito";
  btn.setAttribute("aria-label", `Agregar ${producto.nombre} al pedido`);

  const icono = document.createElement("i");
  icono.className = "fa-solid fa-cart-plus";
  btn.appendChild(icono);

  btn.addEventListener("click", (evento) => {
    evento.stopPropagation(); // no abrir el modal al usar este botón
    agregarAlCarrito(producto, 1);
    confirmarAgregadoBoton(btn, icono, "fa-solid fa-cart-plus");
  });

  return btn;
}

// Feedback visual breve (ícono de check) al agregar un producto, tanto
// desde la tarjeta como desde el modal.
function confirmarAgregadoBoton(btn, icono, claseOriginal) {
  btn.classList.add("agregado");
  icono.className = "fa-solid fa-check";
  setTimeout(() => {
    btn.classList.remove("agregado");
    icono.className = claseOriginal;
  }, 1200);
}

// ---------- Selector de cantidad + "Agregar al pedido" en el modal ----------
function activarModalCarrito() {
  const btnMenos = document.getElementById("modal-cantidad-menos");
  const btnMas = document.getElementById("modal-cantidad-mas");
  const valorEl = document.getElementById("modal-cantidad-valor");
  const btnAgregar = document.getElementById("btn-agregar-pedido");

  if (btnMenos) {
    btnMenos.addEventListener("click", () => {
      if (cantidadModal <= 1) return;
      cantidadModal -= 1;
      if (valorEl) valorEl.textContent = cantidadModal;
    });
  }

  if (btnMas) {
    btnMas.addEventListener("click", () => {
      cantidadModal += 1;
      if (valorEl) valorEl.textContent = cantidadModal;
    });
  }

  if (btnAgregar) {
    const iconoAgregar = btnAgregar.querySelector("i");
    btnAgregar.addEventListener("click", () => {
      // productoModalActual es una variable global definida en
      // main.js/catalogo.js con el producto que el modal tiene abierto.
      if (typeof productoModalActual === "undefined" || !productoModalActual) return;
      agregarAlCarrito(productoModalActual, cantidadModal);

      const textoOriginal = btnAgregar.textContent.trim();
      btnAgregar.classList.add("agregado");
      btnAgregar.textContent = "";
      const check = document.createElement("i");
      check.className = "fa-solid fa-check";
      btnAgregar.appendChild(check);
      btnAgregar.append(" Agregado al pedido");
      setTimeout(() => {
        btnAgregar.classList.remove("agregado");
        btnAgregar.textContent = "";
        if (iconoAgregar) btnAgregar.appendChild(iconoAgregar);
        btnAgregar.append(` ${textoOriginal}`);
      }, 1500);
    });
  }
}

// Reinicia el selector de cantidad a 1. Se llama desde
// abrirModalProducto() en main.js/catalogo.js cada vez que se abre un
// producto distinto.
function resetCantidadModal() {
  cantidadModal = 1;
  const valorEl = document.getElementById("modal-cantidad-valor");
  if (valorEl) valorEl.textContent = "1";
}
