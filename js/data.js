/**
 * Módulo de datos - Gestión de localStorage para la app de Domino
 */
const DominoData = (() => {
    const KEYS = {
        jugadores: 'domino_jugadores',
        partidas: 'domino_partidas'
    };

    // --- Utilidades ---
    function generarId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function guardar(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function cargar(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    // --- Jugadores ---
    function obtenerJugadores() {
        return cargar(KEYS.jugadores);
    }

    function agregarJugador(nombre) {
        const jugadores = obtenerJugadores();
        const existe = jugadores.find(j => j.nombre.toLowerCase() === nombre.toLowerCase());
        if (existe) return null;

        const jugador = {
            id: generarId(),
            nombre: nombre.trim(),
            fechaCreacion: new Date().toISOString()
        };
        jugadores.push(jugador);
        guardar(KEYS.jugadores, jugadores);
        return jugador;
    }

    function eliminarJugador(id) {
        let jugadores = obtenerJugadores();
        jugadores = jugadores.filter(j => j.id !== id);
        guardar(KEYS.jugadores, jugadores);
    }

    function obtenerJugadorPorId(id) {
        return obtenerJugadores().find(j => j.id === id) || null;
    }

    // --- Partidas ---
    function obtenerPartidas() {
        return cargar(KEYS.partidas);
    }

    /**
     * Registrar partida individual
     * @param {Object} datos - { jugador1Id, jugador2Id, puntos1, puntos2, ganadorId }
     */
    function registrarPartidaIndividual(datos) {
        const partidas = obtenerPartidas();
        const partida = {
            id: generarId(),
            tipo: 'individual',
            fecha: new Date().toISOString(),
            jugador1: datos.jugador1Id,
            jugador2: datos.jugador2Id,
            puntos1: parseInt(datos.puntos1),
            puntos2: parseInt(datos.puntos2),
            ganador: datos.ganadorId
        };
        partidas.push(partida);
        guardar(KEYS.partidas, partidas);
        return partida;
    }

    /**
     * Registrar partida en parejas
     * @param {Object} datos - { equipo1: [id, id], equipo2: [id, id], puntos1, puntos2, ganador: 'equipo1'|'equipo2' }
     */
    function registrarPartidaParejas(datos) {
        const partidas = obtenerPartidas();
        const partida = {
            id: generarId(),
            tipo: 'parejas',
            fecha: new Date().toISOString(),
            equipo1: datos.equipo1,
            equipo2: datos.equipo2,
            puntos1: parseInt(datos.puntos1),
            puntos2: parseInt(datos.puntos2),
            ganador: datos.ganador // 'equipo1' o 'equipo2'
        };
        partidas.push(partida);
        guardar(KEYS.partidas, partidas);
        return partida;
    }

    function eliminarPartida(id) {
        let partidas = obtenerPartidas();
        partidas = partidas.filter(p => p.id !== id);
        guardar(KEYS.partidas, partidas);
    }

    // --- Estadísticas Individuales ---
    function obtenerEstadisticasIndividual(jugadorId) {
        const partidas = obtenerPartidas();
        let ganadas = 0;
        let perdidas = 0;
        let puntosAFavor = 0;
        let puntosEnContra = 0;

        partidas.forEach(p => {
            if (p.tipo === 'individual') {
                if (p.jugador1 === jugadorId) {
                    puntosAFavor += p.puntos1;
                    puntosEnContra += p.puntos2;
                    if (p.ganador === jugadorId) ganadas++;
                    else perdidas++;
                } else if (p.jugador2 === jugadorId) {
                    puntosAFavor += p.puntos2;
                    puntosEnContra += p.puntos1;
                    if (p.ganador === jugadorId) ganadas++;
                    else perdidas++;
                }
            }
            if (p.tipo === 'parejas') {
                const enEquipo1 = p.equipo1.includes(jugadorId);
                const enEquipo2 = p.equipo2.includes(jugadorId);
                if (enEquipo1) {
                    puntosAFavor += p.puntos1;
                    puntosEnContra += p.puntos2;
                    if (p.ganador === 'equipo1') ganadas++;
                    else perdidas++;
                } else if (enEquipo2) {
                    puntosAFavor += p.puntos2;
                    puntosEnContra += p.puntos1;
                    if (p.ganador === 'equipo2') ganadas++;
                    else perdidas++;
                }
            }
        });

        const totalPartidas = ganadas + perdidas;
        return {
            totalPartidas,
            ganadas,
            perdidas,
            porcentajeVictoria: totalPartidas > 0 ? Math.round((ganadas / totalPartidas) * 100) : 0,
            puntosAFavor,
            puntosEnContra
        };
    }

    // --- Estadísticas por Parejas ---
    function obtenerEstadisticasParejas() {
        const partidas = obtenerPartidas().filter(p => p.tipo === 'parejas');
        const parejas = {};

        partidas.forEach(p => {
            // Normalizar equipo (ordenar ids para consistencia)
            const key1 = [...p.equipo1].sort().join('-');
            const key2 = [...p.equipo2].sort().join('-');

            if (!parejas[key1]) parejas[key1] = { jugadores: p.equipo1, ganadas: 0, perdidas: 0, puntosAFavor: 0, puntosEnContra: 0 };
            if (!parejas[key2]) parejas[key2] = { jugadores: p.equipo2, ganadas: 0, perdidas: 0, puntosAFavor: 0, puntosEnContra: 0 };

            parejas[key1].puntosAFavor += p.puntos1;
            parejas[key1].puntosEnContra += p.puntos2;
            parejas[key2].puntosAFavor += p.puntos2;
            parejas[key2].puntosEnContra += p.puntos1;

            if (p.ganador === 'equipo1') {
                parejas[key1].ganadas++;
                parejas[key2].perdidas++;
            } else {
                parejas[key2].ganadas++;
                parejas[key1].perdidas++;
            }
        });

        return Object.entries(parejas).map(([key, stats]) => {
            const total = stats.ganadas + stats.perdidas;
            return {
                key,
                jugadores: stats.jugadores,
                totalPartidas: total,
                ganadas: stats.ganadas,
                perdidas: stats.perdidas,
                porcentajeVictoria: total > 0 ? Math.round((stats.ganadas / total) * 100) : 0,
                puntosAFavor: stats.puntosAFavor,
                puntosEnContra: stats.puntosEnContra
            };
        });
    }

    // --- Historial filtrado ---
    function obtenerHistorial(filtroTipo, filtroJugadorId) {
        let partidas = obtenerPartidas();

        if (filtroTipo && filtroTipo !== 'todas') {
            partidas = partidas.filter(p => p.tipo === filtroTipo);
        }

        if (filtroJugadorId && filtroJugadorId !== 'todos') {
            partidas = partidas.filter(p => {
                if (p.tipo === 'individual') {
                    return p.jugador1 === filtroJugadorId || p.jugador2 === filtroJugadorId;
                }
                if (p.tipo === 'parejas') {
                    return p.equipo1.includes(filtroJugadorId) || p.equipo2.includes(filtroJugadorId);
                }
                return false;
            });
        }

        // Ordenar por fecha descendente
        partidas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        return partidas;
    }

    // --- Ranking Individual ---
    function obtenerRankingIndividual() {
        const jugadores = obtenerJugadores();
        const ranking = jugadores.map(j => {
            const stats = obtenerEstadisticasIndividual(j.id);
            return {
                ...j,
                ...stats
            };
        });

        // Ordenar por % victoria, luego por partidas ganadas
        ranking.sort((a, b) => {
            if (b.porcentajeVictoria !== a.porcentajeVictoria) {
                return b.porcentajeVictoria - a.porcentajeVictoria;
            }
            if (b.ganadas !== a.ganadas) {
                return b.ganadas - a.ganadas;
            }
            return b.puntosAFavor - a.puntosAFavor;
        });

        return ranking;
    }

    // --- Ranking Parejas ---
    function obtenerRankingParejas() {
        const stats = obtenerEstadisticasParejas();
        stats.sort((a, b) => {
            if (b.porcentajeVictoria !== a.porcentajeVictoria) {
                return b.porcentajeVictoria - a.porcentajeVictoria;
            }
            if (b.ganadas !== a.ganadas) {
                return b.ganadas - a.ganadas;
            }
            return b.puntosAFavor - a.puntosAFavor;
        });
        return stats;
    }

    return {
        obtenerJugadores,
        agregarJugador,
        eliminarJugador,
        obtenerJugadorPorId,
        obtenerPartidas,
        registrarPartidaIndividual,
        registrarPartidaParejas,
        eliminarPartida,
        obtenerEstadisticasIndividual,
        obtenerEstadisticasParejas,
        obtenerHistorial,
        obtenerRankingIndividual,
        obtenerRankingParejas
    };
})();
