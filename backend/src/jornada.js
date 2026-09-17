/**
 * Utilidades de Jornada
 *
 * Una "jornada" es una sesión de juego de un día, con corte a las 6 AM:
 * las partidas jugadas entre medianoche y las 6 AM cuentan para la jornada
 * del día anterior (porque suele ser continuación de la misma noche de juego).
 *
 * Regla: fecha_jornada = (created_at - 6 horas)::date
 */

const HORA_CORTE = 6; // 6 AM

/**
 * Fragmento SQL que calcula la fecha de jornada de una columna timestamp.
 * Uso: sql`... ${jornadaExpr('p.created_at')} ...` NO aplica (neon no interpola raw),
 * por eso lo dejamos como string para usar en template con sql.unsafe si hiciera falta.
 * En la práctica lo insertamos directo en las queries.
 */
const JORNADA_SQL = `(created_at - INTERVAL '${HORA_CORTE} hours')::date`;

/**
 * Dado un timestamp JS/ISO, devuelve la fecha de jornada (YYYY-MM-DD) en JS.
 * Útil para agrupar en el servidor cuando ya tenemos los datos en memoria.
 */
function fechaJornada(timestamp) {
    const d = new Date(timestamp);
    d.setHours(d.getHours() - HORA_CORTE);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Devuelve true si la jornada de la fecha dada ya cerró (ya pasaron las 6 AM
 * del día siguiente a esa jornada).
 */
function jornadaCerrada(fechaJornadaStr) {
    // La jornada del día X cierra a las 6 AM del día X+1
    const cierre = new Date(`${fechaJornadaStr}T00:00:00`);
    cierre.setDate(cierre.getDate() + 1);
    cierre.setHours(HORA_CORTE, 0, 0, 0);
    return new Date() >= cierre;
}

/**
 * La fecha de jornada actual (para saber cuál está en curso).
 */
function jornadaActual() {
    return fechaJornada(new Date());
}

/**
 * Calcula, para un conjunto de partidas de UNA jornada, el ranking de
 * jugadores y de parejas (victorias, con desempate por diferencia de puntos).
 * Cada partida debe tener: tipo, puntos1, puntos2, ganador, equipo1[], equipo2[]
 * donde equipoN es un array de { id, nombre }.
 */
function calcularStatsJornada(partidas) {
    const jugadores = {};
    const parejas = {};

    const addJugador = (id, nombre) => {
        if (!jugadores[id]) jugadores[id] = { id, nombre, ganadas: 0, difPuntos: 0 };
        return jugadores[id];
    };
    const addPareja = (ids, nombres) => {
        const key = [...ids].sort((a, b) => a - b).join('-');
        if (!parejas[key]) parejas[key] = { key, jugadores: nombres, jugadorIds: ids, ganadas: 0, difPuntos: 0 };
        return parejas[key];
    };

    partidas.forEach(p => {
        const gana1 = p.ganador === 'equipo1';
        const dif1 = p.puntos1 - p.puntos2;
        const dif2 = p.puntos2 - p.puntos1;

        p.equipo1.forEach(j => {
            const stat = addJugador(j.id, j.nombre);
            stat.difPuntos += dif1;
            if (gana1) stat.ganadas++;
        });
        p.equipo2.forEach(j => {
            const stat = addJugador(j.id, j.nombre);
            stat.difPuntos += dif2;
            if (!gana1) stat.ganadas++;
        });

        if (p.tipo === 'parejas') {
            const e1 = addPareja(p.equipo1.map(j => j.id), p.equipo1.map(j => j.nombre));
            const e2 = addPareja(p.equipo2.map(j => j.id), p.equipo2.map(j => j.nombre));
            e1.difPuntos += dif1;
            e2.difPuntos += dif2;
            if (gana1) e1.ganadas++;
            else e2.ganadas++;
        }
    });

    const ordenar = (arr) => arr.sort((a, b) => {
        if (b.ganadas !== a.ganadas) return b.ganadas - a.ganadas;
        return b.difPuntos - a.difPuntos;
    });

    const rankJugadores = ordenar(Object.values(jugadores));
    const rankParejas = ordenar(Object.values(parejas));

    return {
        campeonIndividual: rankJugadores[0] || null,
        campeonParejas: rankParejas[0] || null,
        rankingJugadores: rankJugadores,
        rankingParejas: rankParejas
    };
}

/**
 * Agrupa un arreglo de partidas (normalizadas) por fecha de jornada.
 * Devuelve un objeto { 'YYYY-MM-DD': [partidas...] }
 */
function agruparPorJornada(partidas) {
    const porJornada = {};
    partidas.forEach(p => {
        const fecha = fechaJornada(p.created_at);
        if (!porJornada[fecha]) porJornada[fecha] = [];
        porJornada[fecha].push(p);
    });
    return porJornada;
}

module.exports = {
    HORA_CORTE,
    JORNADA_SQL,
    fechaJornada,
    jornadaCerrada,
    jornadaActual,
    calcularStatsJornada,
    agruparPorJornada
};
