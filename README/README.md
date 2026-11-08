# Mil Variedades — SICMV

Sistema de Información Comercial para la papelería Mil Variedades (La Ceja, Antioquia).
Catálogo digital + panel administrativo + contacto por WhatsApp.

## Cómo levantar el proyecto en tu computador (5 pasos)

### 1. Instalar las dependencias del backend
Abre una terminal DENTRO de la carpeta `backend` y ejecuta:
```
cd backend
npm install
```
Esto lee el `package.json` y descarga todas las librerías necesarias dentro de una
carpeta `node_modules` (que Git ignora, por eso cada quien la genera en su máquina).

### 2. Crear tu archivo de variables de entorno
```
copy .env.example .env
```
Abre el `.env` recién creado y llena `DB_PASSWORD` (la contraseña de tu MySQL local)
y `JWT_SECRET` (genera uno con el comando de la sección de abajo).

### 3. Crear la base de datos
Con MySQL corriendo en tu computador, desde la carpeta `db`:
```
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
```
Ver `db/README-db.md` para el detalle completo de este paso.

### 4. Levantar el backend
Desde la carpeta `backend`:
```
npm run dev
```
Si todo está bien configurado, verás en la consola algo como
`Servidor corriendo en http://localhost:4000`.

### 5. Abrir el frontend
Abre la carpeta `frontend` en VS Code y usa la extensión **Live Server**
(clic derecho sobre `pages/index.html` → "Open with Live Server").

## Generar un JWT_SECRET seguro
En cualquier terminal con Node instalado:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copia el texto largo que imprime y pégalo como valor de `JWT_SECRET` en tu `.env`.

## Estructura del proyecto
```
backend/   → API REST (Node + Express + MySQL)
frontend/  → HTML/CSS/JS del catálogo y panel administrativo
db/        → Scripts SQL (schema, seed, restauración)
docs/      → Documentación del proyecto (ERS, diagramas, este plan de agentes)
```

## Reglas de oro
- El archivo `.env` real NUNCA se sube a Git ni se comparte por chat.
- Todo cambio de esquema de base de datos se documenta en `db/`.
- Antes de reiniciar el proyecto desde cero por un error, revisar `docs/TROUBLESHOOTING.md`.
