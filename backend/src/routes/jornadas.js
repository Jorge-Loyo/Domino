const { Router } = require('express');
const { fechaJornada, jornadaCerrada, jornadaActual, calcularStatsJornada, agruparPorJornada } = require('../jornada');
const { obtenerPartidasConJugadores } = require('../partidas-helper');

const router = Router();

// GET /api/jornadas - Lista de todas las jornadas con su campeón
router.get('/', async (req, res, next) => {
    try {
        const partidas = await obtenerPartidasConJugadores();
        const porJornada = agruparPorJornada(partidas);

        const jornadas = Object.entries(porJornada).map(([fecha, parts]) => {
            const stats = calcularStatsJornada(parts);
            return {
                fecha,
                cerrada: jornadaCerrada(fecha),
                total_partidas: parts.length,
                campeon_individual: stats.campeonIndividual,
                campeon_parejas: stats.campeonParejas
            };
        });

        // Más recientes primero
        jornadas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

        res.json({ jornada_actual: jornadaActual(), jornadas });
    } catch (err) {
        next(err);
    }
});

// GET /api/jornadas/:fecha - Detalle de una jornada (rankings completos)
router.get('/:fecha', async (req, res, next) => {
    try {
        const fechaObjetivo = req.params.fecha;
        const partidas = await obtenerPartidasConJugadores();
        const deLaJornada = partidas.filter(p => fechaJornada(p.created_at) === fechaObjetivo);

        if (deLaJornada.length === 0) {
            return res.status(404).json({ error: 'No hay partidas en esa jornada' });
        }

        const stats = calcularStatsJornada(deLaJornada);

        res.json({
            fecha: fechaObjetivo,
            cerrada: jornadaCerrada(fechaObjetivo),
            total_partidas: deLaJornada.length,
            campeon_individual: stats.campeonIndividual,
            campeon_parejas: stats.campeonParejas,
            ranking_jugadores: stats.rankingJugadores,
            ranking_parejas: stats.rankingParejas
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
