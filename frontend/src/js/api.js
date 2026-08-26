/**
 * Módulo API - Comunicación con el backend
 */
const API = (() => {
    // En producción cambiar a la URL de Render
    const BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : 'https://bufalos-mojados-api.onrender.com/api'; // Cambiar por tu URL de Render

    function getToken() {
        return localStorage.getItem('token');
    }

    async function request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const token = getToken();

        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            headers,
            ...options,
            headers: { ...headers, ...(options.headers || {}) }
        };

        try {
            showLoading(true);
            const response = await fetch(url, config);
            const data = await response.json();

            if (response.status === 401) {
                // Token expirado o inválido → cerrar sesión
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = 'login.html';
                throw new Error('Sesión expirada');
            }

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }

            return data;
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                throw new Error('Sin conexión al servidor');
            }
            throw err;
        } finally {
            showLoading(false);
        }
    }

    // Request sin redirect en 401 (para login/registro)
    async function requestPublic(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }

            return data;
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                throw new Error('Sin conexión al servidor');
            }
            throw err;
        }
    }

    function showLoading(show) {
        const el = document.getElementById('loading');
        if (el) el.style.display = show ? 'flex' : 'none';
    }

    // --- Auth ---
    function login(email, password) {
        return requestPublic('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    function registro(nombre, email, password) {
        return requestPublic('/auth/registro', {
            method: 'POST',
            body: JSON.stringify({ nombre, email, password })
        });
    }

    function obtenerUsuario() {
        return request('/auth/me');
    }

    function cerrarSesion() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }

    // --- Jugadores ---
    function obtenerJugadores() {
        return request('/jugadores');
    }

    function agregarJugador(nombre) {
        return request('/jugadores', {
            method: 'POST',
            body: JSON.stringify({ nombre })
        });
    }

    function eliminarJugador(id) {
        return request(`/jugadores/${id}`, { method: 'DELETE' });
    }

    // --- Partidas ---
    function obtenerPartidas(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.tipo && filtros.tipo !== 'todas') params.set('tipo', filtros.tipo);
        if (filtros.jugador_id && filtros.jugador_id !== 'todos') params.set('jugador_id', filtros.jugador_id);
        const qs = params.toString();
        return request(`/partidas${qs ? '?' + qs : ''}`);
    }

    function registrarPartidaIndividual(datos) {
        return request('/partidas/individual', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    }

    function registrarPartidaParejas(datos) {
        return request('/partidas/parejas', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    }

    function eliminarPartida(id) {
        return request(`/partidas/${id}`, { method: 'DELETE' });
    }

    // --- Ranking ---
    function obtenerRankingIndividual() {
        return request('/ranking/individual');
    }

    function obtenerRankingParejas() {
        return request('/ranking/parejas');
    }

    // --- Partida en vivo ---
    function obtenerPartidaVivo() {
        return request('/vivo');
    }

    function iniciarPartidaVivo(datos) {
        return request('/vivo/iniciar', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    }

    function sumarRondaVivo(id, puntos1, puntos2) {
        return request(`/vivo/${id}/ronda`, {
            method: 'POST',
            body: JSON.stringify({ puntos1, puntos2 })
        });
    }

    function deshacerRondaVivo(id, index) {
        return request(`/vivo/${id}/deshacer`, {
            method: 'POST',
            body: JSON.stringify({ index })
        });
    }

    function finalizarPartidaVivo(id) {
        return request(`/vivo/${id}/finalizar`, { method: 'POST' });
    }

    function cancelarPartidaVivo(id) {
        return request(`/vivo/${id}/cancelar`, { method: 'POST' });
    }

    return {
        login,
        registro,
        obtenerUsuario,
        cerrarSesion,
        getToken,
        obtenerJugadores,
        agregarJugador,
        eliminarJugador,
        obtenerPartidas,
        registrarPartidaIndividual,
        registrarPartidaParejas,
        eliminarPartida,
        obtenerRankingIndividual,
        obtenerRankingParejas,
        obtenerPartidaVivo,
        iniciarPartidaVivo,
        sumarRondaVivo,
        deshacerRondaVivo,
        finalizarPartidaVivo,
        cancelarPartidaVivo
    };
})();
