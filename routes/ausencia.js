const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las ausencias con Nombres de Medicos (Para el Dashboard del Paciente)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT a.id_ausencia, a.fecha_ausencia, a.motivo, m.nombre, m.apellido
      FROM Ausencia_Medico a
      JOIN Medico m ON a.id_medico = m.id_medico
      ORDER BY a.fecha_ausencia ASC
    `;
    const [ausencias] = await db.query(query);
    res.json(ausencias);
  } catch (error) {
    res.status(500).json({ message: 'Error interno obteniendo ausencias', error: error.message });
  }
});

// Registrar permisos/ausencias para un rango de fechas
router.post('/crear', async (req, res) => {
  const { id_medico, fecha_inicio, fecha_fin, motivo } = req.body;

  if (!id_medico || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ message: 'Faltan datos: Médico, Fecha Inicio o Fecha Fin' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const start = new Date(fecha_inicio + "T00:00:00");
    const end = new Date(fecha_fin + "T00:00:00");

    if (start > end) {
        return res.status(400).json({ message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin' });
    }

    const unDiaMillis = 24 * 60 * 60 * 1000;
    const diasTotal = Math.round(Math.abs((end - start) / unDiaMillis)) + 1;
    const valuesAInsertar = [];

    for (let i = 0; i < diasTotal; i++) {
        const currentDate = new Date(start.getTime() + (i * unDiaMillis));
        const fechaStr = currentDate.toISOString().split('T')[0];
        valuesAInsertar.push([id_medico, fechaStr, motivo || 'Permiso/Vacación Rango']);
    }

    const sqlQuery = 'INSERT INTO Ausencia_Medico (id_medico, fecha_ausencia, motivo) VALUES ?';
    const [resultado] = await connection.query(sqlQuery, [valuesAInsertar]);

    await connection.commit();

    res.status(201).json({
      message: `Ausencia/Permiso registrado exitosamente para ${diasTotal} días.`,
      filasInsertadas: resultado.affectedRows
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error de BD registrando permiso', error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
