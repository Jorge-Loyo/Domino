/**
 * Módulo de instalación PWA
 * - Detecta si la app ya está instalada (no muestra el banner)
 * - Android/Chrome: usa beforeinstallprompt para instalación con 1 toque
 * - iOS/Safari: muestra instrucciones manuales (Compartir → Agregar a inicio)
 * - Recuerda si el usuario lo descartó
 */
const PWAInstall = (() => {
    let deferredPrompt = null;
    const DISMISS_KEY = 'pwa_install_dismissed';
    const DISMISS_DIAS = 7; // volver a preguntar después de 7 días

    // --- Detección de estado ---
    function estaInstalada() {
        // Modo standalone (instalada en Android/desktop)
        const standalone = window.matchMedia('(display-mode: standalone)').matches;
        // iOS Safari
        const iosStandalone = window.navigator.standalone === true;
        return standalone || iosStandalone;
    }

    function esIOS() {
        return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
    }

    function esSafari() {
        const ua = window.navigator.userAgent;
        return /safari/i.test(ua) && !/crios|fxios|chrome|android/i.test(ua);
    }

    function fueDescartadoRecientemente() {
        const ts = localStorage.getItem(DISMISS_KEY);
        if (!ts) return false;
        const dias = (Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24);
        return dias < DISMISS_DIAS;
    }

    // --- Banner Android/Chrome (instalación directa) ---
    function mostrarBannerInstalar() {
        if (document.getElementById('install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'install-banner';
        banner.innerHTML = `
            <div class="install-banner">
                <div class="install-banner-text">
                    <img src="icons/logo.png" alt="" class="install-banner-logo">
                    <span>Instala <strong>Búfalos Mojados</strong> en tu dispositivo</span>
                </div>
                <div class="install-banner-actions">
                    <button class="btn-install" id="pwa-btn-install">Instalar</button>
                    <button class="btn-dismiss" id="pwa-btn-dismiss">Luego</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('pwa-btn-install').addEventListener('click', instalar);
        document.getElementById('pwa-btn-dismiss').addEventListener('click', descartar);
    }

    // --- Banner iOS (instrucciones manuales) ---
    function mostrarBannerIOS() {
        if (document.getElementById('install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'install-banner';
        banner.innerHTML = `
            <div class="install-banner ios">
                <button class="ios-close" id="pwa-btn-dismiss">✕</button>
                <div class="install-banner-text">
                    <img src="icons/logo.png" alt="" class="install-banner-logo">
                    <span>Instala <strong>Búfalos Mojados</strong>:
                        toca <span class="ios-share">⬆️</span> y luego
                        <strong>"Agregar a inicio"</strong>
                    </span>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        document.getElementById('pwa-btn-dismiss').addEventListener('click', descartar);
    }

    async function instalar() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        ocultarBanner();
        if (outcome === 'dismissed') {
            marcarDescartado();
        }
    }

    function descartar() {
        marcarDescartado();
        ocultarBanner();
    }

    function marcarDescartado() {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }

    function ocultarBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 300);
        }
    }

    // --- Init ---
    function init() {
        // Ya instalada → nunca mostrar
        if (estaInstalada()) return;

        // Descartada hace poco → no molestar
        if (fueDescartadoRecientemente()) return;

        // Android/Chrome/Edge → esperar el evento nativo
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            mostrarBannerInstalar();
        });

        // iOS Safari → mostrar instrucciones (no hay evento nativo)
        if (esIOS() && esSafari()) {
            // Pequeño retraso para no ser intrusivo al cargar
            setTimeout(mostrarBannerIOS, 1500);
        }

        // Cuando se instala, ocultar y no volver a preguntar
        window.addEventListener('appinstalled', () => {
            ocultarBanner();
            localStorage.removeItem(DISMISS_KEY);
        });
    }

    return { init };
})();

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', PWAInstall.init);
} else {
    PWAInstall.init();
}
