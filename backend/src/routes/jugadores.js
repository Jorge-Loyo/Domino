const { Router } = require('express');
const { sql } = require('../db');

const router = Router();

// GET /api/jugadores - Listar todos
router.get('/', async (req, res, next) => {
    try {
        const jugadores = await sql`
            SELECT id, nombre, created_at FROM jugadores ORDER BY nombre ASC
        `;
        res.json(jugadores);
    } catch (err) {
        next(err);
    }
});

// GET /api/jugadores/:id - Obtener uno
router.get('/:id', async (req, res, next) => {
    try {
        const [jugador] = await sql`
            SELECT id, nombre, created_at FROM jugadores WHERE id = ${req.params.id}
        `;
        if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' });
        res.json(jugador);
    } catch (err) {
        next(err);
    }
});

// POST /api/jugadores - Crear jugador
router.post('/', async (req, res, next) => {
    try {
        const { nombre } = req.body;
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const [existente] = await sql`
            SELECT id FROM jugadores WHERE LOWER(nombre) = LOWER(${nombre.trim()})
        `;
        if (existente) {
            return res.status(409).json({ error: 'Ese jugador ya existe' });
        }

        const [jugador] = await sql`
            INSERT INTO jugadores (nombre) VALUES (${nombre.trim()}) RETURNING id, nombre, created_at
        `;
        res.status(201).json(jugador);
    } catch (err) {
        next(err);
    }
});

// PUT /api/jugadores/:id - Editar nombre
router.put('/:id', async (req, res, next) => {
    try {
        const { nombre } = req.body;
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const [jugador] = await sql`
            UPDATE jugadores SET nombre = ${nombre.trim()} WHERE id = ${req.params.id}
            RETURNING id, nombre, created_at
        `;
        if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' });
        res.json(jugador);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/jugadores/:id - Eliminar
router.delete('/:id', async (req, res, next) => {
    try {
        const [jugador] = await sql`
            DELETE FROM jugadores WHERE id = ${req.params.id} RETURNING id
        `;
        if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' });
        res.json({ message: 'Jugador eliminado' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
