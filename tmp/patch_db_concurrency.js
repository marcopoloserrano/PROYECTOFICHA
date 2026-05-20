require('dotenv').config();
const db = require('../backend/db');

async function patchDatabase() {
    console.log("🛠️ Aplicando parche de concurrencia a Aiven...");
    const connection = await db.getConnection();
    try {
        // 1. Agregar restricción UNIQUE
        console.log("Adding UNIQUE constraint...");
        await connection.query(`
            ALTER TABLE bloqueo_temporal 
            ADD UNIQUE KEY uq_bloqueo (id_medico, fecha, hora)
        `);
        
        // 2. Actualizar el valor por defecto del intervalo a 2 minutos
        console.log("Updating interval default...");
        await connection.query(`
            ALTER TABLE bloqueo_temporal 
            MODIFY expira_en TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 2 MINUTE)
        `);

        console.log("✅ Parche aplicado con éxito.");
    } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
            console.log("⚠️ La restricción UNIQUE ya existía.");
        } else {
            console.error("❌ Error aplicando parche:", e);
        }
    } finally {
        connection.release();
        process.exit();
    }
}

patchDatabase();
