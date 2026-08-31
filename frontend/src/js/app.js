/**
 * App principal - Búfalos Mojados
 */
const App = (() => {
    let jugadores = [];

    async function init() {
        setupNavegacion();
        setupTabs();
        setupEventos();
        await cargarDatos();
        await Live.recuperarPartida();
    }

    async function cargarDatos() {
        try {
            jugadores = await API.obtenerJugadores();
            UI.poblarSelects(jugadores);

            const ranking = await API.obtenerRankingIndividual();
            UI.renderizarJugadores(jugadores, ranking);
            UI.renderizarRankingIndividual(ranking);

            const rankingParejas = await API.obtenerRankingParejas();
            UI.renderizarRankingParejas(rankingParejas);

            await cargarHistorial();
        } catch (err) {
            UI.mostrarNotificacion('Error al cargar datos: ' + err.message, 'error');
        }
    }

    async function cargarHistorial() {
        const tipo = document.getElementById('filtro-tipo').value;
        const jugadorId = document.getElementById('filtro-jugador').value;
        try {
            const partidas = await API.obtenerPartidas({ tipo, jugador_id: jugadorId });
            UI.renderizarHistorial(partidas);
        } catch (err) {
            UI.mostrarNotificacion('Error al cargar historial', 'error');
        }
    }

    // --- Navegación ---
    function setupNavegacion() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.section).classList.add('active');
                cargarDatos();
            });
        });
    }

    // --- Tabs ---
    function setupTabs() {
        document.querySelectorAll('.tabs').forEach(tabGroup => {
            tabGroup.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const parent = btn.closest('section');
                    tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const tab = btn.dataset.tab;

                    if (parent.id === 'nueva-partida') {
                        document.getElementById('form-partida-individual').style.display = tab === 'individual' ? 'block' : 'none';
                        document.getElementById('form-partida-parejas').style.display = tab === 'parejas' ? 'block' : 'none';
                    }
                    if (parent.id === 'ranking') {
                        document.getElementById('ranking-individual').style.display = tab === 'ranking-individual' ? 'block' : 'none';
                        document.getElementById('ranking-parejas').style.display = tab === 'ranking-parejas' ? 'block' : 'none';
                    }
                    if (parent.id === 'en-vivo') {
                        document.getElementById('form-live-individual').style.display = tab === 'live-individual' ? 'block' : 'none';
                        document.getElementById('form-live-parejas').style.display = tab === 'live-parejas' ? 'block' : 'none';
                    }
                });
            });
        });
    }

    // --- Eventos ---
    function setupEventos() {
        // Agregar jugador
        document.getElementById('form-jugador').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('nombre-jugador');
            const nombre = input.value.trim();
            if (!nombre) return;

            try {
                await API.agregarJugador(nombre);
                UI.mostrarNotificacion(`"${nombre}" agregado`);
                input.value = '';
                await cargarDatos();
            } catch (err) {
                UI.mostrarNotificacion(err.message, 'error');
            }
        });

        // Eliminar jugador (delegación)
        document.getElementById('lista-jugadores').addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-delete-jugador]');
            if (!btn) return;
            if (!confirm('¿Eliminar este jugador?')) return;
            try {
                await API.eliminarJugador(btn.dataset.deleteJugador);
                UI.mostrarNotificacion('Jugador eliminado');
                await cargarDatos();
            } catch (err) {
                UI.mostrarNotificacion(err.message, 'error');
            }
        });

        // Ganador select
        document.getElementById('ind-jugador1').addEventListener('change', UI.actualizarSelectGanador);
        document.getElementById('ind-jugador2').addEventListener('change', UI.actualizarSelectGanador);

        // Partida individual
        document.getElementById('form-partida-individual').addEventListener('submit', async (e) => {
            e.preventDefault();
            const j1 = document.getElementById('ind-jugador1').value;
            const j2 = document.getElementById('ind-jugador2').value;
            const p1 = document.getElementById('ind-puntos1').value;
            const p2 = document.getElementById('ind-puntos2').value;
            const ganador = document.getElementById('ind-ganador').value;

            if (!j1 || !j2 || !p1 || !p2 || !ganador) {
                UI.mostrarNotificacion('Completa todos los campos', 'error'); return;
            }
            if (j1 === j2) {
                UI.mostrarNotificacion('Selecciona jugadores diferentes', 'error'); return;
            }

            try {
                await API.registrarPartidaIndividual({
                    jugador1_id: parseInt(j1), jugador2_id: parseInt(j2),
                    puntos1: parseInt(p1), puntos2: parseInt(p2), ganador_id: parseInt(ganador)
                });
                UI.mostrarNotificacion('Partida registrada');
                e.target.reset();
                await cargarDatos();
            } catch (err) {
                UI.mostrarNotificacion(err.message, 'error');
            }
        });

        // Partida parejas
        document.getElementById('form-partida-parejas').addEventListener('submit', async (e) => {
            e.preventDefault();
            const e1j1 = document.getElementById('par-equipo1-j1').value;
            const e1j2 = document.getElementById('par-equipo1-j2').value;
            const e2j1 = document.getElementById('par-equipo2-j1').value;
            const e2j2 = document.getElementById('par-equipo2-j2').value;
            const p1 = document.getElementById('par-puntos1').value;
            const p2 = document.getElementById('par-puntos2').value;
            const ganador = document.getElementById('par-ganador').value;

            if (!e1j1 || !e1j2 || !e2j1 || !e2j2 || !p1 || !p2 || !ganador) {
                UI.mostrarNotificacion('Completa todos los campos', 'error'); return;
            }
            if (new Set([e1j1, e1j2, e2j1, e2j2]).size !== 4) {
                UI.mostrarNotificacion('Cada jugador debe ser diferente', 'error'); return;
            }

            try {
                await API.registrarPartidaParejas({
                    equipo1: [parseInt(e1j1), parseInt(e1j2)],
                    equipo2: [parseInt(e2j1), parseInt(e2j2)],
                    puntos1: parseInt(p1), puntos2: parseInt(p2), ganador
                });
                UI.mostrarNotificacion('Partida registrada');
                e.target.reset();
                await cargarDatos();
            } catch (err) {
                UI.mostrarNotificacion(err.message, 'error');
            }
        });

        // Filtros historial
        document.getElementById('filtro-tipo').addEventListener('change', cargarHistorial);
        document.getElementById('filtro-jugador').addEventListener('change', cargarHistorial);

        // Historial: eliminar partida o reproducir animación zapatero (delegación)
        document.getElementById('lista-historial').addEventListener('click', async (e) => {
            const btnEliminar = e.target.closest('[data-delete-partida]');
            if (btnEliminar) {
                if (!confirm('¿Eliminar esta partida?')) return;
                try {
                    await API.eliminarPartida(btnEliminar.dataset.deletePartida);
                    UI.mostrarNotificacion('Partida eliminada');
                    await cargarDatos();
                } catch (err) {
                    UI.mostrarNotificacion(err.message, 'error');
                }
                return;
            }

            // Tocar una partida zapatero → reproducir animación de burla
            const itemZapatero = e.target.closest('[data-zapatero="1"]');
            if (itemZapatero) {
                UI.animacionZapatero(itemZapatero.dataset.perdedor || '');
            }
        });

        // --- Eventos En Vivo ---
        document.getElementById('form-live-individual').addEventListener('submit', async (e) => {
            e.preventDefault();
            const j1El = document.getElementById('live-ind-j1');
            const j2El = document.getElementById('live-ind-j2');
            const j1 = j1El.value;
            const j2 = j2El.value;
            const meta = document.getElementById('live-meta').value;

            if (!j1 || !j2) { UI.mostrarNotificacion('Selecciona ambos jugadores', 'error'); return; }
            if (j1 === j2) { UI.mostrarNotificacion('Jugadores diferentes', 'error'); return; }

            const j1Nombre = j1El.selectedOptions[0].textContent;
            const j2Nombre = j2El.selectedOptions[0].textContent;
            await Live.iniciarIndividual(parseInt(j1), parseInt(j2), j1Nombre, j2Nombre, meta);
        });

        document.getElementById('form-live-parejas').addEventListener('submit', async (e) => {
            e.preventDefault();
            const e1j1El = document.getElementById('live-par-e1j1');
            const e1j2El = document.getElementById('live-par-e1j2');
            const e2j1El = document.getElementById('live-par-e2j1');
            const e2j2El = document.getElementById('live-par-e2j2');

            const ids = [e1j1El.value, e1j2El.value, e2j1El.value, e2j2El.value];
            if (ids.some(id => !id)) { UI.mostrarNotificacion('Selecciona todos los jugadores', 'error'); return; }
            if (new Set(ids).size !== 4) { UI.mostrarNotificacion('Jugadores diferentes', 'error'); return; }

            const meta = document.getElementById('live-meta-par').value;
            const e1Nombre = `${e1j1El.selectedOptions[0].textContent} & ${e1j2El.selectedOptions[0].textContent}`;
            const e2Nombre = `${e2j1El.selectedOptions[0].textContent} & ${e2j2El.selectedOptions[0].textContent}`;

            await Live.iniciarParejas(
                parseInt(ids[0]), parseInt(ids[1]), parseInt(ids[2]), parseInt(ids[3]),
                e1Nombre, e2Nombre, meta
            );
        });

        document.getElementById('btn-sumar-ronda').addEventListener('click', () => Live.sumarRonda());
        document.getElementById('btn-empate').addEventListener('click', () => Live.registrarEmpate());
        document.getElementById('btn-cancelar-vivo').addEventListener('click', () => Live.cancelar());
        document.getElementById('btn-guardar-vivo').addEventListener('click', async () => {
            await Live.guardarEnHistorial();
            await cargarDatos();
        });
        document.getElementById('btn-nueva-vivo').addEventListener('click', () => Live.nueva());

        // Deshacer ronda (delegación)
        document.getElementById('rounds-list').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-undo-ronda]');
            if (!btn) return;
            Live.deshacerRonda(parseInt(btn.dataset.undoRonda));
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();
