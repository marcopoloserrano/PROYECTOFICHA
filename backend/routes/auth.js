const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// Registrar un nuevo usuario (Login/Auth)
router.post('/registrar', async (req, res) => {
  const { usuario, contraseña, id_rol } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ message: 'El usuario y la contraseña son obligatorios' });
  }

  try {
    // 1. Encriptar o "hashear" la contraseña usando bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    // 2. Insertar en la BD
    const sqlQuery = 'INSERT INTO Usuario (usuario, contraseña, id_rol) VALUES (?, ?, ?)';
    const valores = [usuario, hashedPassword, id_rol || null];

    const [resultado] = await db.query(sqlQuery, valores);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      id_usuario: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
});

// Iniciar sesión
router.post('/login', async (req, res) => {
  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
  }

  try {
    const [usuarios] = await db.query('SELECT * FROM Usuario WHERE usuario = ?', [usuario]);
    
    if (usuarios.length === 0) {
      return res.status(401).json({ message: 'El usuario no existe' });
    }

    const user = usuarios[0];

    // Verificar la contraseña contra el hash de la BD
    const esValida = await bcrypt.compare(contraseña, user.contraseña);

    if (!esValida) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    res.json({
      message: 'Inicio de sesión exitoso',
      usuario: { id: user.id_usuario, nombre: user.usuario, id_rol: user.id_rol }
      // Nota: Aquí se generaría y retornaría un JSON Web Token (JWT) en un entorno real.
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
});

// Autenticar Paciente (CI y fecha_nacimiento)
router.post('/paciente-login', async (req, res) => {
  const { ci, fecha_nacimiento } = req.body;

  if (!ci || !fecha_nacimiento) {
    return res.status(400).json({ message: 'CI y Fecha de Nacimiento son obligatorios' });
  }

  try {
    const [pacientes] = await db.query('SELECT * FROM Paciente WHERE ci = ? AND fecha_nacimiento = ?', [ci, fecha_nacimiento]);
    
    if (pacientes.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas o paciente no registrado' });
    }

    const paciente = pacientes[0];

    // Buscar si tiene historial
    const [historial] = await db.query('SELECT MAX(id_historial) as num_historial FROM Historial_Clinico WHERE id_paciente = ?', [paciente.id_paciente]);
    const num_historial = historial[0].num_historial ? historial[0].num_historial : paciente.id_paciente;

    res.json({
      message: 'Inicio de sesión de paciente exitoso',
      usuario: { 
        id: paciente.id_paciente, 
        nombre: paciente.nombre, 
        apellido: paciente.apellido,
        ci: paciente.ci,
        id_cobertura: paciente.id_cobertura,
        numero_historial: num_historial,
        rol: 'paciente' 
      }
    });

  } catch (error) {
    console.error('Error al iniciar sesión de paciente:', error);
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
});

module.exports = router;
