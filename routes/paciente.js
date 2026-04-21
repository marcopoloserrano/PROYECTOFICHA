const express = require('express');
const router = express.Router();
const db = require('../db');

// Ruta GET provisional para listar pacientes (opcional para pruebas)
router.get('/', async (req, res) => {
  try {
    const [pacientes] = await db.query('SELECT * FROM Paciente');
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pacientes', error: error.message });
  }
});

/**
 * CREAR UN PACIENTE (SUBIR DATOS A LA BASE DE DATOS)
 * Endpoint: POST /api/pacientes/crear
 */
router.post('/crear', async (req, res) => {
  // Extraemos las columnas exactas de tu tabla Paciente
  const { nombre, apellido, ci, telefono, correo, id_cobertura } = req.body;

  // Validación básica
  if (!nombre || !apellido || !ci) {
    return res.status(400).json({ message: 'Nombre, apellido y ci son obligatorios' });
  }

  try {
    // Consulta SQL usando los nombres reales de ts columnas
    const sqlQuery = `
      INSERT INTO Paciente (nombre, apellido, ci, telefono, correo, id_cobertura) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const valores = [
      nombre, 
      apellido, 
      ci, 
      telefono || null, 
      correo || null, 
      id_cobertura || null 
    ];

    const [resultado] = await db.query(sqlQuery, valores);

    res.status(201).json({
      message: 'Paciente registrado exitosamente en la base de datos',
      id_paciente: resultado.insertId
    });

  } catch (error) {
    console.error('Error al insertar paciente:', error);
    res.status(500).json({ 
      message: 'Error interno al intentar guardar el paciente', 
      error: error.message 
    });
  }
});

// Eliminar paciente en cascada (Fichas relacionadas)
router.delete('/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  const db = require('../db'); // Re-import en caso de que esté arriba
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Al no tener todas las tablas claras a la mano, borramos las principales dependencias
    await connection.query('DELETE FROM Ficha WHERE id_paciente = ?', [id]);
    const [result] = await connection.query('DELETE FROM Paciente WHERE id_paciente = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    }

    await connection.commit();
    res.json({ success: true, message: 'Paciente y sus fichas han sido eliminados del sistema.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Error de integridad referencial: ' + error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
