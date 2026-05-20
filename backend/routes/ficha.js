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
      FROM ficha f
      JOIN paciente p ON f.id_paciente = p.id_paciente
      JOIN medico m ON f.id_medico = m.id_medico
      ORDER BY f.fecha ASC, f.hora ASC
    `;
    const [fichas] = await db.query(query);
    res.json(fichas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener fichas', error: error.message });
  }
});

// Obtener todas las fichas del día de hoy (Para Secretaria)
router.get('/hoy', async (req, res) => {
    try {
        const query = `
            SELECT f.id_ficha, f.hora, f.estado, 
                   p.nombre AS paciente_nombre, p.apellido AS paciente_apellido, p.ci,
                   m.nombre AS medico_nombre, m.apellido AS medico_apellido,
                   e.nombre AS especialidad_nombre
            FROM ficha f
            JOIN paciente p ON f.id_paciente = p.id_paciente
            JOIN medico m ON f.id_medico = m.id_medico
            JOIN medico_especialidad me ON m.id_medico = me.id_medico
            JOIN especialidad e ON me.id_especialidad = e.id_especialidad
            WHERE f.fecha = CURDATE()
            ORDER BY f.hora ASC
        `;
        const [fichas] = await db.query(query);
        res.json(fichas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener fichas de hoy', error: error.message });
    }
});

// NUEVO: Verificar si el paciente ya tiene ficha esta semana (SOLO PARA SUS)
router.get('/verificar-semana/:id_paciente', async (req, res) => {
  const { id_paciente } = req.params;
  try {
      // 1. Obtener la cobertura del paciente
      const [paciente] = await db.query('SELECT id_cobertura FROM paciente WHERE id_paciente = ?', [id_paciente]);
      if (paciente.length === 0) return res.json({ tieneFicha: false });

      const id_cobertura = paciente[0].id_cobertura;

      // Si no es SUS (1), no hay restricción semanal
      if (id_cobertura != 1) {
          return res.json({ tieneFicha: false });
      }

      // 2. Si es SUS, verificar si ya tiene ficha esta semana
      const [rows] = await db.query(
          `SELECT fecha, hora, m.nombre as medico_nombre, m.apellido as medico_apellido
           FROM ficha f
           JOIN medico m ON f.id_medico = m.id_medico
           WHERE f.id_paciente = ? 
           AND YEARWEEK(f.fecha, 1) = YEARWEEK(CURDATE(), 1)
           AND f.estado NOT IN ('Cancelado', 'Anulado')`,
          [id_paciente]
      );
      
      if (rows.length > 0) {
          return res.json({ 
              tieneFicha: true, 
              ficha: rows[0],
              message: `Al ser paciente SUS, se te informa que ya tienes una reserva para esta semana (${rows[0].fecha.toISOString().split('T')[0]}) con el Dr. ${rows[0].medico_nombre}.` 
          });
      }
      res.json({ tieneFicha: false });
  } catch (error) {
      res.status(500).json({ message: 'Error verificando semana', error: error.message });
  }
});

// NUEVO: Confirmar asistencia de un paciente (Secretaria)
router.patch('/confirmar/:id_ficha', async (req, res) => {
    const { id_ficha } = req.params;
    try {
        const [resultado] = await db.query(
            'UPDATE ficha SET estado = "Confirmado" WHERE id_ficha = ? AND estado = "Vigente"',
            [id_ficha]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ message: 'Ficha no encontrada o ya no está vigente' });
        }

        res.json({ message: 'Ficha confirmada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al confirmar ficha', error: error.message });
    }
});

// Obtener historial de fichas de un paciente específico
router.get('/paciente/:id_paciente', async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const query = `
            SELECT f.id_ficha, f.fecha, f.hora, f.estado,
                   m.nombre AS medico_nombre, m.apellido AS medico_apellido,
                   e.nombre AS especialidad_nombre
            FROM ficha f
            JOIN medico m ON f.id_medico = m.id_medico
            JOIN medico_especialidad me ON m.id_medico = me.id_medico
            JOIN especialidad e ON me.id_especialidad = e.id_especialidad
            WHERE f.id_paciente = ?
            ORDER BY f.fecha DESC, f.hora DESC
        `;
        const [fichas] = await db.query(query, [id_paciente]);
        res.json(fichas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener historial de fichas', error: error.message });
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
    const [horarioData] = await db.query('SELECT limite_fichas, id_medico FROM horario WHERE id_horario = ?', [id_horario]);
    if (horarioData.length === 0) return res.status(404).json({ message: 'Horario no encontrado' });
    
    const limite = horarioData[0].limite_fichas;
    const p_medico = horarioData[0].id_medico;

    // 2. VERIFICACIÓN CRÍTICA: ¿Tiene Ausencia / Permiso activo ese día?
    const [ausenciaData] = await db.query('SELECT motivo FROM ausencia_medico WHERE id_medico = ? AND fecha_ausencia = ?', [p_medico, fecha]);
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
        'SELECT hora FROM ficha WHERE id_horario = ? AND fecha = ? AND estado != "Cancelado"', 
        [id_horario, fecha]
    );
    
    const horasOcupadas = fichasData.map(f => f.hora.substring(0, 5));

    // 4. Limpiar bloqueos expirados primero para asegurar datos frescos
    await db.query('DELETE FROM bloqueo_temporal WHERE expira_en < CURRENT_TIMESTAMP');

    // 5. Obtener las horas que están en proceso (Bloqueo_Temporal)
    const [bloqueosData] = await db.query(
        'SELECT hora FROM bloqueo_temporal WHERE id_medico = ? AND fecha = ? AND expira_en > CURRENT_TIMESTAMP',
        [p_medico, fecha]
    );
    const horasEnProceso = bloqueosData.map(b => b.hora.substring(0, 5));

    const tomadas = horasOcupadas.length;
    const disponibles = limite - tomadas;

    res.json({
      fecha,
      limite,
      tomadas,
      disponibles: disponibles > 0 ? disponibles : 0,
      horas_ocupadas: horasOcupadas,
      horas_en_proceso: horasEnProceso,
      motivo_ausencia: null
    });

  } catch (err) {
    console.error('Error calculando cupos:', err);
    res.status(500).json({ 
        message: 'Error del servidor calculando cupos: ' + err.message
    });
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
      INSERT INTO ficha (id_paciente, id_medico, id_horario, fecha, hora, estado) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    // NUEVO: Verificación de "Un solo turno por SEMANA por paciente" (SOLO PARA SUS)
    const [pacienteData] = await db.query('SELECT id_cobertura FROM paciente WHERE id_paciente = ?', [id_paciente]);
    const id_cobertura = pacienteData.length > 0 ? pacienteData[0].id_cobertura : null;

    if (id_cobertura === 1) {
        const [existente] = await db.query(
            `SELECT id_ficha FROM ficha 
             WHERE id_paciente = ? 
             AND YEARWEEK(fecha, 1) = YEARWEEK(?, 1)
             AND estado NOT IN ("Cancelado", "Anulado")`,
            [id_paciente, fecha]
        );

        if (existente.length > 0) {
            return res.status(400).json({ 
                message: 'Para esa semana ya no puedes reservar una ficha (Restricción SUS)',
                isValidationError: true 
            });
        }
    }

    const valores = [id_paciente, id_medico, id_horario || null, fecha, hora, estado || 'Pendiente'];

    const [resultado] = await db.query(sqlQuery, valores);

    // NUEVO: Liberar el bloqueo temporal si existía
    await db.query(
      'DELETE FROM bloqueo_temporal WHERE id_medico = ? AND fecha = ? AND hora = ? AND id_paciente = ?',
      [id_medico, fecha, hora, id_paciente]
    );

    res.status(201).json({
      message: 'Ficha médica creada exitosamente',
      id_ficha: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear la ficha:', error);

    // Si es un error de duplicado (mismo medico, fecha, hora)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        message: 'Lo sentimos, este horario acaba de ser reservado por otro paciente. Por favor elige otro.',
        isValidationError: true 
      });
    }

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
