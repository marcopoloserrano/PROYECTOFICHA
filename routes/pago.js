const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener pagos
router.get('/', async (req, res) => {
  try {
    const [pagos] = await db.query('SELECT * FROM Pago');
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pagos', error: error.message });
  }
});

// Registrar un pago
router.post('/crear', async (req, res) => {
  const { id_ficha, monto, metodo, estado_pago } = req.body;

  if (!id_ficha || !monto) {
    return res.status(400).json({ message: 'Ficha y monto son obligatorios' });
  }

  try {
    const sqlQuery = `
      INSERT INTO Pago (id_ficha, monto, metodo, estado_pago) 
      VALUES (?, ?, ?, ?)
    `;
    const valores = [id_ficha, monto, metodo || null, estado_pago || 'Pendiente'];

    const [resultado] = await db.query(sqlQuery, valores);

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      id_pago: resultado.insertId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
});

module.exports = router;
