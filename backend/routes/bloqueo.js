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
        await db.query('DELETE FROM bloqueo_temporal WHERE expira_en < CURRENT_TIMESTAMP');

        // 2. Intentar reservar de forma ATÓMICA
        try {
            await db.query(
                'INSERT INTO bloqueo_temporal (id_medico, fecha, hora, id_paciente) VALUES (?, ?, ?, ?)',
                [id_medico, fecha, hora, id_paciente || null]
            );
            return res.json({ message: 'Horario bloqueado temporalmente por 2 minutos' });
        } catch (insertErr) {
            // 3. Si falla por entrada duplicada, alguien más lo tiene (o yo mismo)
            if (insertErr.code === 'ER_DUP_ENTRY') {
                // Verificar si el bloqueo existente es MÍO para renovarlo o simplemente permitirlo
                const [bloqueoActual] = await db.query(
                    'SELECT id_paciente FROM bloqueo_temporal WHERE id_medico = ? AND fecha = ? AND hora = ?',
                    [id_medico, fecha, hora]
                );

                if (bloqueoActual.length > 0 && bloqueoActual[0].id_paciente == id_paciente) {
                    return res.json({ message: 'Sigues manteniendo tu reserva' });
                }
                
                return res.status(409).json({ message: 'Este horario ya está siendo reservado por otro usuario.' });
            }
            throw insertErr; // Otro error
        }
    } catch (error) {
        console.error('Error reserva:', error);
        res.status(500).json({ message: 'Error al reservar temporalmente: ' + error.message });
    }
});

// Liberar un bloqueo manualmente
router.delete('/liberar', async (req, res) => {
    const { id_medico, fecha, hora, id_paciente } = req.body;
    try {
        await db.query(
            'DELETE FROM bloqueo_temporal WHERE id_medico = ? AND fecha = ? AND hora = ? AND id_paciente = ?',
            [id_medico, fecha, hora, id_paciente]
        );
        res.json({ message: 'Bloqueo liberado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al liberar bloqueo', error: error.message });
    }
});

module.exports = router;
