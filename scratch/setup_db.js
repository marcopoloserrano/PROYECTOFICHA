const db = require('../backend/db');

const sql = `
CREATE TABLE IF NOT EXISTS Bloqueo_Temporal (
    id_bloqueo INT AUTO_INCREMENT PRIMARY KEY,
    id_medico INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    id_paciente INT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 5 MINUTE),
    FOREIGN KEY (id_medico) REFERENCES Medico(id_medico)
);
`;

async function setup() {
    try {
        console.log("Ejecutando script de creación de tabla...");
        await db.query(sql);
        console.log("✅ Tabla Bloqueo_Temporal creada o ya existente.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error creando la tabla:", error.message);
        process.exit(1);
    }
}

setup();
