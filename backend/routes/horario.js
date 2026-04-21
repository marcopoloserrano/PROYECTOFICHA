const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [horarios] = await db.query('SELECT * FROM Horario');
    res.json(horarios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener horarios', error: error.message });
  }
});

router.post('/crear', async (req, res) => {
  const { id_medico, dias_semana, hora_inicio, hora_fin, limite_fichas } = req.body;
  // Valores por defecto (Todo el año, permanentemente)
  const fecha_inicio = '2020-01-01';
  const fecha_fin = '2099-12-31';

  // Modificado: Ahora recibe "dias_semana" que espera ser un Array proveniente de los Checkboxes
  if (!id_medico || !dias_semana || !Array.isArray(dias_semana) || dias_semana.length === 0 || !hora_inicio || !hora_fin || !limite_fichas) {
    return res.status(400).json({ message: 'Faltan datos obligatorios o no se seleccionó ningún día de la semana.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const sqlQuery = `
      INSERT INTO Horario (id_medico, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, limite_fichas) 
      VALUES ?
    `;

    // Mapeamos cada uno de los checkboxes seleccionados a una nueva fila en BD
    const valoresAInsertar = dias_semana.map(dia => [
        id_medico, 
        dia, 
        hora_inicio, 
        hora_fin, 
        fecha_inicio, 
        fecha_fin, 
        limite_fichas
    ]);

    const [resultado] = await connection.query(sqlQuery, [valoresAInsertar]);
    await connection.commit();

    res.status(201).json({
      message: `¡Horario múltiple registrado exitosamente para ${dias_semana.length} días!`,
      filasInsertadas: resultado.affectedRows
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error interno guardando la colección de horarios.', error: error.message });
  } finally {
    connection.release();
  }
});


// DELETE /horarios/eliminar/:id  - Eliminar un horario por ID
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM Horario WHERE id_horario = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Horario no encontrado.' });
    res.json({ success: true, message: `Horario #${id} eliminado correctamente.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /horarios/actualizar/:id  - Actualizar un horario individual
router.put('/actualizar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_medico, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, limite_fichas } = req.body;
    const [result] = await db.query(
      `UPDATE Horario SET id_medico=?, dia_semana=?, hora_inicio=?, hora_fin=?, fecha_inicio=?, fecha_fin=?, limite_fichas=?
       WHERE id_horario=?`,
      [id_medico, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, limite_fichas, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Horario no encontrado.' });
    res.json({ success: true, message: `Horario #${id} actualizado correctamente.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

