const { Router } = require('express');
const { sql } = require('../db');
const { jornadaCerrada, calcularStatsJornada, agruparPorJornada } = require('../jornada');
const { obtenerPartidasConJugadores } = require('../partidas-helper');

const router = Router();

/**
 * Cuenta jornadas ganadas (solo jornadas ya cerradas / oficiales).
 * Devuelve:
 *   individual: Map jugadorId -> nº jornadas ganadas
 *   parejas: Map 'idA-idB' (ordenado) -> nº jornadas ganadas
 */
async function contarJornadasGanadas() {
    const partidas = await obtenerPartidasConJugadores();
    const porJornada = agruparPorJornada(partidas);

    const individual = {};
    const parejas = {};

    Object.entries(porJornada).forEach(([fecha, parts]) => {
        // Solo cuentan las jornadas oficiales (cerradas después de las 6am)
        if (!jornadaCerrada(fecha)) return;

        const stats = calcularStatsJornada(parts);

        if (stats.campeonIndividual) {
            const id = stats.campeonIndividual.id;
            individual[id] = (individual[id] || 0) + 1;
        }
        if (stats.campeonParejas) {
            const key = stats.campeonParejas.key;
            parejas[key] = (parejas[key] || 0) + 1;
        }
    });

    return { individual, parejas };
}

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
                COALESCE(SUM(CASE WHEN pj.equipo = 'equipo1' THEN p.puntos2 ELSE p.puntos1 END), 0) AS puntos_contra,
                COUNT(CASE WHEN
                    (pj.equipo = 'equipo1' AND p.ganador = 'equipo1' AND p.puntos2 = 0) OR
                    (pj.equipo = 'equipo2' AND p.ganador = 'equipo2' AND p.puntos1 = 0)
                THEN 1 END) AS zapateros_dados,
                COUNT(CASE WHEN
                    (pj.equipo = 'equipo1' AND p.ganador = 'equipo2' AND p.puntos1 = 0) OR
                    (pj.equipo = 'equipo2' AND p.ganador = 'equipo1' AND p.puntos2 = 0)
                THEN 1 END) AS zapateros_recibidos
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

        const { individual: jornadasInd } = await contarJornadasGanadas();

        const resultado = ranking.map(r => ({
            ...r,
            total_partidas: parseInt(r.total_partidas),
            ganadas: parseInt(r.ganadas),
            perdidas: parseInt(r.perdidas),
            puntos_favor: parseInt(r.puntos_favor),
            puntos_contra: parseInt(r.puntos_contra),
            zapateros_dados: parseInt(r.zapateros_dados),
            zapateros_recibidos: parseInt(r.zapateros_recibidos),
            jornadas_ganadas: jornadasInd[r.id] || 0,
            porcentaje_victoria: parseInt(r.total_partidas) > 0
                ? Math.round((parseInt(r.ganadas) / parseInt(r.total_partidas)) * 100)
                : 0
        }));

        // Reordenar: jornadas ganadas primero, luego los criterios previos
        resultado.sort((a, b) => {
            if (b.jornadas_ganadas !== a.jornadas_ganadas) return b.jornadas_ganadas - a.jornadas_ganadas;
            if (b.porcentaje_victoria !== a.porcentaje_victoria) return b.porcentaje_victoria - a.porcentaje_victoria;
            if (b.ganadas !== a.ganadas) return b.ganadas - a.ganadas;
            return b.puntos_favor - a.puntos_favor;
        });

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

        const { parejas: jornadasPar } = await contarJornadasGanadas();

        // Calcular stats por pareja
        const parejas = {};
        Object.values(partidasMap).forEach(p => {
            // Orden numérico para que la key coincida con la del cálculo de jornadas
            const key1 = p.equipo1.map(j => j.id).sort((a, b) => a - b).join('-');
            const key2 = p.equipo2.map(j => j.id).sort((a, b) => a - b).join('-');

            if (!parejas[key1]) {
                parejas[key1] = {
                    key: key1,
                    jugadores: p.equipo1.map(j => j.nombre),
                    ganadas: 0, perdidas: 0, puntos_favor: 0, puntos_contra: 0,
                    zapateros_dados: 0, zapateros_recibidos: 0
                };
            }
            if (!parejas[key2]) {
                parejas[key2] = {
                    key: key2,
                    jugadores: p.equipo2.map(j => j.nombre),
                    ganadas: 0, perdidas: 0, puntos_favor: 0, puntos_contra: 0,
                    zapateros_dados: 0, zapateros_recibidos: 0
                };
            }

            parejas[key1].puntos_favor += p.puntos1;
            parejas[key1].puntos_contra += p.puntos2;
            parejas[key2].puntos_favor += p.puntos2;
            parejas[key2].puntos_contra += p.puntos1;

            const esZapatero = p.puntos1 === 0 || p.puntos2 === 0;

            if (p.ganador === 'equipo1') {
                parejas[key1].ganadas++;
                parejas[key2].perdidas++;
                if (esZapatero && p.puntos2 === 0) {
                    parejas[key1].zapateros_dados++;
                    parejas[key2].zapateros_recibidos++;
                }
            } else {
                parejas[key2].ganadas++;
                parejas[key1].perdidas++;
                if (esZapatero && p.puntos1 === 0) {
                    parejas[key2].zapateros_dados++;
                    parejas[key1].zapateros_recibidos++;
                }
            }
        });

        // Formatear y ordenar
        const resultado = Object.values(parejas).map(p => {
            const total = p.ganadas + p.perdidas;
            return {
                ...p,
                total_partidas: total,
                jornadas_ganadas: jornadasPar[p.key] || 0,
                porcentaje_victoria: total > 0 ? Math.round((p.ganadas / total) * 100) : 0
            };
        });

        resultado.sort((a, b) => {
            if (b.jornadas_ganadas !== a.jornadas_ganadas) return b.jornadas_ganadas - a.jornadas_ganadas;
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
