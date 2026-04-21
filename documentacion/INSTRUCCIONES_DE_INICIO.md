# Guía de Inicio del Proyecto: Fichaje Hospitalario

Sigue estos pasos para arrancar correctamente tanto el servidor (backend) como la interfaz web (frontend).

## 📁 Nueva Estructura
El proyecto ahora está organizado en tres carpetas principales:
- **`backend/`**: Lógica del servidor y rutas.
- **`frontend/`**: Interfaz de usuario (Vite).
- **`documentacion/`**: Diagramas, archivos SQL e instrucciones.

## 1. Encender la Base de Datos
Antes de ejecutar cualquier código, el servidor necesita conectarse a la base de datos MySQL.
1. Abre **XAMPP Control Panel**.
2. Haz clic en **Start** en el módulo de **MySQL**. 
 *(Opcional: Si necesitas phpMyAdmin para ver los datos, también dale "Start" a Apache).*

> **Nota:** Si olvidaste hacer esto, cuando intentes iniciar el servidor verás el error: `Database connection was refused`.

## 2. Iniciar el Servidor (Backend)
Este entorno maneja las conexiones a la base de datos y provee la API (rutas).
1. Abre una nueva terminal en tu editor de código.
2. Asegúrate de estar en la carpeta raíz del proyecto (`PROYECTOFICHA`).
3. Ejecuta el comando simplificado:
   ```bash
   npm start
   ```
4. Si todo está correcto, verás: `🚀 Servidor corriendo en http://localhost:4000`

## 3. Iniciar la Página Web (Frontend)
El frontend usa Vite y ahora puede iniciarse cómodamente desde la carpeta raíz.
1. Abre **otra** terminal diferente (el servidor anterior debe seguir ejecutándose).
2. Asegúrate de estar en la raíz (`PROYECTOFICHA`) y ejecuta:
   ```bash
   npm run frontend
   ```
3. Verás que te proporciona una URL (generalmente `http://localhost:5173/`).
4. Haz clic en ese enlace o cópialo en tu navegador.

## 📄 Documentación y Diagramas
Si necesitas consultar el diseño de la base de datos o la lógica, dirígete a la carpeta `documentacion/`. Allí encontrarás:
- `diagrama_bd.html`: Mapa de tablas y relaciones.
- `diagrama_logica.html`: Diagrama de flujo de la aplicación.
- `hospital_fichaje_completo.sql`: Script de creación de la base de datos.

¡Listo! Con ambos componentes corriendo, todas las pantallas de tu clínica funcionarán a la perfección.

