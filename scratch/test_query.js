const db = require('../backend/db');

async function test() {
    try {
        const query = `
            SELECT f.id_ficha, f.hora, f.estado, 
                   p.nombre AS paciente_nombre, p.apellido AS paciente_apellido, p.ci,
                   m.nombre AS medico_nombre, m.apellido AS medico_apellido,
                   e.nombre AS especialidad_nombre
            FROM Ficha f
            JOIN Paciente p ON f.id_paciente = p.id_paciente
            JOIN Medico m ON f.id_medico = m.id_medico
            JOIN Medico_Especialidad me ON m.id_medico = me.id_medico
            JOIN Especialidad e ON me.id_especialidad = e.id_especialidad
            WHERE f.fecha = CURDATE()
            ORDER BY f.hora ASC
        `;
        const [fichas] = await db.query(query);
        console.log("Resultados:", fichas);
        process.exit(0);
    } catch (error) {
        console.error("Error en query:", error.message);
        process.exit(1);
    }
}

test();
