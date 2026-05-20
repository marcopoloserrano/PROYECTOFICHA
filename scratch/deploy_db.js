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
  password: 'AVNS_hlspJOUOuPdnO4JV2dD',
  database: 'defaultdb', // Aiven suele llamar a la BD inicial defaultdb
  ssl: {
    rejectUnauthorized: false
  }
};
// ==========================================================

async function migrate() {
  console.log('🚀 Iniciando migración a Aiven (Modo Protegido)...');

  let connection;
  try {
    // Activamos multipleStatements para procesar el script de una sola vez
    connection = await mysql.createConnection({
      ...config,
      multipleStatements: true
    });
    console.log('✅ Conexión establecida con Aiven.');

    const sqlPath = path.join(__dirname, '../documentacion/hospital_fichaje_completo.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Limpieza crítica para entornos de nube:
    // 1. Quitar DELIMITER y cambiar $$ por ;
    sql = sql.replace(/^DELIMITER.*$/gm, '');
    sql = sql.replace(/\$\$/g, ';');

    // 2. Comentar los CREATE DATABASE y USE ya que Aiven no los permite/necesita
    sql = sql.replace(/CREATE DATABASE/gi, '-- CREATE DATABASE');
    sql = sql.replace(/USE /gi, '-- USE ');

    console.log('📦 Ejecutando script completo...');

    await connection.query(sql);

    console.log('🎉 ¡MIGRTACIÓN COMPLETADA! Todas las tablas y triggers están en la nube.');
    console.log('💡 Ahora el servidor de Render debería funcionar correctamente.');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    if (error.sql) console.error('SQL fallido:', error.sql.substring(0, 100) + '...');
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
