const db = require('../backend/db');
async function seed() {
  try {
    await db.query("INSERT IGNORE INTO Rol (nombre) VALUES ('Administrador'), ('Recepcionista'), ('Paciente')");
    await db.query("INSERT IGNORE INTO Cobertura (nombre) VALUES ('SUS'), ('PARTICULAR'), ('SEGURO')");
    
    const [roles] = await db.query('SELECT * FROM Rol');
    const adminRol = roles.find(r => r.nombre === 'Administrador');
    const secRol = roles.find(r => r.nombre === 'Recepcionista');
    
    if (adminRol && secRol) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('123', 10);
        await db.query('INSERT IGNORE INTO Usuario (usuario, contraseña, id_rol) VALUES (?, ?, ?)', ['admin', hash, adminRol.id_rol]);
        await db.query('INSERT IGNORE INTO Usuario (usuario, contraseña, id_rol) VALUES (?, ?, ?)', ['secretaria', hash, secRol.id_rol]);
        console.log('Usuarios creados correctamente con ID Rol ' + adminRol.id_rol + ' y ' + secRol.id_rol);
    } else {
        console.log('Error: Roles no encontrados');
    }
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
seed();
