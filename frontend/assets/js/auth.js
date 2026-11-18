// ==========================================================================
// MIL VARIEDADES — auth.js
// Sistema unificado de autenticación (Login, Registro, Recuperación y Google)
// Reglas de seguridad:
// - 0 innerHTML con datos de usuario o del backend (solo createElement / textContent)
// - Empleados autenticados por backend -> panel.html
// - Clientes registrados o autenticados con Google -> index.html
// ==========================================================================

const GOOGLE_CLIENT_ID =
  "889238396246-9ku4e71afqofn9n3s1bccqpu3uec4rp6.apps.googleusercontent.com";
const CLIENTES_LOCALES_KEY = "mv_clientes_locales";
const CLIENTE_ACTIVO_KEY = "mv_cliente_activo";

document.addEventListener("DOMContentLoaded", () => {
  inicializarAlternanciaVistas();
  inicializarBotonesOjito();
  inicializarModalRecuperar();
  inicializarModalTerminos();
  inicializarValidacionPasswordTiempoReal();
  inicializarFormularioLogin();
  inicializarFormularioRegistro();
  cargarScriptGoogleAuth();
  cargarWhatsappSoporte();
});

// ---------- Persistencia de clientes en localStorage ----------
function leerClientesLocales() {
  try {
    const raw = localStorage.getItem(CLIENTES_LOCALES_KEY);
    if (!raw) return [];
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (_err) {
    return [];
  }
}

function guardarClientesLocales(lista) {
  try {
    localStorage.setItem(CLIENTES_LOCALES_KEY, JSON.stringify(lista));
  } catch (_err) {
    // Ignorar bloqueo de almacenamiento privado
  }
}

function guardarClienteActivo(cliente) {
  try {
    localStorage.setItem(CLIENTE_ACTIVO_KEY, JSON.stringify(cliente));
  } catch (_err) {
    // Ignorar bloqueo de almacenamiento privado
  }
}

// ---------- Utilidades de validación y mensajes seguros ----------
function esCorreoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo || "").trim());
}

function limpiarTelefono(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function mostrarMensaje(contenedorId, texto, tipo = "error") {
  const el = document.getElementById(contenedorId);
  if (!el) return;
  el.textContent = texto;
  el.className = `auth-mensaje auth-mensaje-${tipo}`;
  el.hidden = false;
}

function ocultarMensaje(contenedorId) {
  const el = document.getElementById(contenedorId);
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
}

// ---------- Alternancia entre #vista-login y #vista-registro ----------
function inicializarAlternanciaVistas() {
  const vistaLogin = document.getElementById("vista-login");
  const vistaRegistro = document.getElementById("vista-registro");
  const btnIrRegistro = document.getElementById("ir-a-registro");
  const btnIrLogin = document.getElementById("ir-a-login");

  function mostrarVista(modo) {
    ocultarMensaje("login-mensaje");
    ocultarMensaje("registro-mensaje");

    if (modo === "registro") {
      if (vistaLogin) vistaLogin.hidden = true;
      if (vistaRegistro) vistaRegistro.hidden = false;
      document.title = "Crear cuenta nueva | Mil Variedades — La Ceja";
    } else {
      if (vistaRegistro) vistaRegistro.hidden = true;
      if (vistaLogin) vistaLogin.hidden = false;
      document.title = "Iniciar sesión | Mil Variedades — La Ceja";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (btnIrRegistro) {
    btnIrRegistro.addEventListener("click", () => mostrarVista("registro"));
  }
  if (btnIrLogin) {
    btnIrLogin.addEventListener("click", () => mostrarVista("login"));
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("modo") === "registro") {
    mostrarVista("registro");
  }
}

// ---------- Mostrar / Ocultar contraseña (ojito) ----------
function inicializarBotonesOjito() {
  const pares = [
    { btnId: "toggle-login-pass", inputId: "login-password" },
    { btnId: "toggle-reg-pass", inputId: "reg-password" },
    { btnId: "toggle-reg-confirmar", inputId: "reg-confirmar" },
  ];

  pares.forEach(({ btnId, inputId }) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener("click", () => {
      const esPassword = input.type === "password";
      input.type = esPassword ? "text" : "password";

      const icono = btn.querySelector("i");
      if (icono) {
        icono.className = esPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      }
    });
  });
}

// ---------- Modal Recuperar Contraseña ----------
function inicializarModalRecuperar() {
  const modal = document.getElementById("modal-recuperar");
  const btnAbrir = document.getElementById("btn-abrir-recuperar");
  const btnCerrar = document.getElementById("cerrar-modal-recuperar");
  const btnCancelar = document.getElementById("cancelar-recuperar");
  const formRecuperar = document.getElementById("form-recuperar");
  const inputRecCorreo = document.getElementById("rec-correo");

  if (!modal) return;

  function abrirModal() {
    ocultarMensaje("recuperar-mensaje");
    const correoLogin = document.getElementById("login-correo");
    if (inputRecCorreo && correoLogin && correoLogin.value.trim()) {
      inputRecCorreo.value = correoLogin.value.trim();
    }
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add("abierto");
      if (inputRecCorreo) inputRecCorreo.focus();
    });
  }

  function cerrarModal() {
    modal.classList.remove("abierto");
    modal.hidden = true;
    ocultarMensaje("recuperar-mensaje");
  }

  if (btnAbrir) btnAbrir.addEventListener("click", abrirModal);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  if (btnCancelar) btnCancelar.addEventListener("click", cerrarModal);

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) cerrarModal();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !modal.hidden) {
      cerrarModal();
    }
  });

  if (formRecuperar) {
    formRecuperar.addEventListener("submit", (evento) => {
      evento.preventDefault();
      ocultarMensaje("recuperar-mensaje");

      const correo = inputRecCorreo ? inputRecCorreo.value.trim() : "";
      if (!esCorreoValido(correo)) {
        mostrarMensaje("recuperar-mensaje", "Ingresa un correo electrónico válido.", "error");
        if (inputRecCorreo) inputRecCorreo.focus();
        return;
      }

      mostrarMensaje(
        "recuperar-mensaje",
        `Hemos enviado las instrucciones de recuperación a ${correo}. Revisa tu bandeja de entrada.`,
        "exito"
      );
      formRecuperar.reset();
    });
  }
}

