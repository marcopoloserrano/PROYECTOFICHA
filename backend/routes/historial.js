const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todo el historial
router.get('/', async (req, res) => {
  try {
    const [historial] = await db.query('SELECT * FROM Historial_Clinico');
    res.json(historial);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial', error: error.message });
  }
});

// Crear un historial clínico
router.post('/crear', async (req, res) => {
  const { id_paciente, diagnostico, tratamiento, fecha } = req.body;

  if (!id_paciente || !diagnostico) {
    return res.status(400).json({ message: 'ID del paciente y diagnóstico son obligatorios' });
  }

  try {
    const sqlQuery = `
      INSERT INTO Historial_Clinico (id_paciente, diagnostico, tratamiento, fecha) 
      VALUES (?, ?, ?, ?)
    `;
    const valores = [id_paciente, diagnostico, tratamiento || null, fecha || null];

    const [resultado] = await db.query(sqlQuery, valores);

    res.status(201).json({
      message: 'Historial clínico creado exitosamente',
      id_historial: resultado.insertId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
});

module.exports = router;
