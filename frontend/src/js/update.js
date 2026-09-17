/**
 * Detección y aplicación de actualizaciones de la PWA.
 *
 * Cómo funciona:
 * 1. Registra el service worker.
 * 2. Cuando hay un SW nuevo "en espera" (waiting), muestra un banner
 *    "Nueva versión disponible - Actualizar".
 * 3. Al tocar "Actualizar", le dice al SW nuevo que se active (SKIP_WAITING)
 *    y recarga la página con la versión nueva.
 * 4. Revisa periódicamente si hay actualizaciones (cada 60s y al volver a la app).
 */
const PWAUpdate = (() => {
    let refreshing = false;

    function mostrarBannerActualizar(worker) {
        if (document.getElementById('update-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'update-banner';
        banner.innerHTML = `
            <div class="update-banner">
                <span>✨ Nueva versión disponible</span>
                <button class="btn-update" id="pwa-btn-update">Actualizar</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('pwa-btn-update').addEventListener('click', () => {
            // Pedir al SW en espera que tome el control
            worker.postMessage({ type: 'SKIP_WAITING' });
        });
    }

    function escucharWorker(reg) {
        // Si ya hay uno esperando al cargar
        if (reg.waiting && navigator.serviceWorker.controller) {
            mostrarBannerActualizar(reg.waiting);
        }

        // Cuando aparece un SW nuevo instalándose
        reg.addEventListener('updatefound', () => {
            const nuevo = reg.installing;
            if (!nuevo) return;
            nuevo.addEventListener('statechange', () => {
                // Instalado y hay un controller → es una actualización (no la 1ra instalación)
                if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
                    mostrarBannerActualizar(nuevo);
                }
            });
        });
    }

    function init() {
        if (!('serviceWorker' in navigator)) return;

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    escucharWorker(reg);

                    // Revisar actualizaciones periódicamente
                    setInterval(() => reg.update(), 60 * 1000);

                    // Revisar cuando el usuario vuelve a la app
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') reg.update();
                    });
                })
                .catch(err => console.log('SW error:', err));
        });

        // Cuando el SW nuevo toma control, recargar una sola vez
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    }

    return { init };
})();

PWAUpdate.init();
