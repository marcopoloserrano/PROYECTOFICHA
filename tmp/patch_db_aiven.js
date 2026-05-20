const mysql = require('mysql2/promise');

const config = {
  host: 'mysql-24ac1a4b-marco-8bff.a.aivencloud.com',
  port: 12407,
  user: 'avnadmin',
  password: 'AVNS_hlspJOUOuPdnO4JV2dD',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  }
};

async function patchDatabase() {
    console.log("🛠️ Aplicando parche de concurrencia DIRECTAMENTE a AIVEN...");
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log("✅ Conectado a Aiven.");

        console.log("Clearing existing locks to avoid duplicates during constraint creation...");
        await connection.query('TRUNCATE TABLE bloqueo_temporal');

        console.log("Adding UNIQUE constraint to bloqueo_temporal...");
        await connection.query(`
            ALTER TABLE bloqueo_temporal 
            ADD UNIQUE KEY uq_bloqueo (id_medico, fecha, hora)
        `);
        
        console.log("Updating interval default to 2 MINUTE...");
        await connection.query(`
            ALTER TABLE bloqueo_temporal 
            MODIFY expira_en TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 2 MINUTE)
        `);

        console.log("✅ Parche Aiven aplicado con éxito.");
    } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
            console.log("⚠️ La restricción UNIQUE ya existía en Aiven.");
        } else {
            console.error("❌ Error aplicando parche en Aiven:", e);
        }
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

patchDatabase();
