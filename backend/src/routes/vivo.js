const { Router } = require('express');
const { sql } = require('../db');

const router = Router();

// GET /api/vivo - Obtener partida activa
router.get('/', async (req, res, next) => {
    try {
        const [partida] = await sql`
            SELECT * FROM partidas_vivo WHERE activa = TRUE ORDER BY created_at DESC LIMIT 1
        `;
        res.json(partida || null);
    } catch (err) {
        next(err);
    }
});

// POST /api/vivo/iniciar - Iniciar partida en vivo
router.post('/iniciar', async (req, res, next) => {
    try {
        const { tipo, meta, equipo1_jugadores, equipo2_jugadores, equipo1_nombre, equipo2_nombre } = req.body;

        if (!tipo || !meta || !equipo1_jugadores || !equipo2_jugadores) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Desactivar partidas activas anteriores
        await sql`UPDATE partidas_vivo SET activa = FALSE WHERE activa = TRUE`;

        const [partida] = await sql`
            INSERT INTO partidas_vivo (tipo, meta, equipo1_nombre, equipo2_nombre, equipo1_jugadores, equipo2_jugadores, rondas)
            VALUES (${tipo}, ${parseInt(meta)}, ${equipo1_nombre}, ${equipo2_nombre},
                    ${JSON.stringify(equipo1_jugadores)}, ${JSON.stringify(equipo2_jugadores)}, '[]')
            RETURNING *
        `;

        res.status(201).json(partida);
    } catch (err) {
        next(err);
    }
});

// POST /api/vivo/:id/ronda - Sumar ronda
router.post('/:id/ronda', async (req, res, next) => {
    try {
        const { puntos1, puntos2 } = req.body;

        if (puntos1 == null || puntos2 == null) {
            return res.status(400).json({ error: 'Puntos requeridos' });
        }

        const [partida] = await sql`
            SELECT * FROM partidas_vivo WHERE id = ${req.params.id} AND activa = TRUE
        `;

        if (!partida) {
            return res.status(404).json({ error: 'Partida no encontrada o ya finalizada' });
        }

        const rondas = [...partida.rondas, { pts1: parseInt(puntos1), pts2: parseInt(puntos2) }];
        const nuevoPuntos1 = partida.puntos1 + parseInt(puntos1);
        const nuevoPuntos2 = partida.puntos2 + parseInt(puntos2);

        const [actualizada] = await sql`
            UPDATE partidas_vivo
            SET puntos1 = ${nuevoPuntos1}, puntos2 = ${nuevoPuntos2}, rondas = ${JSON.stringify(rondas)}
            WHERE id = ${req.params.id}
            RETURNING *
        `;

        res.json(actualizada);
    } catch (err) {
        next(err);
    }
});

// POST /api/vivo/:id/deshacer - Deshacer última ronda
router.post('/:id/deshacer', async (req, res, next) => {
    try {
        const { index } = req.body;

        const [partida] = await sql`
            SELECT * FROM partidas_vivo WHERE id = ${req.params.id} AND activa = TRUE
        `;

        if (!partida) {
            return res.status(404).json({ error: 'Partida no encontrada' });
        }

        const rondas = [...partida.rondas];
        const rondaIndex = index != null ? index : rondas.length - 1;

        if (rondaIndex < 0 || rondaIndex >= rondas.length) {
            return res.status(400).json({ error: 'Índice de ronda inválido' });
        }

        const rondaEliminada = rondas.splice(rondaIndex, 1)[0];
        const nuevoPuntos1 = partida.puntos1 - rondaEliminada.pts1;
        const nuevoPuntos2 = partida.puntos2 - rondaEliminada.pts2;

        const [actualizada] = await sql`
            UPDATE partidas_vivo
            SET puntos1 = ${nuevoPuntos1}, puntos2 = ${nuevoPuntos2}, rondas = ${JSON.stringify(rondas)}
            WHERE id = ${req.params.id}
            RETURNING *
        `;

        res.json(actualizada);
    } catch (err) {
        next(err);
    }
});

// POST /api/vivo/:id/finalizar - Finalizar y guardar en historial
router.post('/:id/finalizar', async (req, res, next) => {
    try {
        const [partida] = await sql`
            SELECT * FROM partidas_vivo WHERE id = ${req.params.id}
        `;

        if (!partida) {
            return res.status(404).json({ error: 'Partida no encontrada' });
        }

        const ganador = partida.puntos1 >= partida.meta ? 'equipo1' : 'equipo2';

        // Crear partida en historial
        const [nuevaPartida] = await sql`
            INSERT INTO partidas (tipo, puntos1, puntos2, ganador, meta)
            VALUES (${partida.tipo}, ${partida.puntos1}, ${partida.puntos2}, ${ganador}, ${partida.meta})
            RETURNING *
        `;

        // Asignar jugadores
        const e1 = partida.equipo1_jugadores;
        const e2 = partida.equipo2_jugadores;

        for (const jugadorId of e1) {
            await sql`
                INSERT INTO partida_jugadores (partida_id, jugador_id, equipo)
                VALUES (${nuevaPartida.id}, ${parseInt(jugadorId)}, 'equipo1')
            `;
        }
        for (const jugadorId of e2) {
            await sql`
                INSERT INTO partida_jugadores (partida_id, jugador_id, equipo)
                VALUES (${nuevaPartida.id}, ${parseInt(jugadorId)}, 'equipo2')
            `;
        }

        // Guardar rondas
        for (let i = 0; i < partida.rondas.length; i++) {
            const ronda = partida.rondas[i];
            await sql`
                INSERT INTO rondas (partida_id, numero, puntos1, puntos2)
                VALUES (${nuevaPartida.id}, ${i + 1}, ${ronda.pts1}, ${ronda.pts2})
            `;
        }

        // Marcar como inactiva
        await sql`UPDATE partidas_vivo SET activa = FALSE WHERE id = ${req.params.id}`;

        res.json({ message: 'Partida guardada en historial', partida: nuevaPartida });
    } catch (err) {
        next(err);
    }
});

// POST /api/vivo/:id/cancelar - Cancelar partida
router.post('/:id/cancelar', async (req, res, next) => {
    try {
        await sql`UPDATE partidas_vivo SET activa = FALSE WHERE id = ${req.params.id}`;
        res.json({ message: 'Partida cancelada' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
