# Guía de Inicio del Proyecto: Fichaje Hospitalario

Sigue estos pasos para arrancar correctamente tanto el servidor (backend) como la interfaz web (frontend).

## 1. Encender la Base de Datos
Antes de ejecutar cualquier código, el servidor necesita conectarse a la base de datos MySQL.
1. Abre **XAMPP Control Panel**.
2. Haz clic en **Start** en el módulo de **MySQL**. 
 *(Opcional: Si necesitas phpMyAdmin para ver los datos, también dale "Start" a Apache).*

> **Nota:** Si olvidaste hacer esto, cuando intentes iniciar el servidor verás el error: `Database connection was refused`.

## 2. Iniciar el Servidor (Backend)
Este entorno maneja las conexiones a la base de datos y provee la API (rutas).
1. Abre una nueva terminal en tu editor de código.
2. Asegúrate de estar en la carpeta raíz del proyecto, es decir: `d:\SHC TALLER DE ESPECIALIDAD\PROYECTOFICHA\`
3. Ejecuta el siguiente comando:
   ```bash
   node server.js
   ```
4. Si todo está correcto, te dirá:
   `🚀 Servidor corriendo en http://localhost:3000`

## 3. Iniciar la Página Web (Frontend)
La interfaz del proyecto usa Vite, por lo que necesita ser inicializada de otra forma.
1. Abre **otra** terminal diferente (el servidor anterior debe seguir ejecutándose).
2. Ve a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
3. Ejecuta el comando de Vite para iniciar la página:
   ```bash
   npm run dev
   ```
4. Verás que te proporciona unas URLs (generalmente `http://localhost:5173/`).
5. Mantén apretada la tecla **Ctrl** (o Cmd) y haz clic en ese enlace, o simplemente cópialo y pégalo en tu navegador.

¡Listo! Con ambos componentes corriendo, todas las pantallas de tu clínica funcionarán a la perfección.
