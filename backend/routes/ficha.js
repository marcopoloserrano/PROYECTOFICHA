const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las fichas con detalle de Nombres
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT f.id_ficha, f.fecha, f.hora, f.estado, 
             p.nombre AS paciente_nombre, p.apellido AS paciente_apellido, p.ci, 
             m.nombre AS medico_nombre, m.apellido AS medico_apellido
      FROM Ficha f
      JOIN Paciente p ON f.id_paciente = p.id_paciente
      JOIN Medico m ON f.id_medico = m.id_medico
      ORDER BY f.fecha ASC, f.hora ASC
    `;
    const [fichas] = await db.query(query);
    res.json(fichas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener fichas', error: error.message });
  }
});

// NUEVO: Calcular Disponibilidad (Límites vs Ocupados)
router.get('/disponibles', async (req, res) => {
  const { id_horario, fecha } = req.query;

  if (!id_horario || !fecha) {
    return res.status(400).json({ message: 'Se requiere id_horario y fecha' });
  }

  try {
    // 1. Obtener datos del Horario (límite y de qué médico es)
    const [horarioData] = await db.query('SELECT limite_fichas, id_medico FROM Horario WHERE id_horario = ?', [id_horario]);
    if (horarioData.length === 0) return res.status(404).json({ message: 'Horario no encontrado' });
    
    const limite = horarioData[0].limite_fichas;
    const p_medico = horarioData[0].id_medico;

    // 2. VERIFICACIÓN CRÍTICA: ¿Tiene Ausencia / Permiso activo ese día?
    const [ausenciaData] = await db.query('SELECT motivo FROM Ausencia_Medico WHERE id_medico = ? AND fecha_ausencia = ?', [p_medico, fecha]);
    if (ausenciaData.length > 0) {
        return res.json({
            fecha,
            limite: 0,
            tomadas: 0,
            disponibles: 0,
            horas_ocupadas: [],
            motivo_ausencia: ausenciaData[0].motivo
        });
    }

    // 3. Obtener las horas que ya están ocupadas
    const [fichasData] = await db.query(
        'SELECT hora FROM Ficha WHERE id_horario = ? AND fecha = ? AND estado != "Cancelado"', 
        [id_horario, fecha]
    );
    
    const horasOcupadas = fichasData.map(f => f.hora.substring(0, 5));
    const tomadas = horasOcupadas.length;
    const disponibles = limite - tomadas;

    res.json({
      fecha,
      limite,
      tomadas,
      disponibles: disponibles > 0 ? disponibles : 0,
      horas_ocupadas: horasOcupadas,
      motivo_ausencia: null
    });

  } catch (err) {
    res.status(500).json({ message: 'Error del servidor calculando cupos', err: err.message });
  }
});

// Crear una ficha médica
router.post('/crear', async (req, res) => {
  const { id_paciente, id_medico, id_horario, fecha, hora, estado } = req.body;

  if (!id_paciente || !id_medico || !fecha || !hora) {
    return res.status(400).json({ message: 'IDs de paciente, médico, fecha y hora son obligatorios' });
  }

  try {
    const sqlQuery = `
      INSERT INTO Ficha (id_paciente, id_medico, id_horario, fecha, hora, estado) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    // NUEVO: Verificación de "Un solo turno por SEMANA por paciente"
    const [existente] = await db.query(
      `SELECT id_ficha FROM Ficha 
       WHERE id_paciente = ? 
       AND YEARWEEK(fecha, 1) = YEARWEEK(?, 1)
       AND estado != "Cancelado"`,
      [id_paciente, fecha]
    );

    if (existente.length > 0) {
      return res.status(400).json({ 
        message: 'Ya tienes una cita agendada para esta semana. Solo se permite una cita por semana.',
        isValidationError: true 
      });
    }

    const valores = [id_paciente, id_medico, id_horario || null, fecha, hora, estado || 'Pendiente'];

    const [resultado] = await db.query(sqlQuery, valores);

    res.status(201).json({
      message: 'Ficha médica creada exitosamente',
      id_ficha: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear la ficha:', error);

    // Si es un error de SIGNAL SQLSTATE (Triggers de MySQL)
    if (error.code === 'ER_SIGNAL_EXCEPTION' || error.errno === 1644) {
      return res.status(400).json({ 
        message: error.sqlMessage || 'Error de validación en la base de datos',
        isValidationError: true 
      });
    }

    res.status(500).json({ 
      message: 'Error interno del servidor', 
      error: error.message 
    });
  }
});

module.exports = router;
