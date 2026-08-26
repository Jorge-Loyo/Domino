/**
 * Módulo UI - Renderizado
 */
const UI = (() => {

    function mostrarNotificacion(mensaje, tipo = 'success') {
        const notif = document.createElement('div');
        notif.className = `notification ${tipo}`;
        notif.textContent = mensaje;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 2500);
    }

    function poblarSelects(jugadores) {
        const selects = [
            'ind-jugador1', 'ind-jugador2',
            'par-equipo1-j1', 'par-equipo1-j2',
            'par-equipo2-j1', 'par-equipo2-j2',
            'live-ind-j1', 'live-ind-j2',
            'live-par-e1j1', 'live-par-e1j2',
            'live-par-e2j1', 'live-par-e2j2',
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
                const opt = document.createElement('option');
                opt.value = j.id;
                opt.textContent = j.nombre;
                select.appendChild(opt);
            });

            if (valorActual && select.querySelector(`option[value="${valorActual}"]`)) {
                select.value = valorActual;
            }
        });

        actualizarSelectGanador();
    }

    function actualizarSelectGanador() {
        const select = document.getElementById('ind-ganador');
        const j1Id = document.getElementById('ind-jugador1').value;
        const j2Id = document.getElementById('ind-jugador2').value;
        select.innerHTML = '<option value="">Seleccionar ganador</option>';

        const j1Opt = document.getElementById('ind-jugador1').selectedOptions[0];
        const j2Opt = document.getElementById('ind-jugador2').selectedOptions[0];

        if (j1Id && j1Opt) {
            const opt = document.createElement('option');
            opt.value = j1Id;
            opt.textContent = j1Opt.textContent;
            select.appendChild(opt);
        }
        if (j2Id && j2Id !== j1Id && j2Opt) {
            const opt = document.createElement('option');
            opt.value = j2Id;
            opt.textContent = j2Opt.textContent;
            select.appendChild(opt);
        }
    }

    function renderizarJugadores(jugadores, stats) {
        const container = document.getElementById('lista-jugadores');

        if (jugadores.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">👤</div><p>No hay jugadores. Agrega el primero.</p></div>`;
            return;
        }

        container.innerHTML = jugadores.map(j => {
            const s = stats.find(st => st.id === j.id) || { total_partidas: 0, ganadas: 0, perdidas: 0, porcentaje_victoria: 0 };
            return `
                <div class="lista-item">
                    <div>
                        <div class="nombre">${j.nombre}</div>
                        <div class="stats">${s.total_partidas} partidas | ${s.ganadas}G - ${s.perdidas}P | ${s.porcentaje_victoria}%</div>
                    </div>
                    <button class="btn-danger" data-delete-jugador="${j.id}">Eliminar</button>
                </div>
            `;
        }).join('');
    }

    function renderizarHistorial(partidas) {
        const container = document.getElementById('lista-historial');

        if (partidas.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>No hay partidas con estos filtros.</p></div>`;
            return;
        }

        container.innerHTML = partidas.map(p => {
            const fecha = new Date(p.created_at).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const e1Nombres = p.equipo1.map(j => j.nombre).join(' & ');
            const e2Nombres = p.equipo2.map(j => j.nombre).join(' & ');
            const ganadorNombres = p.ganador === 'equipo1' ? e1Nombres : e2Nombres;
            const tipoBadge = p.tipo === 'individual' ? 'Individual' : 'Parejas';

            return `
                <div class="historial-item">
                    <div class="fecha">${fecha}</div>
                    <div class="detalle">
                        <span class="tipo-badge">${tipoBadge}</span>
                        <span class="jugadores">${e1Nombres} (${p.puntos1}) vs ${e2Nombres} (${p.puntos2})</span>
                        <span class="resultado ganador">🏆 ${ganadorNombres}</span>
                    </div>
                    <button class="btn-danger" style="margin-top:0.5rem; font-size:0.72rem;" data-delete-partida="${p.id}">Eliminar</button>
                </div>
            `;
        }).join('');
    }

    function renderizarRankingIndividual(ranking) {
        const tbody = document.getElementById('tbody-ranking-individual');

        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#757575;">Sin datos aún</td></tr>';
            return;
        }

        tbody.innerHTML = ranking.map((j, i) => {
            const posClass = i < 3 ? `posicion-${i + 1}` : '';
            const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            return `
                <tr class="${posClass}">
                    <td>${medalla}</td>
                    <td>${j.nombre}</td>
                    <td>${j.total_partidas}</td>
                    <td>${j.ganadas}</td>
                    <td>${j.perdidas}</td>
                    <td>${j.porcentaje_victoria}%</td>
                    <td>${j.puntos_favor}</td>
                </tr>
            `;
        }).join('');
    }

    function renderizarRankingParejas(ranking) {
        const tbody = document.getElementById('tbody-ranking-parejas');

        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#757575;">Sin datos aún</td></tr>';
            return;
        }

        tbody.innerHTML = ranking.map((p, i) => {
            const posClass = i < 3 ? `posicion-${i + 1}` : '';
            const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            return `
                <tr class="${posClass}">
                    <td>${medalla}</td>
                    <td>${p.jugadores.join(' & ')}</td>
                    <td>${p.total_partidas}</td>
                    <td>${p.ganadas}</td>
                    <td>${p.perdidas}</td>
                    <td>${p.porcentaje_victoria}%</td>
                    <td>${p.puntos_favor}</td>
                </tr>
            `;
        }).join('');
    }

    return {
        mostrarNotificacion,
        poblarSelects,
        actualizarSelectGanador,
        renderizarJugadores,
        renderizarHistorial,
        renderizarRankingIndividual,
        renderizarRankingParejas
    };
})();
