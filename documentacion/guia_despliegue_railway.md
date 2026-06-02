# Guía de Despliegue en Railway.app

Esta guía te ayudará a subir tu proyecto a Railway, una plataforma "todo en uno" para Backend, Frontend y Base de Datos.

## 1. Preparar la Base de Datos en Railway
1. Ve a [railway.app](https://railway.app) e inicia sesión con GitHub.
2. Haz clic en **+ New Project**.
3. Selecciona **Provision MySQL**.
4. Una vez creada, ve a la pestaña **Variables** del servicio MySQL y busca la variable `MYSQL_URL`. La usaremos luego.

## 2. Desplegar el Backend y Frontend
1. En el mismo proyecto, haz clic en **+ New** -> **GitHub Repo**.
2. Selecciona tu repositorio `PROYECTOFICHA`.
3. Railway detectará automáticamente el archivo `package.json` y usará el comando `npm start`.

## 3. Configurar Variables de Entorno
Ve a la pestaña **Variables** de tu nuevo servicio de código y añade las siguientes:

| Variable | Valor / Origen |
| :--- | :--- |
| `DB_HOST` | El host que te dé Railway MySQL |
| `DB_USER` | El usuario que te dé Railway MySQL |
| `DB_PASSWORD` | La contraseña de Railway MySQL |
| `DB_NAME` | El nombre de la base de datos (normalmente `railway`) |
| `DB_PORT` | `3306` |
| `VITE_API_URL` | La URL que Railway le asigne a este servicio |

## 4. Comandos Útiles
- **Actualizar**: Solo haz `git push origin main` y Railway se encargará del resto.
- **Logs**: Puedes ver los errores en tiempo real en la pestaña **Logs** de Railway.
