const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los médicos con sus especialidades
router.get('/', async (req, res) => {
  try {
    // Usamos GROUP_CONCAT para obtener un string csv de las especialidades, ya que JSON_ARRAYAGG puede dar problemas en versiones viejas de MySQL.
    const [medicos] = await db.query(`
      SELECT m.*, GROUP_CONCAT(me.id_especialidad) as especialidades
      FROM Medico m
      LEFT JOIN Medico_Especialidad me ON m.id_medico = me.id_medico
      GROUP BY m.id_medico
    `);

    // Parsear el string CSV de especialidades a un arreglo de IDs reales
    const medicosParseados = medicos.map(m => ({
      ...m,
      especialidades: m.especialidades 
        ? m.especialidades.split(',').map(Number) 
        : []
    }));

    res.json(medicosParseados);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener médicos', error: error.message });
  }
});

// Crear un médico y enlazar sus especialidades
router.post('/crear', async (req, res) => {
  const { nombre, apellido, telefono, especialidades } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({ message: 'Nombre y apellido son obligatorios' });
  }

  // Transaction para asegurar que el médico y sus especialidades se guarden bien
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Insertar Medico
    const sqlQuery = 'INSERT INTO Medico (nombre, apellido, telefono) VALUES (?, ?, ?)';
    const valores = [nombre, apellido, telefono || null];
    const [resultado] = await connection.query(sqlQuery, valores);
    const id_medico = resultado.insertId;

    // 2. Insertar Especialidades (si las enviaron por el body en un arreglo [1, 3, etc])
    if (especialidades && Array.isArray(especialidades) && especialidades.length > 0) {
      const sqlEspecialidad = 'INSERT INTO Medico_Especialidad (id_medico, id_especialidad) VALUES ?';
      const valuesEspecialidad = especialidades.map(id_esp => [id_medico, id_esp]);
      await connection.query(sqlEspecialidad, [valuesEspecialidad]);
    }

    await connection.commit(); // Todo salió bien, confirmar guardado
    res.status(201).json({
      message: 'Médico registrado exitosamente',
      id_medico: id_medico
    });

  } catch (error) {
    await connection.rollback(); // Hubo error, deshacer inserciones
    console.error('Error al insertar médico:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  } finally {
    connection.release(); // Liberar la conexión
  }
});

// Modificar un médico existente y sus especialidades
router.put('/actualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, especialidades } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({ message: 'Nombre y apellido son obligatorios' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Actualizar Medico
    const sqlQuery = 'UPDATE Medico SET nombre = ?, apellido = ?, telefono = ? WHERE id_medico = ?';
    const valores = [nombre, apellido, telefono || null, id];
    const [resultado] = await connection.query(sqlQuery, valores);

    if (resultado.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    // 2. Borrar especialidades antiguas
    await connection.query('DELETE FROM Medico_Especialidad WHERE id_medico = ?', [id]);

    // 3. Insertar las nuevas especialidades recibidas
    if (especialidades && Array.isArray(especialidades) && especialidades.length > 0) {
      const sqlEspecialidad = 'INSERT INTO Medico_Especialidad (id_medico, id_especialidad) VALUES ?';
      const valuesEspecialidad = especialidades.map(id_esp => [id, id_esp]);
      await connection.query(sqlEspecialidad, [valuesEspecialidad]);
    }

    await connection.commit();
    res.json({ success: true, message: 'Médico y especialidades actualizados correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar médico:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  } finally {
    connection.release();
  }
});

// Eliminar un médico y sus datos dependientes (Cascada Manual)
router.delete('/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query('DELETE FROM Ficha WHERE id_medico = ?', [id]);
    await connection.query('DELETE FROM Horario WHERE id_medico = ?', [id]);
    await connection.query('DELETE FROM Ausencia_Medico WHERE id_medico = ?', [id]);
    await connection.query('DELETE FROM Medico_Especialidad WHERE id_medico = ?', [id]);
    const [result] = await connection.query('DELETE FROM Medico WHERE id_medico = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Médico no encontrado' });
    }

    await connection.commit();
    res.json({ success: true, message: 'Médico y todo su historial eliminados correctamente.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar médico:', error);
    res.status(500).json({ success: false, message: 'Error al forzar borrado: ' + error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
