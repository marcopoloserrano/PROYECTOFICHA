const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hospital_fichaje',
  port: process.env.DB_PORT || 3336,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisify for Node.js async/await
const promisePool = pool.promise();

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error de conexión inicial a la base de datos:');
    if (err.code === 'PROTOCOL_CONNECTION_LOST') console.error('- La conexión a la BD fue cerrada.');
    else if (err.code === 'ER_CON_COUNT_ERROR') console.error('- La BD tiene demasiadas conexiones.');
    else if (err.code === 'ECONNREFUSED') console.error('- Conexión rechazada. ¿Cerraste el puerto o MySQL?');
    else console.error(`- Código de error: ${err.code} | Mensaje: ${err.message}`);
  } else {
    console.log('✅ Conectado exitosamente a la base de datos MySQL (Puerto 3336)');
    connection.release();
  }
});

module.exports = promisePool;
