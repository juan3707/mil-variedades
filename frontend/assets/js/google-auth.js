// ==========================================================================
// Mil Variedades — Inicio de sesión de clientes con Google Identity Services
// 100% Frontend. Separado de la sesión administrativa (mv_token).
// ==========================================================================

const GOOGLE_CLIENT_ID =
  "889238396246-9ku4e71afqofn9n3s1bccqpu3uec4rp6.apps.googleusercontent.com";
const CLIENTE_STORAGE_KEY = "mv_cliente_google";

// ---------- Persistencia en localStorage ----------
function obtenerClienteGoogle() {
  try {
    const raw = localStorage.getItem(CLIENTE_STORAGE_KEY);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    if (!datos || typeof datos !== "object" || !datos.correo) return null;
    return datos;
  } catch (_error) {
    return null;
  }
}

function guardarClienteGoogle(datosCliente) {
  try {
    localStorage.setItem(CLIENTE_STORAGE_KEY, JSON.stringify(datosCliente));
  } catch (_error) {
    // Si el navegador bloquea localStorage, continuamos sin romper la tienda.
  }
}

function cerrarSesionClienteGoogle() {
  try {
    localStorage.removeItem(CLIENTE_STORAGE_KEY);
  } catch (_error) {
    // Ignorar errores de almacenamiento.
  }

  if (
    window.google &&
    window.google.accounts &&
    window.google.accounts.id &&
    typeof window.google.accounts.id.disableAutoSelect === "function"
  ) {
    window.google.accounts.id.disableAutoSelect();
  }

  actualizarBotonHeaderCliente();
  cerrarModalGoogle();

  if (typeof renderizarCarrito === "function") {
    renderizarCarrito();
  }
}

// ---------- Decodificación segura de JWT en UTF-8 ----------
function decodificarJwtGoogle(token) {
  try {
    const partes = String(token || "").split(".");
    if (partes.length < 2) return null;

    let base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
    const jsonTexto = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(jsonTexto);
  } catch (_error) {
    return null;
  }
}

// ---------- Carga e inicialización del SDK oficial de Google ----------
function cargarScriptGoogleIdentity() {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    inicializarBotonGoogle();
    return;
  }

  const existente = document.getElementById("google-gsi-script");
  if (existente) {
    existente.addEventListener("load", inicializarBotonGoogle, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = "google-gsi-script";
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    inicializarBotonGoogle();
  };
  document.head.appendChild(script);
}

function inicializarBotonGoogle() {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: manejarCredencialGoogle,
    auto_select: false,
  });

  const contenedorBtn = document.getElementById("google-btn-render");
  if (contenedorBtn) {
    contenedorBtn.textContent = "";
    window.google.accounts.id.renderButton(contenedorBtn, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 280,
    });
  }
}

// ---------- Callback al iniciar sesión con Google ----------
function manejarCredencialGoogle(response) {
  if (!response || !response.credential) return;

  const payload = decodificarJwtGoogle(response.credential);
  if (!payload || !payload.email) return;

  const nombreCompleto = String(payload.name || payload.given_name || "Cliente").trim();
  const primerNombre = String(
    payload.given_name || nombreCompleto.split(" ")[0] || "Cliente"
  ).trim();

  const datosCliente = {
    nombre: nombreCompleto,
    primerNombre: primerNombre,
    correo: String(payload.email).trim(),
    foto: payload.picture ? String(payload.picture).trim() : "",
  };

  guardarClienteGoogle(datosCliente);
  actualizarBotonHeaderCliente();
  cerrarModalGoogle();

  if (typeof renderizarCarrito === "function") {
    renderizarCarrito();
  }
}

// ---------- Control del botón en el Header ----------
function actualizarBotonHeaderCliente() {
  const botones = document.querySelectorAll(".btn-login-header");
  const cliente = obtenerClienteGoogle();

  botones.forEach((btn) => {
    if (!btn.dataset.googleAuthBound) {
      btn.dataset.googleAuthBound = "1";
      btn.addEventListener("click", (evento) => {
        evento.preventDefault();
        abrirModalGoogle();
      });
    }

    btn.textContent = "";

    if (!cliente) {
      btn.classList.remove("cliente-logueado");
      btn.setAttribute("aria-label", "Iniciar sesión con Google");
      btn.setAttribute("title", "Iniciar sesión con Google");

      const icono = document.createElement("i");
      icono.className = "fa-solid fa-user";
      btn.appendChild(icono);

      const texto = document.createElement("span");
      texto.textContent = "Ingresar";
      btn.appendChild(texto);
    } else {
      btn.classList.add("cliente-logueado");
      const nombreCorto = cliente.primerNombre || cliente.nombre || "Cliente";
      btn.setAttribute("aria-label", `Cuenta de ${nombreCorto}`);
      btn.setAttribute("title", `${ cliente.nombre } (${ cliente.correo })`);

      if (cliente.foto) {
        const avatar = document.createElement("img");
        avatar.className = "cliente-avatar-img";
        avatar.src = cliente.foto;
        avatar.alt = nombreCorto;
        avatar.referrerPolicy = "no-referrer";
        avatar.addEventListener("error", () => {
          const fallbackIcono = document.createElement("i");
          fallbackIcono.className = "fa-solid fa-user-check";
          avatar.replaceWith(fallbackIcono);
        });
        btn.appendChild(avatar);
      } else {
        const iconoCheck = document.createElement("i");
        iconoCheck.className = "fa-solid fa-user-check";
        btn.appendChild(iconoCheck);
      }

      const spanNombre = document.createElement("span");
      spanNombre.className = "cliente-nombre-header";
      spanNombre.textContent = nombreCorto;
      btn.appendChild(spanNombre);
    }
  });
}

