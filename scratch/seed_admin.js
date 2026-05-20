require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function sedAdmin() {
  console.log('🚀 Creando usuario administrador inicial en Aiven...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Asegurar que el Rol de Administrador existe (ID 1)
    await connection.query("INSERT IGNORE INTO Rol (id_rol, nombre) VALUES (1, 'Administrador')");
    
    // 2. Crear contraseña hasheada
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // 3. Insertar usuario admin
    await connection.query(
      "INSERT IGNORE INTO Usuario (usuario, contraseña, id_rol) VALUES (?, ?, ?)",
      ['admin', hashedPassword, 1]
    );

    console.log('✅ Usuario Administrador creado con éxito.');
    console.log('👉 Usuario: admin');
    console.log('👉 Contraseña: admin123');
    console.log('💡 Intenta loguearte ahora en la web.');

  } catch (err) {
    console.error('❌ Error al crear admin:', err.message);
  } finally {
    await connection.end();
  }
}

sedAdmin();
