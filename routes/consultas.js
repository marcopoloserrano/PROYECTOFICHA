const express = require('express');
const router = express.Router();
const db = require('../db');

// Función auxiliar para obtener el nombre del día en español
function getDiaEspanol(fechaString) {
  // Asegurar formato interpretado localmente correcto
  const fechaObj = new Date(fechaString + "T00:00:00");
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[fechaObj.getDay()];
}

// 1. Obtener disponibilidad de fichas por especialidad y fecha específica
router.get('/disponibilidad', async (req, res) => {
  const { especialidad_id, fecha } = req.query;

  if (!especialidad_id || !fecha) {
    return res.status(400).json({ message: 'Se requiere especialidad_id y fecha' });
  }

  try {
    const dia_semana = getDiaEspanol(fecha);

    // Obtener los médicos de dicha especialidad
    const queryMedicos = `
      SELECT m.id_medico, m.nombre, m.apellido 
      FROM Medico m
      JOIN Medico_Especialidad me ON m.id_medico = me.id_medico
      WHERE me.id_especialidad = ?
    `;
    const [medicos] = await db.query(queryMedicos, [especialidad_id]);

    if (medicos.length === 0) {
      return res.json([]);
    }

    const resultados = [];

    // Para cada médico, calcular disponibilidad
    for (let medico of medicos) {
      const p_medico = medico.id_medico;

      // a) Verificar horario laboral en el día seleccionado
      const [horarios] = await db.query(
        'SELECT id_horario, hora_inicio, hora_fin, limite_fichas FROM Horario WHERE id_medico = ? AND dia_semana = ?', 
        [p_medico, dia_semana]
      );

      if (horarios.length === 0) {
        // No trabaja este día
        continue;
      }
      
      const horario = horarios[0];
      const limite = horario.limite_fichas;

      // b) Verificar ausencias (vacaciones/permisos)
      const [ausenciaData] = await db.query(
        'SELECT motivo FROM Ausencia_Medico WHERE id_medico = ? AND fecha_ausencia = ?', 
        [p_medico, fecha]
      );

      if (ausenciaData.length > 0) {
        // Está con permiso
        resultados.push({
          medico: `Dr(a). ${medico.nombre} ${medico.apellido}`,
          horario: `${horario.hora_inicio} - ${horario.hora_fin}`,
          limite: limite,
          tomadas: 0,
          disponibles: 0,
          estado: 'Ausente',
          causa: ausenciaData[0].motivo || 'Permiso/Vacación'
        });
        continue;
      }

      // c) Contar las fichas ya asignadas para esa fecha y horario
      const [fichasData] = await db.query(
        'SELECT COUNT(*) as tomadas FROM Ficha WHERE id_medico = ? AND id_horario = ? AND fecha = ? AND estado != "Cancelado"', 
        [p_medico, horario.id_horario, fecha]
      );
      
      const tomadas = fichasData[0].tomadas;
      const disponibles = limite - tomadas;

      resultados.push({
        medico: `Dr(a). ${medico.nombre} ${medico.apellido}`,
        horario: `${horario.hora_inicio} - ${horario.hora_fin}`,
        limite: limite,
        tomadas: tomadas,
        disponibles: disponibles > 0 ? disponibles : 0,
        estado: disponibles > 0 ? 'Disponible' : 'Lleno',
        causa: null
      });
    }

    res.json(resultados);
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar disponibilidad', error: error.message });
  }
});

// 2. Obtener lista de doctores en permiso/vacación por especialidad
router.get('/ausencias', async (req, res) => {
  const { especialidad_id } = req.query;

  if (!especialidad_id) {
    return res.status(400).json({ message: 'Se requiere especialidad_id' });
  }

  try {
    const query = `
      SELECT m.id_medico, m.nombre, m.apellido, a.fecha_ausencia, a.motivo
      FROM Ausencia_Medico a
      JOIN Medico m ON a.id_medico = m.id_medico
      JOIN Medico_Especialidad me ON m.id_medico = me.id_medico
      WHERE me.id_especialidad = ? AND a.fecha_ausencia >= CURDATE()
      ORDER BY a.fecha_ausencia ASC
    `;
    const [ausencias] = await db.query(query, [especialidad_id]);
    res.json(ausencias);
  } catch (error) {
    res.status(500).json({ message: 'Error interno obteniendo ausencias por especialidad', error: error.message });
  }
});

module.exports = router;
