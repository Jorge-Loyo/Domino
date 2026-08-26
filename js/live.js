/**
 * Módulo de Partida En Vivo
 */
const DominoLive = (() => {
    let partidaActual = null;

    const STORAGE_KEY = 'domino_partida_vivo';

    // Recuperar partida en curso (por si se cierra la app)
    function recuperarPartida() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            partidaActual = JSON.parse(saved);
            mostrarMarcador();
        }
    }

    function guardarEstado() {
        if (partidaActual) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(partidaActual));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    // --- Iniciar partida individual ---
    function iniciarIndividual(j1Id, j2Id, meta) {
        const j1 = DominoData.obtenerJugadorPorId(j1Id);
        const j2 = DominoData.obtenerJugadorPorId(j2Id);

        partidaActual = {
            tipo: 'individual',
            meta: parseInt(meta),
            equipo1: { jugadores: [j1Id], nombre: j1.nombre },
            equipo2: { jugadores: [j2Id], nombre: j2.nombre },
            puntos1: 0,
            puntos2: 0,
            rondas: [],
            inicio: new Date().toISOString()
        };

        guardarEstado();
        mostrarMarcador();
    }

    // --- Iniciar partida parejas ---
    function iniciarParejas(e1j1Id, e1j2Id, e2j1Id, e2j2Id, meta) {
        const e1j1 = DominoData.obtenerJugadorPorId(e1j1Id);
        const e1j2 = DominoData.obtenerJugadorPorId(e1j2Id);
        const e2j1 = DominoData.obtenerJugadorPorId(e2j1Id);
        const e2j2 = DominoData.obtenerJugadorPorId(e2j2Id);

        partidaActual = {
            tipo: 'parejas',
            meta: parseInt(meta),
            equipo1: { jugadores: [e1j1Id, e1j2Id], nombre: `${e1j1.nombre} & ${e1j2.nombre}` },
            equipo2: { jugadores: [e2j1Id, e2j2Id], nombre: `${e2j1.nombre} & ${e2j2.nombre}` },
            puntos1: 0,
            puntos2: 0,
            rondas: [],
            inicio: new Date().toISOString()
        };

        guardarEstado();
        mostrarMarcador();
    }

    // --- Mostrar marcador ---
    function mostrarMarcador() {
        document.getElementById('live-setup').style.display = 'none';
        document.getElementById('live-scoreboard').style.display = 'block';
        document.getElementById('live-finished').style.display = 'none';

        document.getElementById('live-meta-display').textContent = partidaActual.meta;
        document.getElementById('team1-name').textContent = partidaActual.equipo1.nombre;
        document.getElementById('team2-name').textContent = partidaActual.equipo2.nombre;
        document.getElementById('round-label1').textContent = partidaActual.equipo1.nombre;
        document.getElementById('round-label2').textContent = partidaActual.equipo2.nombre;

        actualizarMarcador();
        renderizarRondas();
    }

    // --- Actualizar marcador visual ---
    function actualizarMarcador() {
        const score1 = document.getElementById('team1-score');
        const score2 = document.getElementById('team2-score');
        const progress1 = document.getElementById('team1-progress');
        const progress2 = document.getElementById('team2-progress');
        const team1El = document.getElementById('score-team1');
        const team2El = document.getElementById('score-team2');

        score1.textContent = partidaActual.puntos1;
        score2.textContent = partidaActual.puntos2;

        const pct1 = Math.min(100, (partidaActual.puntos1 / partidaActual.meta) * 100);
        const pct2 = Math.min(100, (partidaActual.puntos2 / partidaActual.meta) * 100);
        progress1.style.width = pct1 + '%';
        progress2.style.width = pct2 + '%';

        // Marcar quién va ganando
        team1El.classList.toggle('winning', partidaActual.puntos1 > partidaActual.puntos2);
        team2El.classList.toggle('winning', partidaActual.puntos2 > partidaActual.puntos1);
    }

    // --- Sumar ronda ---
    function sumarRonda() {
        const pts1 = parseInt(document.getElementById('round-pts1').value) || 0;
        const pts2 = parseInt(document.getElementById('round-pts2').value) || 0;

        if (pts1 === 0 && pts2 === 0) {
            DominoUI.mostrarNotificacion('Agrega puntos a al menos un equipo', 'warning');
            return;
        }

        partidaActual.rondas.push({ pts1, pts2 });
        partidaActual.puntos1 += pts1;
        partidaActual.puntos2 += pts2;

        // Resetear inputs
        document.getElementById('round-pts1').value = '0';
        document.getElementById('round-pts2').value = '0';

        guardarEstado();
        actualizarMarcador();
        renderizarRondas();

        // Verificar si alguien ganó
        if (partidaActual.puntos1 >= partidaActual.meta || partidaActual.puntos2 >= partidaActual.meta) {
            finalizarPartida();
        }
    }

    // --- Deshacer última ronda ---
    function deshacerRonda(index) {
        const ronda = partidaActual.rondas[index];
        partidaActual.puntos1 -= ronda.pts1;
        partidaActual.puntos2 -= ronda.pts2;
        partidaActual.rondas.splice(index, 1);

        guardarEstado();
        actualizarMarcador();
        renderizarRondas();
    }

    // --- Renderizar historial de rondas ---
    function renderizarRondas() {
        const container = document.getElementById('rounds-list');

        if (partidaActual.rondas.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#757575; padding:1rem;">Sin rondas todavía</p>';
            return;
        }

        let acum1 = 0;
        let acum2 = 0;

        container.innerHTML = partidaActual.rondas.map((r, i) => {
            acum1 += r.pts1;
            acum2 += r.pts2;
            return `
                <div class="round-item">
                    <span class="round-num">Ronda ${i + 1}</span>
                    <span class="round-scores">+${r.pts1} / +${r.pts2} (${acum1} - ${acum2})</span>
                    <button class="btn-undo" onclick="DominoApp.deshacerRonda(${i})" title="Deshacer">↩</button>
                </div>
            `;
        }).join('');
    }

    // --- Finalizar partida ---
    function finalizarPartida() {
        document.getElementById('live-scoreboard').style.display = 'none';
        document.getElementById('live-finished').style.display = 'block';

        const ganador = partidaActual.puntos1 >= partidaActual.meta
            ? partidaActual.equipo1.nombre
            : partidaActual.equipo2.nombre;

        document.getElementById('winner-name').textContent = `¡${ganador} gana!`;
        document.getElementById('winner-score').textContent = `${partidaActual.puntos1} - ${partidaActual.puntos2}`;
    }

    // --- Guardar partida en historial ---
    function guardarEnHistorial() {
        const ganador = partidaActual.puntos1 >= partidaActual.meta ? 'equipo1' : 'equipo2';

        if (partidaActual.tipo === 'individual') {
            DominoData.registrarPartidaIndividual({
                jugador1Id: partidaActual.equipo1.jugadores[0],
                jugador2Id: partidaActual.equipo2.jugadores[0],
                puntos1: partidaActual.puntos1,
                puntos2: partidaActual.puntos2,
                ganadorId: ganador === 'equipo1'
                    ? partidaActual.equipo1.jugadores[0]
                    : partidaActual.equipo2.jugadores[0]
            });
        } else {
            DominoData.registrarPartidaParejas({
                equipo1: partidaActual.equipo1.jugadores,
                equipo2: partidaActual.equipo2.jugadores,
                puntos1: partidaActual.puntos1,
                puntos2: partidaActual.puntos2,
                ganador: ganador
            });
        }

        DominoUI.mostrarNotificacion('Partida guardada en el historial');
        resetear();
    }

    // --- Cancelar partida ---
    function cancelar() {
        if (confirm('¿Cancelar la partida en curso? Se perderá el progreso.')) {
            resetear();
        }
    }

    // --- Nueva partida (después de terminar) ---
    function nueva() {
        resetear();
    }

    // --- Resetear ---
    function resetear() {
        partidaActual = null;
        guardarEstado();
        document.getElementById('live-setup').style.display = 'block';
        document.getElementById('live-scoreboard').style.display = 'none';
        document.getElementById('live-finished').style.display = 'none';
    }

    // --- Hay partida activa? ---
    function hayPartidaActiva() {
        return partidaActual !== null;
    }

    return {
        recuperarPartida,
        iniciarIndividual,
        iniciarParejas,
        sumarRonda,
        deshacerRonda,
        guardarEnHistorial,
        cancelar,
        nueva,
        hayPartidaActiva
    };
})();
