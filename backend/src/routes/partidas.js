const { Router } = require('express');
const { sql } = require('../db');

const router = Router();

// GET /api/partidas - Listar con filtros
router.get('/', async (req, res, next) => {
    try {
        const { tipo, jugador_id, limit = 50, offset = 0 } = req.query;

        let partidas;

        if (tipo && tipo !== 'todas' && jugador_id && jugador_id !== 'todos') {
            partidas = await sql`
                SELECT DISTINCT p.* FROM partidas p
                JOIN partida_jugadores pj ON pj.partida_id = p.id
                WHERE p.tipo = ${tipo} AND pj.jugador_id = ${parseInt(jugador_id)}
                ORDER BY p.created_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        } else if (tipo && tipo !== 'todas') {
            partidas = await sql`
                SELECT * FROM partidas WHERE tipo = ${tipo}
                ORDER BY created_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        } else if (jugador_id && jugador_id !== 'todos') {
            partidas = await sql`
                SELECT DISTINCT p.* FROM partidas p
                JOIN partida_jugadores pj ON pj.partida_id = p.id
                WHERE pj.jugador_id = ${parseInt(jugador_id)}
                ORDER BY p.created_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        } else {
            partidas = await sql`
                SELECT * FROM partidas
                ORDER BY created_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        }

        // Enriquecer con jugadores
        const resultado = await Promise.all(partidas.map(async (p) => {
            const jugadores = await sql`
                SELECT pj.equipo, j.id, j.nombre
                FROM partida_jugadores pj
                JOIN jugadores j ON j.id = pj.jugador_id
                WHERE pj.partida_id = ${p.id}
                ORDER BY pj.equipo, pj.id
            `;

            const equipo1 = jugadores.filter(j => j.equipo === 'equipo1');
            const equipo2 = jugadores.filter(j => j.equipo === 'equipo2');

            return { ...p, equipo1, equipo2 };
        }));

        res.json(resultado);
    } catch (err) {
        next(err);
    }
});

// POST /api/partidas/individual - Registrar partida individual
router.post('/individual', async (req, res, next) => {
    try {
        const { jugador1_id, jugador2_id, puntos1, puntos2, ganador_id } = req.body;

        if (!jugador1_id || !jugador2_id || puntos1 == null || puntos2 == null || !ganador_id) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        if (jugador1_id === jugador2_id) {
            return res.status(400).json({ error: 'Los jugadores deben ser diferentes' });
        }

        const ganador = ganador_id === jugador1_id ? 'equipo1' : 'equipo2';

        const [partida] = await sql`
            INSERT INTO partidas (tipo, puntos1, puntos2, ganador)
            VALUES ('individual', ${parseInt(puntos1)}, ${parseInt(puntos2)}, ${ganador})
            RETURNING *
        `;

        await sql`
            INSERT INTO partida_jugadores (partida_id, jugador_id, equipo) VALUES
            (${partida.id}, ${parseInt(jugador1_id)}, 'equipo1'),
            (${partida.id}, ${parseInt(jugador2_id)}, 'equipo2')
        `;

        res.status(201).json(partida);
    } catch (err) {
        next(err);
    }
});

// POST /api/partidas/parejas - Registrar partida en parejas
router.post('/parejas', async (req, res, next) => {
    try {
        const { equipo1, equipo2, puntos1, puntos2, ganador } = req.body;

        if (!equipo1 || !equipo2 || equipo1.length !== 2 || equipo2.length !== 2) {
            return res.status(400).json({ error: 'Cada equipo debe tener 2 jugadores' });
        }

        if (puntos1 == null || puntos2 == null || !ganador) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const todos = [...equipo1, ...equipo2];
        if (new Set(todos).size !== 4) {
            return res.status(400).json({ error: 'Todos los jugadores deben ser diferentes' });
        }

        const [partida] = await sql`
            INSERT INTO partidas (tipo, puntos1, puntos2, ganador)
            VALUES ('parejas', ${parseInt(puntos1)}, ${parseInt(puntos2)}, ${ganador})
            RETURNING *
        `;

        await sql`
            INSERT INTO partida_jugadores (partida_id, jugador_id, equipo) VALUES
            (${partida.id}, ${parseInt(equipo1[0])}, 'equipo1'),
            (${partida.id}, ${parseInt(equipo1[1])}, 'equipo1'),
            (${partida.id}, ${parseInt(equipo2[0])}, 'equipo2'),
            (${partida.id}, ${parseInt(equipo2[1])}, 'equipo2')
        `;

        res.status(201).json(partida);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/partidas/:id - Eliminar partida
router.delete('/:id', async (req, res, next) => {
    try {
        const [partida] = await sql`
            DELETE FROM partidas WHERE id = ${req.params.id} RETURNING id
        `;
        if (!partida) return res.status(404).json({ error: 'Partida no encontrada' });
        res.json({ message: 'Partida eliminada' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
