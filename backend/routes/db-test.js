const express = require('express');
const router = express.Router();
const db = require('../db');

// Lista blanca de tablas permitidas (seguridad básica)
async function getAllowedTables() {
    const [rows] = await db.query('SHOW TABLES');
    return new Set(rows.map(r => Object.values(r)[0]));
}

// GET / - Obtener todas las tablas con datos y columnas
router.get('/', async (req, res) => {
    try {
        const [tablesRows] = await db.query('SHOW TABLES');
        const dbNameKey = Object.keys(tablesRows[0])[0];
        const allTablesData = {};

        for (let row of tablesRows) {
            const tableName = row[dbNameKey];
            const [tableData] = await db.query(`SELECT * FROM \`${tableName}\` LIMIT 100`);
            const [tableColumns] = await db.query(`SHOW COLUMNS FROM \`${tableName}\``);

            allTablesData[tableName] = {
                columns: tableColumns.map(col => col.Field),
                columnsMeta: tableColumns.map(col => ({
                    field: col.Field,
                    type: col.Type,
                    null: col.Null,
                    key: col.Key,
                    default: col.Default,
                    extra: col.Extra
                })),
                data: tableData
            };
        }

        res.json({ success: true, tables: allTablesData });

    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /:table - Insertar una fila en la tabla
router.post('/:table', async (req, res) => {
    try {
        const tableName = req.params.table;
        const allowed = await getAllowedTables();
        if (!allowed.has(tableName)) {
            return res.status(403).json({ success: false, message: 'Tabla no permitida.' });
        }

        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, message: 'No se enviaron datos.' });
        }

        // Filtrar campos vacíos opcionales
        const filteredData = {};
        for (const [k, v] of Object.entries(data)) {
            if (v !== '' && v !== null && v !== undefined) {
                filteredData[k] = v;
            }
        }

        const columns = Object.keys(filteredData).map(c => `\`${c}\``).join(', ');
        const placeholders = Object.keys(filteredData).map(() => '?').join(', ');
        const values = Object.values(filteredData);

        const [result] = await db.query(
            `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`,
            values
        );

        res.json({ success: true, insertId: result.insertId, message: `Fila insertada con ID ${result.insertId}` });

    } catch (error) {
        console.error("Error al insertar:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /:table/:id - Eliminar una fila por PK (primer campo de la tabla)
router.delete('/:table/:id', async (req, res) => {
    try {
        const tableName = req.params.table;
        const id = req.params.id;
        const pkField = req.query.pk; // nombre del campo PK enviado por el frontend

        const allowed = await getAllowedTables();
        if (!allowed.has(tableName)) {
            return res.status(403).json({ success: false, message: 'Tabla no permitida.' });
        }
        if (!pkField) {
            return res.status(400).json({ success: false, message: 'Falta el campo PK (pk query param).' });
        }

        const [result] = await db.query(
            `DELETE FROM \`${tableName}\` WHERE \`${pkField}\` = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Fila no encontrada.' });
        }

        res.json({ success: true, message: `Fila con ${pkField}=${id} eliminada.` });

    } catch (error) {
        console.error("Error al eliminar:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /:table/:id - Modificar una fila por PK
router.put('/:table/:id', async (req, res) => {
    try {
        const tableName = req.params.table;
        const id = req.params.id;
        const pkField = req.query.pk;

        const allowed = await getAllowedTables();
        if (!allowed.has(tableName)) {
            return res.status(403).json({ success: false, message: 'Tabla no permitida.' });
        }
        if (!pkField) {
            return res.status(400).json({ success: false, message: 'Falta el campo PK (pk query param).' });
        }

        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, message: 'No se enviaron datos para actualizar.' });
        }

        // Filtrar campos para el UPDATE
        const filteredData = {};
        for (const [k, v] of Object.entries(data)) {
             filteredData[k] = (v === '') ? null : v;
        }

        const updates = Object.keys(filteredData).map(c => `\`${c}\` = ?`).join(', ');
        const values = Object.values(filteredData);
        values.push(id); // Para el WHERE id = ?

        const [result] = await db.query(
            `UPDATE \`${tableName}\` SET ${updates} WHERE \`${pkField}\` = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Fila no encontrada para modificar.' });
        }

        res.json({ success: true, message: `Fila con ${pkField}=${id} actualizada correctamente.` });

    } catch (error) {
        console.error("Error al actualizar:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

