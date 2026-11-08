# Base de datos — SICMV

## Crear la base de datos desde cero

### 1. Crear la base vacía
```powershell
mysql -u root -p
```
Dentro del prompt de MySQL:
```sql
CREATE DATABASE mil_variedades CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 2. Cargar la estructura de tablas (schema)
Desde PowerShell, dentro de la carpeta `db/`:
```powershell
mysql -u root -p mil_variedades < schema.sql
```

### 3. Generar el hash de la contraseña de prueba
Copia `generar-hash.js` a la carpeta `backend/` (necesita que `npm install` ya
se haya corrido ahí, porque usa la librería `bcrypt`) y ejecútalo:
```powershell
cd ../backend
node ../db/generar-hash.js "MiClaveTemporal123!"
```
Copia el hash que imprime y pégalo en `seed.sql`, reemplazando `<HASH_AQUI>`.

### 4. Cargar los datos de prueba (seed)
```powershell
cd ../db
mysql -u root -p mil_variedades < seed.sql
```

### 5. Verificar que todo cargó bien
```powershell
mysql -u root -p mil_variedades -e "SELECT nombre, correo FROM usuario; SELECT nombre, precio FROM producto;"
```
Deberías ver al usuario Super Administrador y los 4 productos de ejemplo.

---

## Restaurar la base de datos desde un backup (producción)

Si algo sale mal en producción y hay que restaurar el último backup:
```powershell
mysql -u root -p mil_variedades < backup_2026-08-26.sql
```
(el nombre exacto del archivo lo define el cron de backups configurado en el Agente 8)

## Reiniciar todo desde cero en desarrollo (borrar y recrear)
Si tu base local quedó en mal estado y quieres empezar limpio:
```sql
DROP DATABASE mil_variedades;
CREATE DATABASE mil_variedades CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Y repites los pasos 2 a 4 de arriba.

## Nota sobre "seguridad a nivel de fila"
MySQL no tiene Row Level Security nativo. Este esquema está diseñado para que
el control de acceso se aplique en el backend (Agente 2/3): cada consulta que
toque datos administrativos usa `WHERE` filtrando según el rol del usuario
autenticado. Nunca se debe dar acceso directo a esta base de datos desde el
frontend ni desde fuera del backend.
