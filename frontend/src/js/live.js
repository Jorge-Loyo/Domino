/**
 * Módulo Partida En Vivo
 */
const Live = (() => {
    let partidaActual = null;

    async function recuperarPartida() {
        try {
            const partida = await API.obtenerPartidaVivo();
            if (partida) {
                partidaActual = partida;
                mostrarMarcador();
                // Verificar si ya terminó
                if (partida.puntos1 >= partida.meta || partida.puntos2 >= partida.meta) {
                    mostrarGanador();
                }
            }
        } catch (err) {
            // Sin partida activa, OK
        }
    }

    async function iniciarIndividual(j1Id, j2Id, j1Nombre, j2Nombre, meta) {
        try {
            partidaActual = await API.iniciarPartidaVivo({
                tipo: 'individual',
                meta: parseInt(meta),
                equipo1_jugadores: [j1Id],
                equipo2_jugadores: [j2Id],
                equipo1_nombre: j1Nombre,
                equipo2_nombre: j2Nombre
            });
            mostrarMarcador();
        } catch (err) {
            UI.mostrarNotificacion(err.message, 'error');
        }
    }

    async function iniciarParejas(e1j1Id, e1j2Id, e2j1Id, e2j2Id, e1Nombre, e2Nombre, meta) {
        try {
            partidaActual = await API.iniciarPartidaVivo({
                tipo: 'parejas',
                meta: parseInt(meta),
                equipo1_jugadores: [e1j1Id, e1j2Id],
                equipo2_jugadores: [e2j1Id, e2j2Id],
                equipo1_nombre: e1Nombre,
                equipo2_nombre: e2Nombre
            });
            mostrarMarcador();
        } catch (err) {
            UI.mostrarNotificacion(err.message, 'error');
        }
    }

    function mostrarMarcador() {
        document.getElementById('live-setup').style.display = 'none';
        document.getElementById('live-scoreboard').style.display = 'block';
        document.getElementById('live-finished').style.display = 'none';

        document.getElementById('live-meta-display').textContent = partidaActual.meta;
        document.getElementById('team1-name').textContent = partidaActual.equipo1_nombre;
        document.getElementById('team2-name').textContent = partidaActual.equipo2_nombre;
        document.getElementById('round-label1').textContent = partidaActual.equipo1_nombre;
        document.getElementById('round-label2').textContent = partidaActual.equipo2_nombre;

        actualizarMarcador();
        renderizarRondas();
    }

    function actualizarMarcador() {
        document.getElementById('team1-score').textContent = partidaActual.puntos1;
        document.getElementById('team2-score').textContent = partidaActual.puntos2;

        const pct1 = Math.min(100, (partidaActual.puntos1 / partidaActual.meta) * 100);
        const pct2 = Math.min(100, (partidaActual.puntos2 / partidaActual.meta) * 100);
        document.getElementById('team1-progress').style.width = pct1 + '%';
        document.getElementById('team2-progress').style.width = pct2 + '%';

        document.getElementById('score-team1').classList.toggle('winning', partidaActual.puntos1 > partidaActual.puntos2);
        document.getElementById('score-team2').classList.toggle('winning', partidaActual.puntos2 > partidaActual.puntos1);
    }

    async function sumarRonda() {
        const pts1 = parseInt(document.getElementById('round-pts1').value) || 0;
        const pts2 = parseInt(document.getElementById('round-pts2').value) || 0;

        if (pts1 === 0 && pts2 === 0) {
            UI.mostrarNotificacion('Agrega puntos a al menos un equipo', 'warning');
            return;
        }

        try {
            partidaActual = await API.sumarRondaVivo(partidaActual.id, pts1, pts2);
            document.getElementById('round-pts1').value = '0';
            document.getElementById('round-pts2').value = '0';
            actualizarMarcador();
            renderizarRondas();

            if (partidaActual.puntos1 >= partidaActual.meta || partidaActual.puntos2 >= partidaActual.meta) {
                mostrarGanador();
            }
        } catch (err) {
            UI.mostrarNotificacion(err.message, 'error');
        }
    }

    async function deshacerRonda(index) {
        try {
            partidaActual = await API.deshacerRondaVivo(partidaActual.id, index);
            actualizarMarcador();
            renderizarRondas();
        } catch (err) {
            UI.mostrarNotificacion(err.message, 'error');
        }
    }

    function renderizarRondas() {
        const container = document.getElementById('rounds-list');
        const rondas = partidaActual.rondas || [];

        if (rondas.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#757575; padding:1rem;">Sin rondas todavía</p>';
            return;
        }

        let acum1 = 0, acum2 = 0;
        container.innerHTML = rondas.map((r, i) => {
            acum1 += r.pts1;
            acum2 += r.pts2;
            return `
                <div class="round-item">
                    <span class="round-num">Ronda ${i + 1}</span>
                    <span class="round-scores">+${r.pts1} / +${r.pts2} (${acum1} - ${acum2})</span>
                    <button class="btn-undo" data-undo-ronda="${i}" title="Deshacer">↩</button>
                </div>
            `;
        }).join('');
    }

    function mostrarGanador() {
        document.getElementById('live-scoreboard').style.display = 'none';
        document.getElementById('live-finished').style.display = 'block';

        const ganador = partidaActual.puntos1 >= partidaActual.meta
            ? partidaActual.equipo1_nombre
            : partidaActual.equipo2_nombre;

        document.getElementById('winner-name').textContent = `¡${ganador} gana!`;
        document.getElementById('winner-score').textContent = `${partidaActual.puntos1} - ${partidaActual.puntos2}`;
    }

    async function guardarEnHistorial() {
        try {
            await API.finalizarPartidaVivo(partidaActual.id);
            UI.mostrarNotificacion('Partida guardada en el historial');
            resetear();
        } catch (err) {
            UI.mostrarNotificacion(err.message, 'error');
        }
    }

    async function cancelar() {
        if (!confirm('¿Cancelar la partida en curso?')) return;
        try {
            await API.cancelarPartidaVivo(partidaActual.id);
            UI.mostrarNotificacion('Partida cancelada');
            resetear();
        } catch (err) {
            UI.mostrarNotificacion(err.message, 'error');
        }
    }

    function nueva() {
        resetear();
    }

    function resetear() {
        partidaActual = null;
        document.getElementById('live-setup').style.display = 'block';
        document.getElementById('live-scoreboard').style.display = 'none';
        document.getElementById('live-finished').style.display = 'none';
    }

    function obtenerPartidaActual() {
        return partidaActual;
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
        obtenerPartidaActual
    };
})();
