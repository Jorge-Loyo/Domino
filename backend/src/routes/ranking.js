const { Router } = require('express');
const { sql } = require('../db');

const router = Router();

// GET /api/ranking/individual - Ranking individual
router.get('/individual', async (req, res, next) => {
    try {
        const ranking = await sql`
            SELECT
                j.id,
                j.nombre,
                COUNT(pj.id) AS total_partidas,
                COUNT(CASE WHEN
                    (pj.equipo = 'equipo1' AND p.ganador = 'equipo1') OR
                    (pj.equipo = 'equipo2' AND p.ganador = 'equipo2')
                THEN 1 END) AS ganadas,
                COUNT(CASE WHEN
                    (pj.equipo = 'equipo1' AND p.ganador = 'equipo2') OR
                    (pj.equipo = 'equipo2' AND p.ganador = 'equipo1')
                THEN 1 END) AS perdidas,
                COALESCE(SUM(CASE WHEN pj.equipo = 'equipo1' THEN p.puntos1 ELSE p.puntos2 END), 0) AS puntos_favor,
                COALESCE(SUM(CASE WHEN pj.equipo = 'equipo1' THEN p.puntos2 ELSE p.puntos1 END), 0) AS puntos_contra
            FROM jugadores j
            LEFT JOIN partida_jugadores pj ON pj.jugador_id = j.id
            LEFT JOIN partidas p ON p.id = pj.partida_id
            GROUP BY j.id, j.nombre
            ORDER BY
                CASE WHEN COUNT(pj.id) > 0
                    THEN (COUNT(CASE WHEN
                        (pj.equipo = 'equipo1' AND p.ganador = 'equipo1') OR
                        (pj.equipo = 'equipo2' AND p.ganador = 'equipo2')
                    THEN 1 END)::FLOAT / COUNT(pj.id))
                    ELSE 0
                END DESC,
                COUNT(CASE WHEN
                    (pj.equipo = 'equipo1' AND p.ganador = 'equipo1') OR
                    (pj.equipo = 'equipo2' AND p.ganador = 'equipo2')
                THEN 1 END) DESC,
                COALESCE(SUM(CASE WHEN pj.equipo = 'equipo1' THEN p.puntos1 ELSE p.puntos2 END), 0) DESC
        `;

        const resultado = ranking.map(r => ({
            ...r,
            total_partidas: parseInt(r.total_partidas),
            ganadas: parseInt(r.ganadas),
            perdidas: parseInt(r.perdidas),
            puntos_favor: parseInt(r.puntos_favor),
            puntos_contra: parseInt(r.puntos_contra),
            porcentaje_victoria: parseInt(r.total_partidas) > 0
                ? Math.round((parseInt(r.ganadas) / parseInt(r.total_partidas)) * 100)
                : 0
        }));

        res.json(resultado);
    } catch (err) {
        next(err);
    }
});

// GET /api/ranking/parejas - Ranking por parejas
router.get('/parejas', async (req, res, next) => {
    try {
        // Obtener todas las partidas de parejas con sus jugadores
        const partidas = await sql`
            SELECT p.id, p.puntos1, p.puntos2, p.ganador,
                   pj.jugador_id, pj.equipo, j.nombre
            FROM partidas p
            JOIN partida_jugadores pj ON pj.partida_id = p.id
            JOIN jugadores j ON j.id = pj.jugador_id
            WHERE p.tipo = 'parejas'
            ORDER BY p.id
        `;

        // Agrupar por partida
        const partidasMap = {};
        partidas.forEach(row => {
            if (!partidasMap[row.id]) {
                partidasMap[row.id] = { ...row, equipo1: [], equipo2: [] };
            }
            if (row.equipo === 'equipo1') {
                partidasMap[row.id].equipo1.push({ id: row.jugador_id, nombre: row.nombre });
            } else {
                partidasMap[row.id].equipo2.push({ id: row.jugador_id, nombre: row.nombre });
            }
        });

        // Calcular stats por pareja
        const parejas = {};
        Object.values(partidasMap).forEach(p => {
            const key1 = p.equipo1.map(j => j.id).sort().join('-');
            const key2 = p.equipo2.map(j => j.id).sort().join('-');

            if (!parejas[key1]) {
                parejas[key1] = {
                    jugadores: p.equipo1.map(j => j.nombre),
                    ganadas: 0, perdidas: 0, puntos_favor: 0, puntos_contra: 0
                };
            }
            if (!parejas[key2]) {
                parejas[key2] = {
                    jugadores: p.equipo2.map(j => j.nombre),
                    ganadas: 0, perdidas: 0, puntos_favor: 0, puntos_contra: 0
                };
            }

            parejas[key1].puntos_favor += p.puntos1;
            parejas[key1].puntos_contra += p.puntos2;
            parejas[key2].puntos_favor += p.puntos2;
            parejas[key2].puntos_contra += p.puntos1;

            if (p.ganador === 'equipo1') {
                parejas[key1].ganadas++;
                parejas[key2].perdidas++;
            } else {
                parejas[key2].ganadas++;
                parejas[key1].perdidas++;
            }
        });

        // Formatear y ordenar
        const resultado = Object.values(parejas).map(p => {
            const total = p.ganadas + p.perdidas;
            return {
                ...p,
                total_partidas: total,
                porcentaje_victoria: total > 0 ? Math.round((p.ganadas / total) * 100) : 0
            };
        });

        resultado.sort((a, b) => {
            if (b.porcentaje_victoria !== a.porcentaje_victoria) return b.porcentaje_victoria - a.porcentaje_victoria;
            if (b.ganadas !== a.ganadas) return b.ganadas - a.ganadas;
            return b.puntos_favor - a.puntos_favor;
        });

        res.json(resultado);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
