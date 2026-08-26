/**
 * Módulo principal - Controlador de la aplicación
 */
const DominoApp = (() => {

    function init() {
        setupNavegacion();
        setupTabs();
        setupFormularios();
        setupFormulariosVivo();
        setupFiltros();
        refrescarTodo();

        // Recuperar partida en vivo si existe
        DominoLive.recuperarPartida();
    }

    function refrescarTodo() {
        DominoUI.poblarSelects();
        poblarSelectsVivo();
        DominoUI.renderizarJugadores();
        DominoUI.renderizarHistorial();
        DominoUI.renderizarRankingIndividual();
        DominoUI.renderizarRankingParejas();
    }

    // --- Poblar selects de la sección en vivo ---
    function poblarSelectsVivo() {
        const jugadores = DominoData.obtenerJugadores();
        const selects = [
            'live-ind-j1', 'live-ind-j2',
            'live-par-e1j1', 'live-par-e1j2',
            'live-par-e2j1', 'live-par-e2j2'
        ];

        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const valorActual = select.value;
            select.innerHTML = '<option value="">Seleccionar jugador</option>';
            jugadores.forEach(j => {
                const option = document.createElement('option');
                option.value = j.id;
                option.textContent = j.nombre;
                select.appendChild(option);
            });
            if (valorActual && select.querySelector(`option[value="${valorActual}"]`)) {
                select.value = valorActual;
            }
        });
    }

    // --- Navegación principal ---
    function setupNavegacion() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

                btn.classList.add('active');
                const sectionId = btn.dataset.section;
                document.getElementById(sectionId).classList.add('active');

                // Refrescar datos al cambiar de sección
                refrescarTodo();
            });
        });
    }

    // --- Tabs (Individual/Parejas) ---
    function setupTabs() {
        document.querySelectorAll('.tabs').forEach(tabGroup => {
            tabGroup.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const parent = btn.closest('section');

                    // Tabs en Nueva Partida
                    if (parent.id === 'nueva-partida') {
                        tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        const tab = btn.dataset.tab;
                        document.getElementById('form-partida-individual').style.display = tab === 'individual' ? 'block' : 'none';
                        document.getElementById('form-partida-parejas').style.display = tab === 'parejas' ? 'block' : 'none';
                    }

                    // Tabs en Ranking
                    if (parent.id === 'ranking') {
                        tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        const tab = btn.dataset.tab;
                        document.getElementById('ranking-individual').style.display = tab === 'ranking-individual' ? 'block' : 'none';
                        document.getElementById('ranking-parejas').style.display = tab === 'ranking-parejas' ? 'block' : 'none';
                    }

                    // Tabs en En Vivo
                    if (parent.id === 'en-vivo') {
                        tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        const tab = btn.dataset.tab;
                        document.getElementById('form-live-individual').style.display = tab === 'live-individual' ? 'block' : 'none';
                        document.getElementById('form-live-parejas').style.display = tab === 'live-parejas' ? 'block' : 'none';
                    }
                });
            });
        });
    }

    // --- Formularios ---
    function setupFormularios() {
        // Agregar jugador
        document.getElementById('form-jugador').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('nombre-jugador');
            const nombre = input.value.trim();

            if (!nombre) return;

            const jugador = DominoData.agregarJugador(nombre);
            if (jugador) {
                DominoUI.mostrarNotificacion(`Jugador "${nombre}" agregado`);
                input.value = '';
                refrescarTodo();
            } else {
                DominoUI.mostrarNotificacion('Ese jugador ya existe', 'error');
            }
        });

        // Actualizar ganador cuando se seleccionan jugadores individuales
        document.getElementById('ind-jugador1').addEventListener('change', DominoUI.actualizarSelectGanadorIndividual);
        document.getElementById('ind-jugador2').addEventListener('change', DominoUI.actualizarSelectGanadorIndividual);

        // Partida individual
        document.getElementById('form-partida-individual').addEventListener('submit', (e) => {
            e.preventDefault();
            const j1 = document.getElementById('ind-jugador1').value;
            const j2 = document.getElementById('ind-jugador2').value;
            const p1 = document.getElementById('ind-puntos1').value;
            const p2 = document.getElementById('ind-puntos2').value;
            const ganador = document.getElementById('ind-ganador').value;

            if (!j1 || !j2 || !p1 || !p2 || !ganador) {
                DominoUI.mostrarNotificacion('Completa todos los campos', 'error');
                return;
            }

            if (j1 === j2) {
                DominoUI.mostrarNotificacion('Selecciona jugadores diferentes', 'error');
                return;
            }

            DominoData.registrarPartidaIndividual({
                jugador1Id: j1,
                jugador2Id: j2,
                puntos1: p1,
                puntos2: p2,
                ganadorId: ganador
            });

            DominoUI.mostrarNotificacion('Partida individual registrada');
            e.target.reset();
            refrescarTodo();
        });

        // Partida en parejas
        document.getElementById('form-partida-parejas').addEventListener('submit', (e) => {
            e.preventDefault();
            const e1j1 = document.getElementById('par-equipo1-j1').value;
            const e1j2 = document.getElementById('par-equipo1-j2').value;
            const e2j1 = document.getElementById('par-equipo2-j1').value;
            const e2j2 = document.getElementById('par-equipo2-j2').value;
            const p1 = document.getElementById('par-puntos1').value;
            const p2 = document.getElementById('par-puntos2').value;
            const ganador = document.getElementById('par-ganador').value;

            if (!e1j1 || !e1j2 || !e2j1 || !e2j2 || !p1 || !p2 || !ganador) {
                DominoUI.mostrarNotificacion('Completa todos los campos', 'error');
                return;
            }

            const todosJugadores = [e1j1, e1j2, e2j1, e2j2];
            const unicos = new Set(todosJugadores);
            if (unicos.size !== 4) {
                DominoUI.mostrarNotificacion('Cada jugador debe ser diferente', 'error');
                return;
            }

            DominoData.registrarPartidaParejas({
                equipo1: [e1j1, e1j2],
                equipo2: [e2j1, e2j2],
                puntos1: p1,
                puntos2: p2,
                ganador: ganador
            });

            DominoUI.mostrarNotificacion('Partida en parejas registrada');
            e.target.reset();
            refrescarTodo();
        });
    }

    // --- Formularios En Vivo ---
    function setupFormulariosVivo() {
        // Partida individual en vivo
        document.getElementById('form-live-individual').addEventListener('submit', (e) => {
            e.preventDefault();
            const j1 = document.getElementById('live-ind-j1').value;
            const j2 = document.getElementById('live-ind-j2').value;
            const meta = document.getElementById('live-meta').value;

            if (!j1 || !j2) {
                DominoUI.mostrarNotificacion('Selecciona ambos jugadores', 'error');
                return;
            }
            if (j1 === j2) {
                DominoUI.mostrarNotificacion('Selecciona jugadores diferentes', 'error');
                return;
            }
            if (!meta || meta < 1) {
                DominoUI.mostrarNotificacion('La meta debe ser al menos 1', 'error');
                return;
            }

            DominoLive.iniciarIndividual(j1, j2, meta);
        });

        // Partida parejas en vivo
        document.getElementById('form-live-parejas').addEventListener('submit', (e) => {
            e.preventDefault();
            const e1j1 = document.getElementById('live-par-e1j1').value;
            const e1j2 = document.getElementById('live-par-e1j2').value;
            const e2j1 = document.getElementById('live-par-e2j1').value;
            const e2j2 = document.getElementById('live-par-e2j2').value;
            const meta = document.getElementById('live-meta-par').value;

            if (!e1j1 || !e1j2 || !e2j1 || !e2j2) {
                DominoUI.mostrarNotificacion('Selecciona todos los jugadores', 'error');
                return;
            }

            const todos = [e1j1, e1j2, e2j1, e2j2];
            if (new Set(todos).size !== 4) {
                DominoUI.mostrarNotificacion('Cada jugador debe ser diferente', 'error');
                return;
            }

            if (!meta || meta < 1) {
                DominoUI.mostrarNotificacion('La meta debe ser al menos 1', 'error');
                return;
            }

            DominoLive.iniciarParejas(e1j1, e1j2, e2j1, e2j2, meta);
        });
    }

    // --- Filtros historial ---
    function setupFiltros() {
        document.getElementById('filtro-tipo').addEventListener('change', () => {
            DominoUI.renderizarHistorial();
        });
        document.getElementById('filtro-jugador').addEventListener('change', () => {
            DominoUI.renderizarHistorial();
        });
    }

    // --- Acciones públicas ---
    function eliminarJugador(id) {
        const jugador = DominoData.obtenerJugadorPorId(id);
        if (confirm(`¿Eliminar a "${jugador ? jugador.nombre : ''}"? Se mantendrán las partidas existentes.`)) {
            DominoData.eliminarJugador(id);
            DominoUI.mostrarNotificacion('Jugador eliminado');
            refrescarTodo();
        }
    }

    function eliminarPartida(id) {
        if (confirm('¿Eliminar esta partida?')) {
            DominoData.eliminarPartida(id);
            DominoUI.mostrarNotificacion('Partida eliminada');
            refrescarTodo();
        }
    }

    // --- Acciones En Vivo (expuestas para onclick) ---
    function sumarRonda() {
        DominoLive.sumarRonda();
    }

    function deshacerRonda(index) {
        DominoLive.deshacerRonda(index);
    }

    function cancelarPartidaVivo() {
        DominoLive.cancelar();
    }

    function guardarPartidaVivo() {
        DominoLive.guardarEnHistorial();
        refrescarTodo();
    }

    function nuevaPartidaVivo() {
        DominoLive.nueva();
    }

    // Iniciar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', init);

    return {
        eliminarJugador,
        eliminarPartida,
        sumarRonda,
        deshacerRonda,
        cancelarPartidaVivo,
        guardarPartidaVivo,
        nuevaPartidaVivo
    };
})();
