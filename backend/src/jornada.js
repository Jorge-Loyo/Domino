/**
 * Utilidades de Jornada
 *
 * Una "jornada" es una sesión de juego de un día. Como las partidas suelen
 * extenderse pasada la medianoche (e incluso hasta la mañana siguiente),
 * usamos una hora de corte: todo lo jugado antes de esa hora cuenta para la
 * jornada del día anterior.
 *
 * IMPORTANTE: los timestamps se guardan en UTC en la base de datos, pero el
 * juego ocurre en horario de Argentina (GMT-3). Por eso convertimos a hora
 * local de Argentina ANTES de aplicar el corte, sin depender de la zona
 * horaria del servidor (Render corre en UTC).
 *
 * Regla: fecha_jornada = (created_at en GMT-3 - HORA_CORTE horas)::date
 */

const HORA_CORTE = 10;       // 10 AM (cubre sesiones que se alargan hasta la mañana)
const OFFSET_HORAS = -3;     // Argentina GMT-3

// Fragmento SQL equivalente (por si se necesitara en una query):
// pasar a hora Argentina (-3h) y luego restar el corte
const JORNADA_SQL = `((created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires') - INTERVAL '${HORA_CORTE} hours')::date`;

/**
 * Dado un timestamp UTC (Date o ISO), devuelve la fecha de jornada (YYYY-MM-DD).
 * Convierte a hora de Argentina y aplica el corte, todo con aritmética de UTC
 * para que sea independiente de la zona horaria del servidor.
 */
function fechaJornada(timestamp) {
    const d = new Date(timestamp);
    // Desplazar el instante: a hora de Argentina y luego restar la hora de corte.
    // (OFFSET_HORAS es negativo, así que sumarlo mueve hacia atrás)
    const ajustado = new Date(d.getTime() + (OFFSET_HORAS - HORA_CORTE) * 3600 * 1000);
    // Tomar la fecha en UTC del instante ajustado (evita usar getHours locales)
    const y = ajustado.getUTCFullYear();
    const m = String(ajustado.getUTCMonth() + 1).padStart(2, '0');
    const day = String(ajustado.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Devuelve true si la jornada de la fecha dada ya cerró (ya pasó la hora de
 * corte del día siguiente, en hora de Argentina).
 */
function jornadaCerrada(fechaJornadaStr) {
    // La jornada del día X cierra a las HORA_CORTE del día X+1 (hora Argentina).
    // Convertimos ese momento de cierre a UTC para comparar con "ahora".
    const [y, m, day] = fechaJornadaStr.split('-').map(Number);
    // Cierre en hora Argentina = (X+1) a las HORA_CORTE
    // En UTC = ese momento - OFFSET_HORAS (o sea + 3h)
    const cierreUTC = Date.UTC(y, m - 1, day + 1, HORA_CORTE - OFFSET_HORAS, 0, 0);
    return Date.now() >= cierreUTC;
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
