/**
 * Servidor local para probar la PWA.
 * Ejecutar: node server.js
 * Luego abrir: http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // SPA fallback
                fs.readFile(path.join(__dirname, 'index.html'), (err2, content2) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content2);
                });
            } else {
                res.writeHead(500);
                res.end('Error del servidor');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🁣 Domino Tracker - PWA Server`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`\n   Para instalar en móvil:`);
    console.log(`   1. Conecta tu móvil a la misma red WiFi`);
    console.log(`   2. Busca la IP de tu PC (ipconfig)`);
    console.log(`   3. Abre http://TU-IP:${PORT} en el navegador del móvil`);
    console.log(`   4. Android: Chrome mostrará "Instalar app"`);
    console.log(`   5. iPhone: Safari > Compartir > Agregar a pantalla de inicio`);
    console.log(`\n   Ctrl+C para detener\n`);
});
