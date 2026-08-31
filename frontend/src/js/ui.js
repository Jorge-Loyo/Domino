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

    /**
     * Animación de "Zapatero": burla cuando un equipo gana y el otro
     * se queda en 0 puntos. Muestra zapatos volando y un mensaje.
     * @param {string} perdedor - Nombre del equipo/jugador humillado
     */
    function animacionZapatero(perdedor = '') {
        // Evitar duplicados
        const existente = document.getElementById('zapatero-overlay');
        if (existente) existente.remove();

        const overlay = document.createElement('div');
        overlay.id = 'zapatero-overlay';
        overlay.className = 'zapatero-overlay';

        // Mensaje central
        const mensaje = document.createElement('div');
        mensaje.className = 'zapatero-mensaje';
        mensaje.innerHTML = `
            <div class="zapatero-shoe-big">👟</div>
            <h2>¡ZAPATERO!</h2>
            <p>${perdedor ? perdedor + ' se quedó en 0 🤣' : 'Se quedaron en 0 🤣'}</p>
        `;
        overlay.appendChild(mensaje);

        // Zapatos volando
        const emojis = ['👟', '👞', '🥾', '👢'];
        const cantidad = 14;
        for (let i = 0; i < cantidad; i++) {
            const shoe = document.createElement('span');
            shoe.className = 'zapatero-shoe';
            shoe.textContent = emojis[i % emojis.length];
            shoe.style.left = Math.random() * 100 + 'vw';
            shoe.style.animationDelay = (Math.random() * 0.8) + 's';
            shoe.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
            shoe.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
            overlay.appendChild(shoe);
        }

        document.body.appendChild(overlay);

        // Cerrar al tocar
        overlay.addEventListener('click', () => cerrarZapatero(overlay));

        // Auto cerrar
        setTimeout(() => cerrarZapatero(overlay), 4000);
    }

    function cerrarZapatero(overlay) {
        if (!overlay || !overlay.parentNode) return;
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 400);
    }

    /**
     * Determina si una partida fue zapatero (un equipo en 0)
     */
    function esZapatero(puntos1, puntos2) {
        const p1 = Number(puntos1);
        const p2 = Number(puntos2);
        return (p1 > 0 && p2 === 0) || (p2 > 0 && p1 === 0);
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
            const perdedorNombres = p.ganador === 'equipo1' ? e2Nombres : e1Nombres;
            const tipoBadge = p.tipo === 'individual' ? 'Individual' : 'Parejas';

            const zapatero = esZapatero(p.puntos1, p.puntos2);
            const zapateroBadge = zapatero
                ? `<span class="zapatero-badge">👟 Zapatero</span>`
                : '';
            const zapateroAttrs = zapatero
                ? `data-zapatero="1" data-perdedor="${perdedorNombres.replace(/"/g, '&quot;')}"`
                : '';

            return `
                <div class="historial-item ${zapatero ? 'es-zapatero' : ''}" ${zapateroAttrs}>
                    <div class="fecha">${fecha}</div>
                    <div class="detalle">
                        <span class="tipo-badge">${tipoBadge}</span>
                        ${zapateroBadge}
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
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:#757575;">Sin datos aún</td></tr>';
            return;
        }

        tbody.innerHTML = ranking.map((j, i) => {
            const posClass = i < 3 ? `posicion-${i + 1}` : '';
            const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            const zap = j.zapateros_dados || 0;
            const zapCell = zap > 0 ? `<span class="zap-count">👟 ${zap}</span>` : '0';
            return `
                <tr class="${posClass}">
                    <td>${medalla}</td>
                    <td>${j.nombre}</td>
                    <td>${j.total_partidas}</td>
                    <td>${j.ganadas}</td>
                    <td>${j.perdidas}</td>
                    <td>${zapCell}</td>
                    <td>${j.porcentaje_victoria}%</td>
                    <td>${j.puntos_favor}</td>
                </tr>
            `;
        }).join('');
    }

    function renderizarRankingParejas(ranking) {
        const tbody = document.getElementById('tbody-ranking-parejas');

        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:#757575;">Sin datos aún</td></tr>';
            return;
        }

        tbody.innerHTML = ranking.map((p, i) => {
            const posClass = i < 3 ? `posicion-${i + 1}` : '';
            const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            const zap = p.zapateros_dados || 0;
            const zapCell = zap > 0 ? `<span class="zap-count">👟 ${zap}</span>` : '0';
            return `
                <tr class="${posClass}">
                    <td>${medalla}</td>
                    <td>${p.jugadores.join(' & ')}</td>
                    <td>${p.total_partidas}</td>
                    <td>${p.ganadas}</td>
                    <td>${p.perdidas}</td>
                    <td>${zapCell}</td>
                    <td>${p.porcentaje_victoria}%</td>
                    <td>${p.puntos_favor}</td>
                </tr>
            `;
        }).join('');
    }

    return {
        mostrarNotificacion,
        animacionZapatero,
        esZapatero,
        poblarSelects,
        actualizarSelectGanador,
        renderizarJugadores,
        renderizarHistorial,
        renderizarRankingIndividual,
        renderizarRankingParejas
    };
})();