// ---------- Modal Términos, Condiciones y Seguridad de Datos ----------
function inicializarModalTerminos() {
  const modal = document.getElementById("modal-terminos");
  const btnAbrir = document.getElementById("btn-abrir-terminos");
  const btnCerrar = document.getElementById("cerrar-modal-terminos");
  const btnAceptar = document.getElementById("btn-aceptar-terminos");
  const checkHabeas = document.getElementById("reg-habeas");

  if (!modal) return;

  function abrirModal(evento) {
    if (evento) {
      evento.preventDefault();
      evento.stopPropagation();
    }
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add("abierto");
    });
  }

  function cerrarModal() {
    modal.classList.remove("abierto");
    modal.hidden = true;
  }

  if (btnAbrir) btnAbrir.addEventListener("click", abrirModal);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);

  if (btnAceptar) {
    btnAceptar.addEventListener("click", () => {
      if (checkHabeas) checkHabeas.checked = true;
      cerrarModal();
    });
  }

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) cerrarModal();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !modal.hidden) {
      cerrarModal();
    }
  });
}

// ---------- Validación en tiempo real de contraseña en Registro ----------
function inicializarValidacionPasswordTiempoReal() {
  const inputPass = document.getElementById("reg-password");
  const inputConfirmar = document.getElementById("reg-confirmar");
  const textoCoincidencia = document.getElementById("texto-coincidencia");
  const textoLongitud = document.getElementById("texto-longitud-pass");

  if (!inputPass || !inputConfirmar || !textoCoincidencia) return;

  function actualizarEstadoTexto(contenedor, clasePunto, mensaje, colorTexto) {
    contenedor.textContent = "";
    const punto = document.createElement("span");
    punto.className = `auth-hint-dot ${clasePunto}`;
    contenedor.appendChild(punto);
    contenedor.append(` ${mensaje}`);
    contenedor.style.color = colorTexto || "";
  }

  function verificar() {
    const pass = inputPass.value;
    const conf = inputConfirmar.value;

    if (textoLongitud) {
      if (!pass) {
        actualizarEstadoTexto(
          textoLongitud,
          "auth-dot-amber",
          "Mínimo 8 caracteres alfanuméricos",
          ""
        );
      } else if (pass.length >= 8) {
        actualizarEstadoTexto(
          textoLongitud,
          "auth-dot-green",
          "Longitud segura (8+ caracteres)",
          "#166534"
        );
      } else {
        actualizarEstadoTexto(
          textoLongitud,
          "auth-dot-red",
          `Faltan ${8 - pass.length} caracteres (mínimo 8)`,
          "#b20112"
        );
      }
    }

    if (!conf && !pass) {
      actualizarEstadoTexto(
        textoCoincidencia,
        "auth-dot-green",
        "Verificación de coincidencia",
        ""
      );
      return;
    }

    if (pass.length < 8) {
      actualizarEstadoTexto(
        textoCoincidencia,
        "auth-dot-amber",
        "La contraseña debe tener al menos 8 caracteres",
        "#906900"
      );
      return;
    }

    if (conf && pass === conf) {
      actualizarEstadoTexto(
        textoCoincidencia,
        "auth-dot-green",
        "Las contraseñas coinciden correctamente",
        "#166534"
      );
    } else if (conf && pass !== conf) {
      actualizarEstadoTexto(
        textoCoincidencia,
        "auth-dot-red",
        "Las contraseñas no coinciden",
        "#b20112"
      );
    } else {
      actualizarEstadoTexto(
        textoCoincidencia,
        "auth-dot-amber",
        "Confirma tu contraseña",
        ""
      );
    }
  }

  inputPass.addEventListener("input", verificar);
  inputConfirmar.addEventListener("input", verificar);
}

