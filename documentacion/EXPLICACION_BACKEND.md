# Estructura y Funcionamiento del Backend

Este documento explica la organización y el propósito de cada archivo dentro de la carpeta `backend/`. El sistema utiliza **Node.js** con el framework **Express** y se conecta a una base de datos **MySQL**.

## 🚀 Archivos Principales (Raíz de `backend/`)

### 1. `server.js`
Es el punto de entrada de la aplicación. Se encarga de:
- Configurar el servidor Express.
- Habilitar **CORS** para permitir peticiones desde el frontend.
- Cargar middlewares para procesar JSON (`body-parser`).
- **Servir archivos estáticos**: Configura la ruta del frontend y de la documentación.
- **Registro de Rutas**: Conecta los diferentes módulos de la API (ej: `/api/pacientes`, `/api/fichas`).
- Iniciar el servidor en el puerto 4000 (o el definido en `.env`).

### 2. `db.js`
Gestiona la conexión con la base de datos MySQL utilizando el paquete `mysql2`.
- Utiliza **Promises** (`mysql2/promise`) para permitir el uso de `async/await`.
- Configura un **Pool de conexiones** para mejorar el rendimiento y reutilizar conexiones.
- Lee las credenciales (Host, User, Password, Database) del archivo `.env`.

### 3. `wrapper.js`
Es un "envoltorio" de seguridad para el servidor.
- Su función principal es capturar **errores fatales** (excepciones no capturadas) para evitar que el servidor se apague por completo.
- Registra estos errores en `documentacion/crash_log.txt` para que puedas revisarlos después.

### 4. `test_endpoints.js`
Un pequeño script de utilidad para probar que el servidor responde correctamente sin necesidad de abrir el navegador o usar Postman.

---

## 🛣️ Rutas de la API (`backend/routes/`)

Cada archivo en esta carpeta define los "endpoints" (URLs) para un módulo específico del sistema:

| Archivo | Responsabilidad |
| :--- | :--- |
| **`paciente.js`** | Gestión de datos personales de pacientes (CRUD). |
| **`medico.js`** | Registro de médicos y asignación de sus especialidades. |
| **`ficha.js`** | **El núcleo del sistema**. Gestiona la creación de citas (fichas), el cálculo de cupos disponibles y la validación de disponibilidad. |
| **`horario.js`** | Configura los días y horas de trabajo de cada médico. |
| **`ausencia.js`** | Registra permisos o vacaciones de médicos para bloquear la agenda. |
| **`especialidad.js`** | Catálogo de especialidades médicas. |
| **`consultas.js`** | Consultas complejas para reportes o vistas de Real-Time. |
| **`auth.js`** | Lógica de inicio de sesión y seguridad (si aplica). |
| **`historial.js`** | Registro de atenciones pasadas de los pacientes. |
| **`db-test.js`** | Herramienta para verificar la estructura de las tablas desde el frontend. |
| **`pago.js`** | Gestión básica de coberturas (SUS, Particular, Seguro). |

---

## 🛠️ Tecnologías Utilizadas
- **Express.js**: Framework web para las rutas.
- **MySQL2**: Driver de conexión a la base de datos.
- **Dotenv**: Para manejar variables de entorno (configuración secreta).
- **Cors**: Para permitir la comunicación entre el puerto del frontend (5173) y el backend (4000).

---

## 💡 Notas para Desarrolladores
- **Validaciones**: Muchas validaciones (como no permitir dos citas el mismo día) se manejan mediante **Triggers** directamente en la base de datos MySQL, pero el backend captura esos errores y los traduce a mensajes amigables.
- **Async/Await**: Todo el código de rutas es asíncrono para no bloquear el servidor mientras se espera una respuesta de la base de datos.
