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
    'rol', 'cobertura', 'especialidad', 'medico', 'paciente', 
    'medico_especialidad', 'horario', 'ausencia_medico', 'usuario', 
    'ficha', 'pago', 'historial_clinico', 'bloqueo_temporal'
  ];

  try {
    localConn = await mysql.createConnection(localConfig);
    console.log('✅ Conectado a base de datos Local.');

    cloudConn = await mysql.createConnection(cloudConfig);
    console.log('✅ Conectado a base de datos Aiven.');

    for (const table of tables) {
      console.log(`📦 Migrando tabla: ${table}...`);
      
      // 1. Leer datos de local (usamos el nombre de la tabla tal cual)
      // Nota: Si en local son PascalCase, MySQL en Windows los encontrará igual.
      const [rows] = await localConn.query(`SELECT * FROM ${table}`);
      
      if (rows.length === 0) {
        console.log(`   (Vacía, saltando...)`);
        continue;
      }

      // 2. Insertar en nube (usando INSERT IGNORE para evitar duplicados de PK)
      const columnNames = Object.keys(rows[0]).join(', ');
      const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
      const sql = `INSERT IGNORE INTO ${table} (${columnNames}) VALUES (${placeholders})`;

      let migrados = 0;
      let omitidos = 0;

      for (const row of rows) {
        try {
            await cloudConn.query(sql, Object.values(row));
            migrados++;
        } catch (e) {
            // Error 1644 es el de los TRIGGERS (SIGNAL SQLSTATE)
            if (e.errno === 1644 || e.code === 'ER_SIGNAL_EXCEPTION') {
                omitidos++;
            } else {
                console.error(`   ❌ Error en fila de ${table}:`, e.message);
                throw e; 
            }
        }
      }

      console.log(`   ✅ ${migrados} registros migrados${omitidos > 0 ? ` (${omitidos} omitidos por reglas de negocio/triggers)` : ''}.`);
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
