// ============================================================
// MIL VARIEDADES — login.js
// Solo maneja el formulario de login y la llamada a la API — ninguna
// lógica de negocio nueva vive aquí (esa ya vive en el backend).
// Nunca se muestra ni se loguea la contraseña en la consola.
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  activarFormularioLogin();
});

function activarFormularioLogin() {
  const form = document.getElementById("form-login");
  const inputCorreo = document.getElementById("input-correo");
  const inputContrasena = document.getElementById("input-contrasena");
  const elError = document.getElementById("login-error");
  const btn = document.getElementById("btn-login");
  const btnTexto = document.getElementById("btn-login-texto");

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    ocultarError();

    const correo = inputCorreo.value.trim();
    const contrasena = inputContrasena.value;

    // Validación mínima en el frontend (solo formato/presencia) — la
    // validación real de credenciales vive y debe seguir viviendo en el
    // backend; esto solo evita una petición innecesaria con datos vacíos.
    if (!validarFormatoCorreo(correo)) {
      mostrarError("Ingresa un correo electrónico válido.");
      inputCorreo.focus();
      return;
    }
    if (!contrasena) {
      mostrarError("Ingresa tu contraseña.");
      inputContrasena.focus();
      return;
    }

    iniciarCarga();
    try {
      const resultado = await api.login(correo, contrasena);
      guardarSesion(resultado.token, resultado.usuario);
      redirigirSegunRol(resultado.usuario.rol);
    } catch (error) {
      // Se muestra tal cual el mensaje que devuelve el backend (ej.
      // "Correo o contraseña incorrectos"), sin inventar uno nuevo ni
      // exponer detalles técnicos.
      mostrarError(error.message || "No se pudo iniciar sesión. Intenta de nuevo.");
      detenerCarga();
    }
  });

  function mostrarError(mensaje) {
    elError.textContent = mensaje;
    elError.style.display = "block";
  }

  function ocultarError() {
    elError.style.display = "none";
    elError.textContent = "";
  }

  function iniciarCarga() {
    btn.disabled = true;
    btnTexto.textContent = "Iniciando sesión…";
  }

  function detenerCarga() {
    btn.disabled = false;
    btnTexto.textContent = "Iniciar sesión";
  }
}

function validarFormatoCorreo(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

// Hoy Administrador y Super Administrador comparten el mismo panel (que
// todavía no existe — es tarea aparte). Esta función queda lista para
// diferenciar destinos el día que existan pantallas distintas por rol,
// sin tener que tocar el resto del flujo de login.
function redirigirSegunRol(rol) {
  switch (rol) {
    case "super_admin":
    case "admin":
    default:
      window.location.href = "panel.html";
  }
}