// ---------- Flujo 1: Inicio de Sesión (#form-login) ----------
function inicializarFormularioLogin() {
  const form = document.getElementById("form-login");
  const inputCorreo = document.getElementById("login-correo");
  const inputPassword = document.getElementById("login-password");
  const btnSubmit = document.getElementById("btn-submit-login");
  const btnTexto = document.getElementById("btn-submit-login-texto");

  if (!form || !inputCorreo || !inputPassword) return;

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    ocultarMensaje("login-mensaje");

    const correo = inputCorreo.value.trim().toLowerCase();
    const contrasena = inputPassword.value;

    if (!esCorreoValido(correo)) {
      mostrarMensaje("login-mensaje", "Por favor ingresa un correo electrónico válido.", "error");
      inputCorreo.focus();
      return;
    }

    if (!contrasena) {
      mostrarMensaje("login-mensaje", "Por favor ingresa tu contraseña.", "error");
      inputPassword.focus();
      return;
    }

    if (btnSubmit) btnSubmit.disabled = true;
    if (btnTexto) btnTexto.textContent = "Verificando acceso…";

    try {
      // 1. Intentar autenticar contra el backend (administradores / empleados)
      const datos = await api.login(correo, contrasena);
      if (datos && datos.token && datos.usuario) {
        guardarSesion(datos.token, datos.usuario);
        window.location.href = "panel.html";
        return;
      }
    } catch (_errorBackend) {
      // 2. Si el backend rechaza, verificar si es un cliente registrado en localStorage
      const clientes = leerClientesLocales();
      const clienteEncontrado = clientes.find(
        (c) => String(c.correo || "").toLowerCase() === correo && c.password === contrasena
      );

      if (clienteEncontrado) {
        const nombreCompleto =
          clienteEncontrado.nombreCompleto ||
          `${clienteEncontrado.nombre || ""} ${clienteEncontrado.apellido || ""}`.trim() ||
          "Cliente";

        guardarClienteActivo({
          nombre: clienteEncontrado.nombre || nombreCompleto.split(" ")[0],
          apellido: clienteEncontrado.apellido || "",
          nombreCompleto,
          telefono: clienteEncontrado.telefono || "",
          correo: clienteEncontrado.correo,
          foto: clienteEncontrado.foto || "",
        });

        window.location.href = "index.html";
        return;
      }

      // 3. Si ninguno coincide, mostrar error claro y seguro
      mostrarMensaje(
        "login-mensaje",
        "Correo o contraseña incorrectos. Verifica tus datos o crea una cuenta nueva.",
        "error"
      );
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
      if (btnTexto) btnTexto.textContent = "Iniciar sesión";
    }
  });
}

