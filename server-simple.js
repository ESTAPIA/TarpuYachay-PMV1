const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 3000;

// MIME types para archivos
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    const parsedUrl = url.parse(req.url);
    let pathname = `.${parsedUrl.pathname}`;
    
    // Si es raíz, servir index.html
    if (pathname === './') {
        pathname = './index.html';
    }
    
    const ext = path.parse(pathname).ext;
    
    fs.readFile(pathname, (err, data) => {
        if (err) {
            res.statusCode = 404;
            res.end(`Archivo no encontrado: ${pathname}`);
        } else {
            res.setHeader('Content-type', mimeTypes[ext] || 'text/plain');
            res.end(data);
        }
    });
});

server.listen(port, () => {
    console.log('🌱 TARPU YACHAY SERVER (SIN EXPRESS)');
    console.log('');
    console.log('📱 En tu computadora:');
    console.log(`   http://localhost:${port}`);
    console.log('');
    console.log('📱 En tu teléfono:');
    
    // Detectar IP de red
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`   http://${net.address}:${port}`);
            }
        }
    }
    
    console.log('');
    console.log('✅ Servidor listo para testing!');
});
