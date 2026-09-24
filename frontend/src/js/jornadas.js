/**
 * Módulo Jornadas (frontend)
 * Renderiza la lista de jornadas con su campeón y el detalle de cada una.
 */
const Jornadas = (() => {

    function formatearFecha(fechaStr) {
        // fechaStr = 'YYYY-MM-DD'
        const [y, m, d] = fechaStr.split('-');
        const fecha = new Date(Number(y), Number(m) - 1, Number(d));
        return fecha.toLocaleDateString('es-ES', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });
    }

    async function cargar() {
        const container = document.getElementById('lista-jornadas');
        if (!container) return;

        try {
            const data = await API.obtenerJornadas();
            renderizarLista(data.jornadas, data.jornada_actual);
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${err.message}</p></div>`;
        }
    }

    function renderizarLista(jornadas, jornadaActual) {
        const container = document.getElementById('lista-jornadas');

        if (!jornadas || jornadas.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">📅</div><p>Aún no hay jornadas registradas.</p></div>`;
            return;
        }

        container.innerHTML = jornadas.map(j => {
            const enCurso = !j.cerrada;
            const ci = j.campeon_individual;
            const cp = j.campeon_parejas;

            const estado = enCurso
                ? `<span class="jornada-estado en-curso">🔴 En curso</span>`
                : `<span class="jornada-estado cerrada">✅ Oficial</span>`;

            const campeonInd = ci
                ? `<div class="jornada-campeon"><span class="jc-label">👤 ${enCurso ? 'Va ganando' : 'Campeón'}:</span> <strong>${ci.nombre}</strong> <span class="jc-detalle">${ci.ganadas}W</span></div>`
                : '';
            const campeonPar = cp
                ? `<div class="jornada-campeon"><span class="jc-label">👥 ${enCurso ? 'Va ganando' : 'Campeón'}:</span> <strong>${cp.jugadores.join(' & ')}</strong> <span class="jc-detalle">${cp.ganadas}W</span></div>`
                : '';

            return `
                <div class="jornada-item ${enCurso ? 'en-curso' : ''}" data-fecha="${j.fecha}">
                    <div class="jornada-head">
                        <span class="jornada-fecha">${formatearFecha(j.fecha)}</span>
                        ${estado}
                    </div>
                    <div class="jornada-body">
                        ${campeonInd}
                        ${campeonPar}
                        <div class="jornada-meta">${j.total_partidas} partida${j.total_partidas !== 1 ? 's' : ''} · Toca para ver el detalle</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function verDetalle(fecha) {
        try {
            const data = await API.obtenerJornada(fecha);
            document.getElementById('jornada-detalle-titulo').textContent =
                `${formatearFecha(fecha)}${data.cerrada ? '' : ' (en curso)'}`;

            renderizarRankingDetalle('jd-individual', data.ranking_jugadores, false, data.cerrada);
            renderizarRankingDetalle('jd-parejas', data.ranking_parejas, true, data.cerrada);

            // Reset tabs: abrir en Parejas por defecto (índice 1)
            document.querySelectorAll('#jornada-detalle .tab-btn').forEach((b, i) => {
                b.classList.toggle('active', i === 1);
            });
            document.getElementById('jd-individual').style.display = 'none';
            document.getElementById('jd-parejas').style.display = 'block';

            document.getElementById('jornada-detalle').style.display = 'flex';
        } catch (err) {
            UI.mostrarNotificacion(err.message, 'error');
        }
    }

    function renderizarRankingDetalle(elId, ranking, esPareja, cerrada) {
        const el = document.getElementById(elId);
        if (!ranking || ranking.length === 0) {
            el.innerHTML = `<p style="text-align:center; color:#757575; padding:1rem;">Sin datos</p>`;
            return;
        }

        el.innerHTML = `
            <table class="jornada-tabla">
                <thead>
                    <tr><th>#</th><th>${esPareja ? 'Pareja' : 'Jugador'}</th><th>G</th><th>Dif</th></tr>
                </thead>
                <tbody>
                    ${ranking.map((r, i) => {
                        const nombre = esPareja ? r.jugadores.join(' & ') : r.nombre;
                        const esCampeon = i === 0;
                        const corona = esCampeon ? (cerrada ? '👑 ' : '🔥 ') : '';
                        return `
                            <tr class="${esCampeon ? 'campeon-row' : ''}">
                                <td>${i + 1}</td>
                                <td>${corona}${nombre}</td>
                                <td>${r.ganadas}</td>
                                <td>${r.difPuntos > 0 ? '+' : ''}${r.difPuntos}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    function cerrarDetalle() {
        document.getElementById('jornada-detalle').style.display = 'none';
    }

    function init() {
        // Click en una jornada → ver detalle
        const lista = document.getElementById('lista-jornadas');
        if (lista) {
            lista.addEventListener('click', (e) => {
                const item = e.target.closest('.jornada-item');
                if (item) verDetalle(item.dataset.fecha);
            });
        }

        // Cerrar detalle
        const btnClose = document.getElementById('jornada-close');
        if (btnClose) btnClose.addEventListener('click', cerrarDetalle);

        const detalle = document.getElementById('jornada-detalle');
        if (detalle) {
            detalle.addEventListener('click', (e) => {
                if (e.target === detalle) cerrarDetalle();
            });
        }

        // Tabs del detalle
        document.querySelectorAll('#jornada-detalle .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#jornada-detalle .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.jtab;
                document.getElementById('jd-individual').style.display = tab === 'jd-individual' ? 'block' : 'none';
                document.getElementById('jd-parejas').style.display = tab === 'jd-parejas' ? 'block' : 'none';
            });
        });
    }

    return { init, cargar };
})();
