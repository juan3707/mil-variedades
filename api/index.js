// Punto de entrada estándar de Vercel Serverless (/api/index.js).
// Restaura la ruta original enviada por vercel.json (?__vercel_path=...)
// conservando todos los query params reales para que Express resuelva
// /api/* y /uploads/* sin perder la ruta tras el rewrite interno de Vercel.
const app = require("../backend/src/server");

module.exports = (req, res) => {
  try {
    const parsedUrl = new URL(req.url || "/", "http://localhost");
    const vercelPath = parsedUrl.searchParams.get("__vercel_path");
    if (vercelPath) {
      parsedUrl.searchParams.delete("__vercel_path");
      const query = parsedUrl.searchParams.toString();
      const targetPath = vercelPath.startsWith("/") ? vercelPath : `/${vercelPath}`;
      req.url = query ? `${targetPath}?${query}` : targetPath;
    }
  } catch (_err) {
    // Si la URL no puede parsearse, continuamos con req.url original
  }

  return app(req, res);
};
