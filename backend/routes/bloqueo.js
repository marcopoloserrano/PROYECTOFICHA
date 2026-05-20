const express = require('express');
const router = express.Router();
const db = require('../db');

// Reservar un horario temporalmente
router.post('/reservar', async (req, res) => {
    const { id_medico, fecha, hora, id_paciente } = req.body;

    if (!id_medico || !fecha || !hora) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    try {
        // 1. Limpiar bloqueos expirados primero
        await db.query('DELETE FROM Bloqueo_Temporal WHERE expira_en < CURRENT_TIMESTAMP');

        // 2. Verificar si ya existe un bloqueo activo o una ficha confirmada
        const [existente] = await db.query(
            'SELECT id_bloqueo, id_paciente FROM Bloqueo_Temporal WHERE id_medico = ? AND fecha = ? AND hora = ?',
            [id_medico, fecha, hora]
        );

        if (existente.length > 0) {
            if (existente[0].id_paciente == id_paciente) {
                return res.json({ message: 'Ya tienes este bloqueo', yaEsTuyo: true });
            }
            return res.status(409).json({ message: 'Este horario está siendo procesado por otro paciente' });
        }

        const [ficha] = await db.query(
            'SELECT id_ficha FROM Ficha WHERE id_medico = ? AND fecha = ? AND hora = ? AND estado != "Cancelado"',
            [id_medico, fecha, hora]
        );

        if (ficha.length > 0) {
            return res.status(409).json({ message: 'Este horario ya ha sido reservado definitivamente' });
        }

        // 3. Crear el bloqueo
        await db.query(
            'INSERT INTO Bloqueo_Temporal (id_medico, fecha, hora, id_paciente) VALUES (?, ?, ?, ?)',
            [id_medico, fecha, hora, id_paciente || null]
        );

        res.json({ message: 'Horario bloqueado temporalmente por 5 minutos' });
    } catch (error) {
        res.status(500).json({ message: 'Error al reservar temporalmente', error: error.message });
    }
});

// Liberar un bloqueo manualmente
router.delete('/liberar', async (req, res) => {
    const { id_medico, fecha, hora, id_paciente } = req.body;
    try {
        await db.query(
            'DELETE FROM Bloqueo_Temporal WHERE id_medico = ? AND fecha = ? AND hora = ? AND id_paciente = ?',
            [id_medico, fecha, hora, id_paciente]
        );
        res.json({ message: 'Bloqueo liberado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al liberar bloqueo', error: error.message });
    }
});

module.exports = router;
