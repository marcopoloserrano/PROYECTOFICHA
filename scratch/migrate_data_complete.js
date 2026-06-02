const mysql = require('mysql2/promise');

// CONFIGURACIÓN - LLENA ESTOS DATOS
const LOCAL_CONFIG = {
    host: '127.0.0.1',
    port: 3336,
    user: 'root',
    password: '',
    database: 'hospital_fichaje'
};

// Pega aquí la "Public URL" de tu MySQL en Railway
const RAILWAY_PUBLIC_URL = 'mysql://root:NqLEDoeNgDITewtbNGlptsoUKrKWnLqq@zephyr.proxy.rlwy.net:20343/railway';

async function migrate() {
    let localConn, remoteConn;
    try {
        console.log('🚀 Iniciando migración de datos...');

        localConn = await mysql.createConnection(LOCAL_CONFIG);
        console.log('✅ Conectado a base de datos LOCAL (XAMPP)');

        remoteConn = await mysql.createConnection(RAILWAY_PUBLIC_URL);
        console.log('✅ Conectado a base de datos REMOTA (Railway)');

        // Lista de tablas a migrar en orden de dependencia
        const tables = [
            'rol', 'cobertura', 'especialidad', 'usuario', 'paciente',
            'medico', 'consultorio', 'horario', 'medico_especialidad',
            'ficha', 'pago', 'historial_clinico', 'ausencia_medico', 'bloqueo_temporal'
        ];

        // Desactivar checks de llaves foráneas temporalmente
        await remoteConn.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const table of tables) {
            console.log(`📦 Migrando tabla: ${table}...`);

            // 1. Obtener datos de local
            const [rows] = await localConn.query(`SELECT * FROM ${table}`);

            if (rows.length === 0) {
                console.log(`   ⚠️ La tabla ${table} está vacía, saltando...`);
                continue;
            }

            // 2. Limpiar tabla remota (opcional, para evitar duplicados)
            await remoteConn.query(`DELETE FROM ${table}`);

            // 3. Insertar en remoto
            const keys = Object.keys(rows[0]);
            const columns = keys.join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = rows.map(row => keys.map(key => row[key]));

            const sql = `INSERT IGNORE INTO ${table} (${columns}) VALUES ?`;
            await remoteConn.query(sql, [values]);

            console.log(`   ✅ ${rows.length} filas migradas con éxito.`);
        }

        await remoteConn.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('\n✨ ¡Migración completada con éxito!');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        if (localConn) await localConn.end();
        if (remoteConn) await remoteConn.end();
    }
}

migrate();
