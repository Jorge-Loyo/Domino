const { sql } = require('./db');

/**
 * Trae todas las partidas con sus jugadores y las devuelve normalizadas:
 * [{ id, tipo, puntos1, puntos2, ganador, created_at, equipo1:[{id,nombre}], equipo2:[...] }]
 */
async function obtenerPartidasConJugadores() {
    const filas = await sql`
        SELECT p.id, p.tipo, p.puntos1, p.puntos2, p.ganador, p.created_at,
               pj.jugador_id, pj.equipo, j.nombre
        FROM partidas p
        JOIN partida_jugadores pj ON pj.partida_id = p.id
        JOIN jugadores j ON j.id = pj.jugador_id
        ORDER BY p.created_at ASC, p.id ASC
    `;

    const map = {};
    filas.forEach(row => {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                tipo: row.tipo,
                puntos1: row.puntos1,
                puntos2: row.puntos2,
                ganador: row.ganador,
                created_at: row.created_at,
                equipo1: [],
                equipo2: []
            };
        }
        const jugador = { id: row.jugador_id, nombre: row.nombre };
        if (row.equipo === 'equipo1') map[row.id].equipo1.push(jugador);
        else map[row.id].equipo2.push(jugador);
    });

    return Object.values(map);
}

module.exports = { obtenerPartidasConJugadores };
