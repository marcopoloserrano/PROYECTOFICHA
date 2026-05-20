/**
 * MIGRACIÓN DE BASE DE DATOS A LA NUBE
 * 
 * Este script lee tu archivo SQL local y lo ejecuta en tu base de datos de Aiven.
 * INSTRUCCIONES:
 * 1. Llena los datos de tu servicio Aiven abajo.
 * 2. Ejecuta en la terminal: node scratch/deploy_db.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// ==========================================================
// 1. RELLENA ESTOS DATOS CON TU INFORMACIÓN DE AIVEN:
// ==========================================================
const config = {
  host: 'mysql-24ac1a4b-marco-8bff.a.aivencloud.com',
  port: 12407, // Ejemplo: 12407 (sin comillas)
  user: 'avnadmin',
  password: '',
  database: 'defaultdb', // Aiven suele llamar a la BD inicial defaultdb
  ssl: {
    rejectUnauthorized: false
  }
};
// ==========================================================

async function migrate() {
  console.log('🚀 Iniciando migración a Aiven...');

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida con Aiven.');

    const sqlPath = path.join(__dirname, '../documentacion/hospital_fichaje_completo.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // 1. Limpiar el SQL: Quitar DELIMITER y cambiar $$ por ;
    sql = sql.replace(/^DELIMITER.*$/gm, ''); // Quita líneas de DELIMITER
    sql = sql.replace(/\$\$/g, ';');           // Cambia $$ por ; (esto funciona si los END$$ se vuelven END;)

    // 2. Dividir comandos pero respetando los bloques BEGIN...END de los triggers
    const statements = [];
    let currentStatement = '';
    let inBlock = 0;

    const lines = sql.split('\n');
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || (trimmedLine.startsWith('--') && !trimmedLine.includes('END'))) continue;

      currentStatement += line + '\n';

      const upperLine = trimmedLine.toUpperCase();

      // Manejo más preciso de bloques
      if (upperLine.includes('BEGIN')) inBlock++;

      // Solo decrementar si es un END solo, no un END IF o END LOOP
      if (upperLine.startsWith('END') && !upperLine.includes('IF') && !upperLine.includes('LOOP') && !upperLine.includes('WHILE')) {
        inBlock--;
      }

      if (trimmedLine.endsWith(';') && inBlock <= 0) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inBlock = 0;
      }
    }

    console.log(`📦 Se encontraron ${statements.length} comandos SQL preparados. Ejecutando...`);

    for (let statement of statements) {
      try {
        await connection.query(statement);
      } catch (e) {
        // Ignorar error si intenta crear la DB y no tiene permisos (Aiven usa defaultdb)
        if (statement.toUpperCase().startsWith('CREATE DATABASE') || statement.toUpperCase().startsWith('USE ')) {
          console.log(`⚠️  Omitiendo: ${statement.substring(0, 30)}... (Usando defaultdb)`);
          continue;
        }
        if (e.code === 'ER_DUP_ENTRY') {
          console.log(`⏭️  Omitiendo (ya existe): ${statement.substring(0, 40)}...`);
          continue;
        }
        throw e; // Otros errores sí son importantes
      }
    }

    console.log('🎉 ¡Migración completada con éxito! Tus tablas ya están en la nube.');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
