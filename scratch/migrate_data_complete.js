require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateAll() {
  console.log('🚀 Iniciando Migración Completa (Local -> Aiven)...');

  // CONFIGURACIÓN LOCAL (Origen)
  const localConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Cambia si tienes contraseña local
    database: 'hospital_fichaje',
    port: 3336
  };

  // CONFIGURACIÓN AIVEN (Destino)
  const cloudConfig = {
    host: 'mysql-24ac1a4b-marco-8bff.a.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_hlspJOUOuPdnO4JV2dD',
    database: 'defaultdb',
    port: 12407,
    ssl: { rejectUnauthorized: false }
  };

  let localConn, cloudConn;

  const tables = [
    'Rol', 'Cobertura', 'Especialidad', 'Medico', 'Paciente', 
    'Medico_Especialidad', 'Horario', 'Ausencia_Medico', 'Usuario', 
    'Ficha', 'Pago', 'Historial_Clinico', 'Bloqueo_Temporal'
  ];

  try {
    localConn = await mysql.createConnection(localConfig);
    console.log('✅ Conectado a base de datos Local.');

    cloudConn = await mysql.createConnection(cloudConfig);
    console.log('✅ Conectado a base de datos Aiven.');

    for (const table of tables) {
      console.log(`📦 Migrando tabla: ${table}...`);
      
      // 1. Leer datos de local
      const [rows] = await localConn.query(`SELECT * FROM ${table}`);
      
      if (rows.length === 0) {
        console.log(`   (Vacía, saltando...)`);
        continue;
      }

      // 2. Insertar en nube (usando INSERT IGNORE para evitar duplicados)
      const columnNames = Object.keys(rows[0]).join(', ');
      const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
      const sql = `INSERT IGNORE INTO ${table} (${columnNames}) VALUES (${placeholders})`;

      for (const row of rows) {
        await cloudConn.query(sql, Object.values(row));
      }

      console.log(`   ✅ ${rows.length} registros migrados.`);
    }

    console.log('\n🎉 ¡MIGRACIÓN TOTAL COMPLETADA CON ÉXITO! 🎉');
    console.log('💡 Ahora todos tus datos locales están en el celular/nube.');

  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error.message);
  } finally {
    if (localConn) await localConn.end();
    if (cloudConn) await cloudConn.end();
  }
}

migrateAll();
