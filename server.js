require('dotenv').config();

// Capturar errores fatales para que el servidor no se apague
process.on('unhandledRejection', (reason, promise) => {
  console.error('🛑 RECHAZO NO MANEJADO en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🛑 EXCEPCIÓN NO CAPTURADA:', err);
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Permitir desde cualquier origen en desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (HTML, CSS, JS)
app.use(express.static('frontend'));

// Basic route to test API and DB Connection
app.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ 
      message: '🏥 API del Hospital funcionando correctamente', 
      dbStatus: 'Conectado a MySQL', 
      testQuery: rows[0].solution 
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ 
      message: '⚠️ API funcionando, pero sin conexión a la base de datos', 
      error: error.message 
    });
  }
});

// Registrar Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/fichas', require('./routes/ficha'));
app.use('/api/historial', require('./routes/historial'));
app.use('/api/horarios', require('./routes/horario'));
app.use('/api/medicos', require('./routes/medico'));
app.use('/api/pacientes', require('./routes/paciente'));
app.use('/api/pagos', require('./routes/pago'));
app.use('/api/especialidades', require('./routes/especialidad'));
app.use('/api/ausencias', require('./routes/ausencia'));
app.use('/api/db-test', require('./routes/db-test'));
app.use('/api/consultas', require('./routes/consultas'));

// Middleware global de manejo de errores (Captura errores en las rutas)
app.use((err, req, res, next) => {
  console.error('❌ Error detectado en la ruta:', req.method, req.url);
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Hubo un error interno en el servidor', 
    error: err.message 
  });
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`👉 Visita la ruta base para probar la conexión: http://localhost:${PORT}`);
});