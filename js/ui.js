/**
 * Módulo UI - Renderizado de la interfaz
 */
const DominoUI = (() => {

    // --- Poblar Selects de jugadores ---
    function poblarSelects() {
        const jugadores = DominoData.obtenerJugadores();
        const selects = [
            'ind-jugador1', 'ind-jugador2',
            'par-equipo1-j1', 'par-equipo1-j2',
            'par-equipo2-j1', 'par-equipo2-j2',
            'filtro-jugador'
        ];

        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            const valorActual = select.value;

            if (id === 'filtro-jugador') {
                select.innerHTML = '<option value="todos">Todos los jugadores</option>';
            } else {
                select.innerHTML = '<option value="">Seleccionar jugador</option>';
            }

            jugadores.forEach(j => {
                const option = document.createElement('option');
                option.value = j.id;
                option.textContent = j.nombre;
                select.appendChild(option);
            });

            // Restaurar valor si sigue existiendo
            if (valorActual && select.querySelector(`option[value="${valorActual}"]`)) {
                select.value = valorActual;
            }
        });

        actualizarSelectGanadorIndividual();
    }

    function actualizarSelectGanadorIndividual() {
        const select = document.getElementById('ind-ganador');
        const j1Id = document.getElementById('ind-jugador1').value;
        const j2Id = document.getElementById('ind-jugador2').value;

        select.innerHTML = '<option value="">Seleccionar ganador</option>';

        if (j1Id) {
            const j1 = DominoData.obtenerJugadorPorId(j1Id);
            if (j1) {
                const opt = document.createElement('option');
                opt.value = j1.id;
                opt.textContent = j1.nombre;
                select.appendChild(opt);
            }
        }
        if (j2Id && j2Id !== j1Id) {
            const j2 = DominoData.obtenerJugadorPorId(j2Id);
            if (j2) {
                const opt = document.createElement('option');
                opt.value = j2.id;
                opt.textContent = j2.nombre;
                select.appendChild(opt);
            }
        }
    }

    // --- Renderizar lista de jugadores ---
    function renderizarJugadores() {
        const container = document.getElementById('lista-jugadores');
        const jugadores = DominoData.obtenerJugadores();

        if (jugadores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">👤</div>
                    <p>No hay jugadores registrados. Agrega el primero.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = jugadores.map(j => {
            const stats = DominoData.obtenerEstadisticasIndividual(j.id);
            return `
                <div class="lista-item">
                    <div>
                        <div class="nombre">${j.nombre}</div>
                        <div class="stats">${stats.totalPartidas} partidas | ${stats.ganadas}G - ${stats.perdidas}P | ${stats.porcentajeVictoria}% victoria</div>
                    </div>
                    <button class="btn-danger" onclick="DominoApp.eliminarJugador('${j.id}')">Eliminar</button>
                </div>
            `;
        }).join('');
    }

    // --- Renderizar historial ---
    function renderizarHistorial() {
        const container = document.getElementById('lista-historial');
        const filtroTipo = document.getElementById('filtro-tipo').value;
        const filtroJugador = document.getElementById('filtro-jugador').value;
        const partidas = DominoData.obtenerHistorial(filtroTipo, filtroJugador);

        if (partidas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <p>No hay partidas registradas con estos filtros.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = partidas.map(p => {
            const fecha = new Date(p.fecha).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            if (p.tipo === 'individual') {
                const j1 = DominoData.obtenerJugadorPorId(p.jugador1);
                const j2 = DominoData.obtenerJugadorPorId(p.jugador2);
                const ganador = DominoData.obtenerJugadorPorId(p.ganador);

                return `
                    <div class="historial-item">
                        <div class="fecha">${fecha}</div>
                        <div class="detalle">
                            <span class="tipo-badge">Individual</span>
                            <span class="jugadores">${j1 ? j1.nombre : '?'} (${p.puntos1}) vs ${j2 ? j2.nombre : '?'} (${p.puntos2})</span>
                            <span class="resultado ganador">🏆 ${ganador ? ganador.nombre : '?'}</span>
                        </div>
                        <button class="btn-danger" style="margin-top:0.5rem; font-size:0.75rem;" onclick="DominoApp.eliminarPartida('${p.id}')">Eliminar</button>
                    </div>
                `;
            } else {
                const e1j1 = DominoData.obtenerJugadorPorId(p.equipo1[0]);
                const e1j2 = DominoData.obtenerJugadorPorId(p.equipo1[1]);
                const e2j1 = DominoData.obtenerJugadorPorId(p.equipo2[0]);
                const e2j2 = DominoData.obtenerJugadorPorId(p.equipo2[1]);
                const equipoGanador = p.ganador === 'equipo1'
                    ? `${e1j1 ? e1j1.nombre : '?'} & ${e1j2 ? e1j2.nombre : '?'}`
                    : `${e2j1 ? e2j1.nombre : '?'} & ${e2j2 ? e2j2.nombre : '?'}`;

                return `
                    <div class="historial-item">
                        <div class="fecha">${fecha}</div>
                        <div class="detalle">
                            <span class="tipo-badge">Parejas</span>
                            <span class="jugadores">
                                ${e1j1 ? e1j1.nombre : '?'} & ${e1j2 ? e1j2.nombre : '?'} (${p.puntos1})
                                vs
                                ${e2j1 ? e2j1.nombre : '?'} & ${e2j2 ? e2j2.nombre : '?'} (${p.puntos2})
                            </span>
                            <span class="resultado ganador">🏆 ${equipoGanador}</span>
                        </div>
                        <button class="btn-danger" style="margin-top:0.5rem; font-size:0.75rem;" onclick="DominoApp.eliminarPartida('${p.id}')">Eliminar</button>
                    </div>
                `;
            }
        }).join('');
    }

    // --- Renderizar Ranking Individual ---
    function renderizarRankingIndividual() {
        const tbody = document.getElementById('tbody-ranking-individual');
        const ranking = DominoData.obtenerRankingIndividual();

        if (ranking.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align:center; padding:2rem; color: #757575;">
                    No hay datos de ranking aún.
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = ranking.map((j, i) => {
            const posClass = i < 3 ? `posicion-${i + 1}` : '';
            const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            return `
                <tr class="${posClass}">
                    <td>${medalla}</td>
                    <td>${j.nombre}</td>
                    <td>${j.totalPartidas}</td>
                    <td>${j.ganadas}</td>
                    <td>${j.perdidas}</td>
                    <td>${j.porcentajeVictoria}%</td>
                    <td>${j.puntosAFavor}</td>
                </tr>
            `;
        }).join('');
    }

    // --- Renderizar Ranking Parejas ---
    function renderizarRankingParejas() {
        const tbody = document.getElementById('tbody-ranking-parejas');
        const ranking = DominoData.obtenerRankingParejas();

        if (ranking.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align:center; padding:2rem; color: #757575;">
                    No hay datos de ranking por parejas aún.
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = ranking.map((p, i) => {
            const posClass = i < 3 ? `posicion-${i + 1}` : '';
            const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            const j1 = DominoData.obtenerJugadorPorId(p.jugadores[0]);
            const j2 = DominoData.obtenerJugadorPorId(p.jugadores[1]);
            const nombres = `${j1 ? j1.nombre : '?'} & ${j2 ? j2.nombre : '?'}`;

            return `
                <tr class="${posClass}">
                    <td>${medalla}</td>
                    <td>${nombres}</td>
                    <td>${p.totalPartidas}</td>
                    <td>${p.ganadas}</td>
                    <td>${p.perdidas}</td>
                    <td>${p.porcentajeVictoria}%</td>
                    <td>${p.puntosAFavor}</td>
                </tr>
            `;
        }).join('');
    }

    // --- Mostrar notificación ---
    function mostrarNotificacion(mensaje, tipo = 'success') {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed; top: 1rem; right: 1rem; z-index: 9999;
            background: ${tipo === 'success' ? '#2e7d32' : tipo === 'error' ? '#c62828' : '#f57c00'};
            color: white; padding: 0.8rem 1.5rem; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        notif.textContent = mensaje;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transition = 'opacity 0.3s';
            setTimeout(() => notif.remove(), 300);
        }, 2500);
    }

    return {
        poblarSelects,
        actualizarSelectGanadorIndividual,
        renderizarJugadores,
        renderizarHistorial,
        renderizarRankingIndividual,
        renderizarRankingParejas,
        mostrarNotificacion
    };
})();