// ---------- Modal de Cliente ----------
function construirModalGoogle() {
  let overlay = document.getElementById("google-auth-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "google-auth-overlay";
    overlay.className = "google-auth-overlay";
    overlay.addEventListener("click", cerrarModalGoogle);
    document.body.appendChild(overlay);
  }

  let modal = document.getElementById("google-auth-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "google-auth-modal";
    modal.className = "google-auth-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "google-auth-titulo");
    document.body.appendChild(modal);
  }

  modal.textContent = "";

  const btnCerrar = document.createElement("button");
  btnCerrar.type = "button";
  btnCerrar.className = "google-auth-cerrar";
  btnCerrar.setAttribute("aria-label", "Cerrar ventana");
  btnCerrar.textContent = "×";
  btnCerrar.addEventListener("click", cerrarModalGoogle);
  modal.appendChild(btnCerrar);

  const cuerpo = document.createElement("div");
  cuerpo.className = "google-auth-cuerpo";

  const badge = document.createElement("span");
  badge.className = "google-auth-badge";
  badge.textContent = "Cuenta de Cliente";
  cuerpo.appendChild(badge);

  const cliente = obtenerClienteGoogle();

  if (!cliente) {
    const titulo = document.createElement("h3");
    titulo.id = "google-auth-titulo";
    titulo.textContent = "Inicia sesión en Mil Variedades";
    cuerpo.appendChild(titulo);

    const descripcion = document.createElement("p");
    descripcion.textContent =
      "Identifícate rápido con Google para personalizar tus pedidos por WhatsApp en La Ceja.";
    cuerpo.appendChild(descripcion);

    const contenedorBtn = document.createElement("div");
    contenedorBtn.id = "google-btn-render";
    contenedorBtn.className = "google-btn-render";
    cuerpo.appendChild(contenedorBtn);

    const adminWrap = document.createElement("div");
    adminWrap.className = "google-auth-admin-link";
    adminWrap.append("¿Eres administrador de la tienda? ");

    const linkAdmin = document.createElement("a");
    linkAdmin.href = "login.html";
    linkAdmin.textContent = "Ingresa aquí";
    adminWrap.appendChild(linkAdmin);

    cuerpo.appendChild(adminWrap);
  } else {
    if (cliente.foto) {
      const foto = document.createElement("img");
      foto.className = "google-perfil-foto";
      foto.src = cliente.foto;
      foto.alt = cliente.nombre || "Foto de perfil";
      foto.referrerPolicy = "no-referrer";
      foto.addEventListener("error", () => {
        foto.style.display = "none";
      });
      cuerpo.appendChild(foto);
    }

    const saludo = document.createElement("h3");
    saludo.id = "google-auth-titulo";
    saludo.textContent = `¡Hola, ${cliente.primerNombre || cliente.nombre}!`;
    cuerpo.appendChild(saludo);

    const correo = document.createElement("p");
    correo.className = "google-perfil-correo";
    correo.textContent = cliente.correo;
    cuerpo.appendChild(correo);

    const nota = document.createElement("p");
    nota.className = "google-perfil-nota";
    nota.textContent =
      "Tus datos se incluirán automáticamente al enviar tus pedidos por WhatsApp.";
    cuerpo.appendChild(nota);

    const btnSalir = document.createElement("button");
    btnSalir.type = "button";
    btnSalir.className = "btn-cerrar-sesion-google";
    btnSalir.textContent = "Cerrar sesión";
    btnSalir.addEventListener("click", cerrarSesionClienteGoogle);
    cuerpo.appendChild(btnSalir);
  }

  modal.appendChild(cuerpo);
}

function abrirModalGoogle() {
  construirModalGoogle();

  const overlay = document.getElementById("google-auth-overlay");
  const modal = document.getElementById("google-auth-modal");

  if (overlay) overlay.classList.add("abierto");
  if (modal) modal.classList.add("abierto");

  if (!obtenerClienteGoogle()) {
    cargarScriptGoogleIdentity();
  }
}

function cerrarModalGoogle() {
  const overlay = document.getElementById("google-auth-overlay");
  const modal = document.getElementById("google-auth-modal");

  if (overlay) overlay.classList.remove("abierto");
  if (modal) modal.classList.remove("abierto");
}

// ---------- Eventos globales e inicialización ----------
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    cerrarModalGoogle();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  actualizarBotonHeaderCliente();
});