// ---------- Flujo 2: Registro de Cliente (#form-registro) ----------
function inicializarFormularioRegistro() {
  const form = document.getElementById("form-registro");
  const inputNombre = document.getElementById("reg-nombre");
  const inputApellido = document.getElementById("reg-apellido");
  const inputTelefono = document.getElementById("reg-telefono");
  const inputCorreo = document.getElementById("reg-correo");
  const inputPassword = document.getElementById("reg-password");
  const inputConfirmar = document.getElementById("reg-confirmar");
  const checkHabeas = document.getElementById("reg-habeas");
  const checkPromos = document.getElementById("reg-promos");

  if (!form) return;

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    ocultarMensaje("registro-mensaje");

    const nombre = inputNombre ? inputNombre.value.trim() : "";
    const apellido = inputApellido ? inputApellido.value.trim() : "";
    const telefonoDigitos = limpiarTelefono(inputTelefono ? inputTelefono.value : "");
    const correo = inputCorreo ? inputCorreo.value.trim().toLowerCase() : "";
    const password = inputPassword ? inputPassword.value : "";
    const confirmar = inputConfirmar ? inputConfirmar.value : "";
    const aceptaHabeas = checkHabeas ? checkHabeas.checked : false;
    const aceptaPromos = checkPromos ? checkPromos.checked : true;

    if (!nombre || !apellido) {
      mostrarMensaje("registro-mensaje", "Por favor ingresa tu nombre y apellido completos.", "error");
      if (!nombre && inputNombre) inputNombre.focus();
      else if (inputApellido) inputApellido.focus();
      return;
    }

    if (telefonoDigitos.length !== 10) {
      mostrarMensaje(
        "registro-mensaje",
        "Ingresa un número de celular colombiano válido de 10 dígitos (ej: 310 000 0000).",
        "error"
      );
      if (inputTelefono) inputTelefono.focus();
      return;
    }

    if (!esCorreoValido(correo)) {
      mostrarMensaje("registro-mensaje", "Ingresa un correo electrónico válido.", "error");
      if (inputCorreo) inputCorreo.focus();
      return;
    }

    if (password.length < 8) {
      mostrarMensaje(
        "registro-mensaje",
        "La contraseña debe tener mínimo 8 caracteres alfanuméricos.",
        "error"
      );
      if (inputPassword) inputPassword.focus();
      return;
    }

    if (password !== confirmar) {
      mostrarMensaje("registro-mensaje", "Las contraseñas ingresadas no coinciden.", "error");
      if (inputConfirmar) inputConfirmar.focus();
      return;
    }

    if (!aceptaHabeas) {
      mostrarMensaje(
        "registro-mensaje",
        "Debes aceptar los Términos y Condiciones y la política de Habeas Data para continuar.",
        "error"
      );
      return;
    }

    const nombreCompleto = `${nombre} ${apellido}`.trim();
    const telefonoFormateado = `+57 ${telefonoDigitos}`;

    const clientes = leerClientesLocales();
    const indiceExistente = clientes.findIndex(
      (c) => String(c.correo || "").toLowerCase() === correo
    );

    const nuevoRegistro = {
      nombre,
      apellido,
      nombreCompleto,
      telefono: telefonoFormateado,
      correo,
      password,
      aceptaPromos,
      fechaRegistro: new Date().toISOString(),
    };

    if (indiceExistente >= 0) {
      clientes[indiceExistente] = nuevoRegistro;
    } else {
      clientes.push(nuevoRegistro);
    }

    guardarClientesLocales(clientes);

    guardarClienteActivo({
      nombre,
      apellido,
      nombreCompleto,
      telefono: telefonoFormateado,
      correo,
      foto: "",
    });

    window.location.href = "index.html";
  });
}

// ---------- Integración con Google Identity Services ----------
function decodificarJwtUtf8(token) {
  try {
    const partes = String(token || "").split(".");
    if (partes.length < 2) return null;

    let base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const jsonTexto = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(jsonTexto);
  } catch (_err) {
    return null;
  }
}

function manejarCredencialGoogle(response) {
  if (!response || !response.credential) return;

  const payload = decodificarJwtUtf8(response.credential);
  if (!payload || !payload.email) {
    mostrarMensaje("login-mensaje", "No se pudo verificar la cuenta de Google.", "error");
    return;
  }

  const nombre = String(payload.given_name || payload.name || "Cliente").trim();
  const apellido = String(payload.family_name || "").trim();
  const nombreCompleto = String(payload.name || `${nombre} ${apellido}`).trim();
  const correo = String(payload.email).trim().toLowerCase();
  const foto = payload.picture ? String(payload.picture).trim() : "";

  // Si el cliente ya había registrado teléfono antes en mv_clientes_locales, lo conservamos
  const clientes = leerClientesLocales();
  const previo = clientes.find((c) => String(c.correo || "").toLowerCase() === correo);

  guardarClienteActivo({
    nombre,
    apellido,
    nombreCompleto,
    telefono: previo && previo.telefono ? previo.telefono : "",
    correo,
    foto,
  });

  window.location.href = "index.html";
}

function inicializarBotonesGoogle() {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: manejarCredencialGoogle,
    auto_select: false,
  });

  const contenedorLogin = document.getElementById("google-btn-login");
  if (contenedorLogin) {
    contenedorLogin.textContent = "";
    window.google.accounts.id.renderButton(contenedorLogin, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 320,
    });
  }

  const contenedorRegistro = document.getElementById("google-btn-registro");
  if (contenedorRegistro) {
    contenedorRegistro.textContent = "";
    window.google.accounts.id.renderButton(contenedorRegistro, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signup_with",
      width: 320,
    });
  }
}

function cargarScriptGoogleAuth() {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    inicializarBotonesGoogle();
    return;
  }

  const existente = document.getElementById("google-gsi-script");
  if (existente) {
    existente.addEventListener("load", inicializarBotonesGoogle, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = "google-gsi-script";
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = inicializarBotonesGoogle;
  document.head.appendChild(script);
}

// ---------- Actualizar enlaces de soporte WhatsApp ----------
function cargarWhatsappSoporte() {
  const numeroFijo = "573218106700";
  const enlaces = document.querySelectorAll("[data-whatsapp-auth]");
  enlaces.forEach((enlace) => {
    const msg =
      "Hola Mil Variedades, necesito asistencia con mi cuenta o cotización en La Ceja.";
    enlace.href = `https://wa.me/${numeroFijo}?text=${encodeURIComponent(msg)}`;
  });
}
