const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las especialidades
router.get('/', async (req, res) => {
  try {
    const [especialidades] = await db.query('SELECT * FROM Especialidad');
    res.json(especialidades);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener especialidades', error: error.message });
  }
});

// Crear una especialidad
router.post('/crear', async (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre de la especialidad es obligatorio' });
  }

  try {
    const sqlQuery = 'INSERT INTO Especialidad (nombre) VALUES (?)';
    const [resultado] = await db.query(sqlQuery, [nombre]);

    res.status(201).json({
      message: 'Especialidad registrada exitosamente',
      id_especialidad: resultado.insertId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
});

module.exports = router;
